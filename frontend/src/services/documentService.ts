import { mockDocuments } from '../data/mockData';
import { DocumentRecord } from '../types';
import { apiGet, apiPostForm } from './apiClient';

// Maps a backend statutory check into the DocumentRecord shape the UI expects
const CHECK_CATEGORY_MAP: Record<string, DocumentRecord['category']> = {
  gst: 'GST Certificate',
  pan: 'PAN',
  udyam: 'Udyam Certificate',
  blacklist: 'Debarment / Blacklist Declaration',
  epfo_esic: 'EPFO / ESIC',
};

const CHECK_LABEL_MAP: Record<string, string> = {
  gst: 'GST Registration Certificate',
  pan: 'PAN Card',
  udyam: 'Udyam Registration Certificate',
  blacklist: 'Debarment / Blacklist Declaration',
  epfo_esic: 'EPFO / ESIC Compliance Record',
};

// Certificate type -> DocumentRecord category, for the single-file
// upload+verify flow (uploadCertificateForVerification's response uses
// extracted.document_type: "gst" | "udyam" | "pan" | "epfo")
const DOCUMENT_TYPE_CATEGORY_MAP: Record<string, DocumentRecord['category']> = {
  gst: 'GST Certificate',
  udyam: 'Udyam Certificate',
  pan: 'PAN',
  epfo: 'EPFO / ESIC',
};

const DOCUMENT_TYPE_LABEL_MAP: Record<string, string> = {
  gst: 'GST Registration Certificate',
  udyam: 'Udyam Registration Certificate',
  pan: 'PAN Card',
  epfo: 'EPFO Compliance Certificate',
};

class DocumentService {
  private documents: DocumentRecord[] = [...mockDocuments];

  public getDocuments(bidderId: string): DocumentRecord[] {
    return this.documents.filter((d) => d.bidderId === bidderId);
  }

  public getDocumentById(id: string): DocumentRecord | undefined {
    return this.documents.find((d) => d.id === id);
  }

  public updateDocumentStatus(id: string, status: DocumentRecord['validationStatus']): void {
    const doc = this.documents.find((d) => d.id === id);
    if (doc) {
      doc.validationStatus = status;
    }
  }

  public simulateUpload(bidderId: string, file: File | { name: string; size: number }): DocumentRecord {
    const newDoc: DocumentRecord = {
      id: `DOC-${Date.now().toString().slice(-4)}`,
      bidderId,
      name: file.name,
      category: 'Other statutory documents' as any,
      uploadedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      ocrStatus: 'Complete',
      validationStatus: 'Valid',
      crossVerificationStatus: 'MATCH',
      riskLevel: 'LOW',
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      extractedData: {
        'Document Name': file.name,
        'Upload Timestamp': new Date().toISOString(),
        'Parsed Text Status': 'Readable / High OCR Quality',
      },
      validationChecks: [
        { check: 'Antivirus and digital signature check', status: 'PASS', note: 'Passed MD5 hash checksum' },
        { check: 'Textual layout analysis', status: 'PASS', note: 'No redactions or abnormal fonts detected' },
      ],
      integrityCheck: {
        status: 'CLEAR',
        confidence: 95,
      },
    };
    this.documents.unshift(newDoc);
    return newDoc;
  }

