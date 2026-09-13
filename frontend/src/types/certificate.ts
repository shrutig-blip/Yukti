export type CertificateType = "gst" | "udyam" | "pan" | "epfo";

export interface ExtractedCertificateFields {
  document_type: CertificateType;
  // GST-specific fields shown as an example — pan/udyam/epfo carry
  // their own equivalent identifier + status fields per pdf_extractor.py
  gstin?: string;
  legal_name?: string;
  gstin_checksum_valid?: boolean;
  gstin_ocr_corrected?: boolean;
  [key: string]: unknown;
}

export interface VerificationCheck {
  check: string; // e.g. "portal_match"
  passed: boolean;
  gstin_match?: boolean;
  name_match?: boolean;
  [key: string]: unknown;
}

export interface VerificationResultPayload {
  document_type: CertificateType;
  checks: VerificationCheck[];
  all_passed: boolean;
  needs_review: boolean;
}

export interface DocumentIntegrityResult {
  score: number;
  flags: string[];
}

export interface CertificateVerificationResponse {
  bidder_id: string;
  extracted: ExtractedCertificateFields;
  verification: VerificationResultPayload;
  document_integrity: DocumentIntegrityResult;
}