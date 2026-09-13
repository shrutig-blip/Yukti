import React, { useEffect, useState } from 'react';
import {
  Copy,
  Check,
  Send,
  X,
  Mail,
  AlertTriangle,
  Info,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Bidder, ContradictionItem } from '../../types';
import { useCurrentOfficer } from '../../context/OfficerContext';
import { letterService } from '../../services/letterService';
import { OfficerProfile } from '../../constants/officer';

interface ClarificationGeneratorModalProps {
  bidder: Bidder;
  isOpen: boolean;
  onClose: () => void;
  contradictions: ContradictionItem[];
  tender: { id: string; title: string };
  onSendClarification: (clarificationText: string, reason: string) => void;
}

/**
 * Deterministic FALLBACK letter — used only if the AI call fails (no
 * internet, no API key, backend down). Not the primary path anymore, but
 * kept so a demo never breaks. Built the same way as before: one paragraph
 * per real contradiction, no invented facts.
 */
function buildFallbackLetterBody(
  bidder: Bidder,
  tender: { id: string; title: string },
  contradictions: ContradictionItem[],
  officer: OfficerProfile
): string {
  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const paragraphs = contradictions
    .map((c, idx) => {
      const sourceLines = c.sources.map((s) => `   - ${s.source}: ${s.value}`).join('\n');
      return `${idx + 1}. ${c.field.toUpperCase()}:
${c.assessment}
${sourceLines ? `${sourceLines}\n` : ''}${c.recommendation}`;
    })
    .join('\n\n');

  return `REF: CPCL/PROC/${tender.id}/CLR-01
DATE: ${todayStr}

TO:
The Authorized Signatory,
M/s ${bidder.name},
${bidder.registeredAddress ? `${bidder.registeredAddress}.` : '(Address on file with the department).'}

SUBJECT: Request for Clarification — Compliance & Eligibility for Tender No. ${tender.id}${
    tender.title ? ` (${tender.title})` : ''
  }.

Dear Sir / Madam,

With reference to your bid submitted against Tender No. ${tender.id}, during compliance verification by the Tender Evaluation Committee, the following discrepancies and observations have been noted:

${paragraphs}

Please submit your formal written clarification with supporting notarized documents within seven (7) working days of receipt of this communication, failing which your bid shall be evaluated based on the documents currently on record.

Yours faithfully,

For Chennai Petroleum Corporation Limited (CPCL),

${officer.name}
${officer.fullDesignation}
Mechanical Procurement Division, Manali Refinery, Chennai.`;
}

export const ClarificationGeneratorModal: React.FC<ClarificationGeneratorModalProps> = ({
  bidder,
  isOpen,
  onClose,
  contradictions,
  tender,
  onSendClarification,
}) => {
  const officer = useCurrentOfficer();
  const [letterBody, setLetterBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  // Ask the AI to draft the letter whenever the modal opens for a
  // (possibly new) bidder/tender/contradiction set. Falls back to the
  // deterministic template if the AI call fails for any reason.
  useEffect(() => {
    if (!isOpen) return;
    if (contradictions.length === 0) {
      setLetterBody('');
      return;
    }
    let cancelled = false;
    setIsGenerating(true);
    setUsedFallback(false);
    letterService
      .generateClarificationLetter(bidder, tender, contradictions)
      .then((text) => {
        if (!cancelled) setLetterBody(text);
      })
      .catch(() => {
        if (!cancelled) {
          setLetterBody(buildFallbackLetterBody(bidder, tender, contradictions, officer));
          setUsedFallback(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, bidder.id, tender.id, contradictions, officer]);

  if (!isOpen) return null;

  const criticalCount = contradictions.filter((c) => c.severity === 'CRITICAL').length;
  const otherCount = contradictions.length - criticalCount;
  const hasNothingToFlag = contradictions.length === 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(letterBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApproveAndSend = () => {
    onSendClarification(
      letterBody,
      `Formal clarification request issued for ${contradictions.length} identified discrepanc${
        contradictions.length === 1 ? 'y' : 'ies'
      }.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#102A43] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-teal-800 text-teal-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">
                AI Clarification Notice Generator
              </h3>
              <p className="text-[11px] text-teal-200">
                LLM drafts a formal inquiry from detected contradictions & tender criteria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Automated Discrepancy Trigger Summary */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Target Bidder: {bidder.name} ({bidder.id})</span>
            </div>
            {hasNothingToFlag ? (
              <p className="text-[11px] text-amber-800">
                No active discrepancies were found for this bidder against Tender {tender.id}. A
                clarification notice is not required at this time.
              </p>
            ) : (
              <p className="text-[11px] text-amber-800">
                Automated analysis flagged{' '}
                <strong>
                  {criticalCount} critical discrepanc{criticalCount === 1 ? 'y' : 'ies'}
                </strong>
                {otherCount > 0 && (
                  <>
                    {' '}
                    and{' '}
                    <strong>
                      {otherCount} other flagged item{otherCount === 1 ? '' : 's'}
                    </strong>
                  </>
                )}
                . The letter below is being drafted from these real findings.
              </p>
            )}
          </div>

          {/* AI status banner */}
          {!hasNothingToFlag && (
            <div
              className={`p-2.5 rounded-md text-[11px] flex items-center space-x-2 border ${
                usedFallback
                  ? 'bg-orange-50 border-orange-200 text-orange-800'
                  : 'bg-teal-50 border-teal-200 text-teal-800'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Drafting letter with AI from the detected discrepancies…</span>
                </>
              ) : usedFallback ? (
                <>
                  <Info className="w-3.5 h-3.5" />
                  <span>
                    AI drafting was unavailable — showing a template-based letter generated from
                    the same real data instead.
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Drafted by AI from real detected discrepancies.</span>
                </>
              )}
            </div>
          )}

          {/* Letter editor / preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Official Clarification Notice Draft (Editable)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-[#0F766E] font-semibold hover:underline"
                >
                  {isEditing ? 'Done Editing' : 'Edit Text'}
                </button>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-[11px]"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={14}
              value={isGenerating ? 'Generating…' : letterBody}
              onChange={(e) => setLetterBody(e.target.value)}
              disabled={isGenerating}
              className="w-full p-3 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] leading-relaxed disabled:text-slate-400"
            />
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-start space-x-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Approving this clarification will log an entry in the audit trail and transition the
              bidder status to <strong>Clarification Requested</strong>.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleApproveAndSend}
            disabled={hasNothingToFlag || isGenerating}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-[#0F766E] hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0F766E]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Approve & Issue Clarification</span>
          </button>
        </div>
      </div>
    </div>
  );
};