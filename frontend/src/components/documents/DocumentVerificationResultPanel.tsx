import { CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react';

interface VerificationCheck {
  check: string;
  passed: boolean;
  detail?: string;
  [key: string]: any;
}

interface VerificationResult {
  document_type: string;
  checks: VerificationCheck[];
  all_passed: boolean;
  needs_review: boolean;
}

interface ExtractedFields {
  document_type: string;
  [key: string]: any;
}

interface DocumentIntegrityResult {
  score: number;
  flags: string[];
}

interface Props {
  extracted: ExtractedFields;
  verification: VerificationResult;
  documentIntegrity?: DocumentIntegrityResult;
}

// Friendly labels + a human-readable reason builder per check type, so the
// officer sees "GSTIN did not match the GST portal record" instead of a
// raw field dump like { gstin_match: false, name_match: true }.
const CHECK_LABELS: Record<string, string> = {
  portal_match: 'Government Portal Cross-Match',
  certificate_expiry: 'Certificate Validity',
  document_type: 'Document Type Recognition',
};

function describeCheck(check: VerificationCheck): string {
  if (check.detail) return check.detail;

  const mismatches: string[] = [];
  if (check.gstin_match === false) mismatches.push('GSTIN does not match the GST portal record');
  if (check.number_match === false) mismatches.push('Udyam number does not match the portal record');
  if (check.pan_match === false) mismatches.push('PAN number does not match the portal record');
  if (check.establishment_code_match === false) mismatches.push('Establishment code does not match the EPFO portal record');
  if (check.name_match === false) mismatches.push('Registered name does not match the portal record');

  if (check.check === 'certificate_expiry') {
    return check.passed
      ? `Valid through ${check.valid_upto}`
      : `Certificate expired on ${check.valid_upto}`;
  }

  if (mismatches.length > 0) return mismatches.join('; ');
  return check.passed ? 'Matches the government portal record' : 'Discrepancy found';
}

function fieldLabel(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Fields we don't want to show twice (already surfaced as the main extracted
// data or are internal plumbing), when rendering the extracted-fields list.
const HIDDEN_EXTRACTED_KEYS = new Set(['document_type']);

export function DocumentVerificationResultPanel({ extracted, verification, documentIntegrity }: Props) {
  const overallPassed = verification.all_passed && !verification.needs_review;

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header: overall result */}
      <div
        className={`flex items-start gap-3 p-4 border-b ${
          overallPassed
            ? 'bg-emerald-50 border-emerald-200'
            : verification.all_passed
              ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
        }`}
      >
        {overallPassed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        ) : verification.all_passed ? (
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        )}
        <div>
          <div className="font-semibold text-sm text-slate-900">
            {overallPassed
              ? 'Document Verified'
              : verification.all_passed
                ? 'Passed — Review Recommended'
                : 'Verification Failed'}
          </div>
          <div className="text-xs text-slate-600 mt-0.5">
            {verification.document_type === 'unknown'
              ? 'Could not identify a recognized certificate type in this document.'
              : verification.all_passed
                ? verification.needs_review
                  ? 'All checks passed, but an item in this document needs officer confirmation before it can be auto-cleared.'
                  : 'All checks passed against the government portal record.'
                : 'One or more checks did not pass — see details below.'}
          </div>
        </div>
      </div>

      {/* Extracted fields */}
      {verification.document_type !== 'unknown' && (
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            <FileText className="w-3.5 h-3.5" />
            Extracted Information
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {Object.entries(extracted)
              .filter(([key, value]) => !HIDDEN_EXTRACTED_KEYS.has(key) && value !== null && value !== undefined)
              .map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{fieldLabel(key)}</dt>
                  <dd className="font-medium text-slate-900 text-right">{String(value)}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}

      {/* Checklist */}
      <div className="p-4 space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Verification Checklist
        </div>
        {verification.checks.map((check, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 p-2.5 rounded border ${
              check.passed ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'
            }`}
          >
            {check.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900">
                {CHECK_LABELS[check.check] || fieldLabel(check.check)}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">{describeCheck(check)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* GSTIN OCR-correction notice, when present */}
      {extracted.gstin_ocr_corrected && (
        <div className="mx-4 mb-4 p-2.5 rounded border border-amber-200 bg-amber-50 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            GSTIN was auto-corrected from OCR misreads (raw read: {extracted.gstin_raw_ocr}). Please confirm
            against the original document before relying on this field.
          </span>
        </div>
      )}

      {/* Document integrity (real metadata/structure-based signals — not ML) */}
      {documentIntegrity && (
        <div className="mx-4 mb-4 p-3.5 rounded-lg border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Document Integrity Analysis
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                documentIntegrity.flags.length === 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : documentIntegrity.score >= 70
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              Score: {documentIntegrity.score}/100
            </span>
          </div>
          {documentIntegrity.flags.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>No structural or metadata anomalies detected in this file.</span>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {documentIntegrity.flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="text-[11px] text-slate-400 italic mt-2 pt-2 border-t border-slate-200">
            Based on PDF metadata and structure only — not a forgery-detection model. Flags do not establish fraud.
          </div>
        </div>
      )}
    </div>
  );
}