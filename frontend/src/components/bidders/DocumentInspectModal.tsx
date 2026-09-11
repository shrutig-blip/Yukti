import React from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ExternalLink,
  X,
  Clock,
  Layers,
  Search,
  Eye,
} from 'lucide-react';
import { DocumentRecord } from '../../types';

interface DocumentInspectModalProps {
  document: DocumentRecord | null;
  onClose: () => void;
}

export const DocumentInspectModal: React.FC<DocumentInspectModalProps> = ({ document, onClose }) => {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#102A43] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-teal-800/80 text-teal-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded border border-teal-600/50">
                  {document.id}
                </span>
                <span className="text-xs text-slate-300">Category: {document.category}</span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                {document.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Top Status Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">OCR Status</div>
              <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>{document.ocrStatus}</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Validation Status</div>
              <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                {document.validationStatus === 'Valid' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>{document.validationStatus}</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Cross-Check</div>
              <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                {document.crossVerificationStatus === 'MATCH' ? (
                  <span className="text-emerald-700">MATCH</span>
                ) : document.crossVerificationStatus === 'MISMATCH' ? (
                  <span className="text-red-700">MISMATCH</span>
                ) : (
                  <span className="text-amber-700">{document.crossVerificationStatus}</span>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Risk Assessment</div>
              <div className="font-bold mt-0.5">
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                    document.riskLevel === 'LOW'
                      ? 'bg-emerald-100 text-emerald-800'
                      : document.riskLevel === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {document.riskLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Extracted Information */}
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-2">
            <h4 className="font-bold text-[#102A43] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#0F766E]" />
              Extracted Document Entities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-1">
              {Object.entries(document.extractedData).map(([key, val]) => (
                <div key={key} className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[10px] font-medium text-slate-400 uppercase">{key}</div>
                  <div className="font-mono font-bold text-slate-800 text-xs mt-0.5 truncate">
                    {String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: AI Validation Checklist */}
          <div className="space-y-2">
            <h4 className="font-bold text-[#102A43] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              Automated Document Validation Rules
            </h4>
            <div className="space-y-1.5">
              {document.validationChecks.map((v, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded border flex items-start justify-between ${
                    v.status === 'PASS'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : v.status === 'WARN'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-red-50/50 border-red-200'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {v.status === 'PASS' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : v.status === 'WARN' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-800">{v.check}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{v.note}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      v.status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : v.status === 'WARN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Portal Cross-Verification Record */}
          {document.crossCheckRecord && (
            <div className="p-4 rounded-md border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h4 className="font-bold text-[#102A43] uppercase text-[10px] tracking-wider">
                  Official Portal Cross-Verification (Simulated)
                </h4>
                <span className="font-mono text-[10px] text-slate-500">
                  Ref: {document.crossCheckRecord.verificationId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">
                    Submitted Document Value
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-1">
                    {document.crossCheckRecord.submittedValue}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Field: {document.crossCheckRecord.submittedField}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">
                    Official Portal Record
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-1">
                    {document.crossCheckRecord.portalValue}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Source: {document.crossCheckRecord.sourceName}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                <span className="text-slate-500">
                  Verified Timestamp: {document.crossCheckRecord.timestamp}
                </span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    document.crossCheckRecord.matchStatus === 'MATCH'
                      ? 'bg-emerald-100 text-emerald-800'
                      : document.crossCheckRecord.matchStatus === 'CLEAR'
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  RESULT: {document.crossCheckRecord.matchStatus}
                </span>
              </div>
            </div>
          )}

          {/* Section 4: Document Integrity & Tampering Checks */}
          {document.integrityCheck && (
            <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#102A43] uppercase text-[10px] tracking-wider">
                  Document Integrity Analysis (Anomaly Detection)
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Integrity Confidence: {document.integrityCheck.confidence}%
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {document.integrityCheck.detectedNote ||
                  'No structural anomalies, abnormal fonts, or timestamp discrepancies detected.'}
              </p>
              <div className="text-[10px] text-slate-400 italic pt-1">
                Notice: System flags potential anomalies for officer review. It does not establish fraud.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            File: {document.name} ({document.fileSize})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#102A43] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
