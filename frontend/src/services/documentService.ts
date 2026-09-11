import { mockDocuments } from '../data/mockData';
import { DocumentRecord } from '../types';

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
}

export const documentService = new DocumentService();
