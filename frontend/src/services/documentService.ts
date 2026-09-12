import { mockDocuments } from '../data/mockData';
import { DocumentRecord } from '../types';
import { apiGet,apiPostForm } from './apiClient';

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
  ): Promise<{ bidder_id: string; extracted: any; verification: any }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiPostForm(`/verify/${bidderId}/certificate`, formData);
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