  public async uploadCertificateForVerification(
    bidderId: string,
    file: File
  ): Promise<{ bidder_id: string; extracted: any; verification: any; document_integrity?: any }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiPostForm(`/verify/${bidderId}/certificate`, formData);
  }

  public async uploadTenderDocument(file: File): Promise<{ extracted: any }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiPostForm('/tender/nit-extraction', formData);
  }

  /**
   * Real replacement for simulateUpload(): actually sends the file to
   * /verify/{bidderId}/certificate (pdfplumber + OCR + portal check +
   * document-integrity/forgery check), builds a DocumentRecord from the
   * REAL response, stores it, and returns it.
   *
   * Call this wherever the UI currently calls simulateUpload(bidderId, file)
   * — note this one is async, so callers need `await`.
   */
  public async uploadDocument(bidderId: string, file: File): Promise<DocumentRecord> {
    const result = await this.uploadCertificateForVerification(bidderId, file);
    const docType: string = result.extracted?.document_type ?? 'unknown';
    const allPassed: boolean = !!result.verification?.all_passed;
    const needsReview: boolean = !!result.verification?.needs_review;
    const integrity = result.document_integrity as { score: number; flags: string[] } | undefined;

    const validationChecks =
      (result.verification?.checks ?? []).map((c: any) => ({
        check: c.check ?? `${docType.toUpperCase()} check`,
        status: c.passed ? 'PASS' : 'FAIL',
        note: c.name_match === false
          ? 'Name mismatch against portal record'
          : c.gstin_match === false
            ? 'GSTIN mismatch against portal record'
            : c.passed
              ? 'Verified against government portal'
              : 'Discrepancy found',
      })) as DocumentRecord['validationChecks'];

    if (integrity?.flags?.length) {
      for (const flag of integrity.flags) {
        validationChecks.push({ check: 'Document integrity check', status: 'FAIL', note: flag });
      }
    }

    if (result.extracted?.gstin_ocr_corrected) {
      validationChecks.push({
        check: 'OCR field correction',
        status: 'REVIEW',
        note: 'GSTIN was auto-corrected from OCR output — please confirm against the original document',
      });
    }

    const newDoc: DocumentRecord = {
      id: `DOC-${bidderId}-${docType}-${Date.now().toString().slice(-4)}`,
      bidderId,
      name: DOCUMENT_TYPE_LABEL_MAP[docType] || file.name,
      category: (DOCUMENT_TYPE_CATEGORY_MAP[docType] || 'Other statutory documents') as any,
      uploadedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      ocrStatus: 'Complete',
      validationStatus: needsReview ? 'Review Required' : allPassed ? 'Valid' : 'Review Required',
      crossVerificationStatus: allPassed ? 'MATCH' : 'MISMATCH',
      riskLevel: !allPassed ? 'HIGH' : needsReview ? 'MEDIUM' : 'LOW',
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      extractedData: { ...result.extracted },
      validationChecks,
      integrityCheck: integrity
        ? {
            status: integrity.score === 100 ? 'CLEAR' : 'FLAGGED',
            confidence: integrity.score,
          }
        : { status: 'CLEAR', confidence: 100 },
    };

    this.documents.unshift(newDoc);
    return newDoc;
  }

  private mapCheckToDocument(bidderId: string, check: any): DocumentRecord {
    const passed = !!check.passed;
    return {
      id: `DOC-${bidderId}-${check.check}`,
      bidderId,
      name: CHECK_LABEL_MAP[check.check] || check.check,
      category: (CHECK_CATEGORY_MAP[check.check] || 'Other statutory documents') as any,
      uploadedDate: '—',
      ocrStatus: 'Complete',
      validationStatus: passed ? 'Valid' : 'Review Required',
      crossVerificationStatus: passed ? 'MATCH' : 'MISMATCH',
      riskLevel: passed ? 'LOW' : 'HIGH',
      fileSize: '—',
      extractedData: { ...check },
      validationChecks: [
        {
          check: `${check.check.toUpperCase()} portal cross-verification`,
          status: passed ? 'PASS' : 'FAIL',
          note: check.detail || check.status || (passed ? 'Verified against government portal' : 'Discrepancy found'),
        },
      ],
    };
  }

  public async getRealDocuments(bidderId: string): Promise<DocumentRecord[]> {
    const result = await apiGet<{ bidder_id: string; overall_eligible: boolean; checks: any[] }>(
      `/verify/${bidderId}`
    );
    return result.checks.map((check) => this.mapCheckToDocument(bidderId, check));
  }
}

export const documentService = new DocumentService();