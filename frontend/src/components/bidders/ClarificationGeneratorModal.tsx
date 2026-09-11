import React, { useState } from 'react';
import {
  Copy,
  Check,
  Send,
  X,
  FileText,
  Mail,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Bidder } from '../../types';

interface ClarificationGeneratorModalProps {
  bidder: Bidder;
  isOpen: boolean;
  onClose: () => void;
  onSendClarification: (clarificationText: string, reason: string) => void;
}

export const ClarificationGeneratorModal: React.FC<ClarificationGeneratorModalProps> = ({
  bidder,
  isOpen,
  onClose,
  onSendClarification,
}) => {
  if (!isOpen) return null;

  const defaultLetter = `REF: CPCL/PROC/2026/047/CLR-01
DATE: 09 September 2026

TO:
The Authorized Signatory,
M/s ABC Engineering Pvt. Ltd.,
Plot 42, Bhosari Industrial Area, MIDC, Pune - 411026, Maharashtra.

SUBJECT: Request for Clarification — Technical & Financial Eligibility for Tender No. CPCL/PROC/2026/047 (Supply of Heavy-Duty API 610 Centrifugal Process Pumps).

Dear Sir / Madam,

With reference to your bid submitted against Tender No. CPCL/PROC/2026/047, during initial techno-commercial compliance verification by the Tender Evaluation Committee, the following discrepancies and observations have been noted:

1. ANNUAL FINANCIAL TURNOVER RECONCILIATION:
In your submitted Bid Form TECH-4, an Annual Turnover of ₹18.40 Cr has been declared for FY 2024-25. However, the accompanying Audited Profit & Loss Statement (Schedule 18) and MCA-21 filings indicate Revenue from Operations of ₹12.72 Cr. You are requested to furnish a Statutory Auditor reconciliation certificate bearing a valid UDIN explaining this variation.

2. OEM AUTHORIZATION VALIDITY EXTENSION:
The OEM Manufacturer Authorization Form (MAF) from M/s Kirloskar Flow Technologies Ltd. submitted with your bid reflects an expiry date of 28 September 2026, which is prior to the tender bid validity period (30 September 2026). You are requested to furnish an extended OEM Authorization letter valid through at least 31 December 2026.

3. STATUTORY EPFO RECEIPT:
Please provide the Electronic Challan Return (ECR) receipt for the statutory EPFO contribution for the month of July 2026.

Please submit your formal written clarification with supporting notarized documents within seven (7) working days of receipt of this communication, failing which your bid shall be evaluated based on the documents currently on record.

Yours faithfully,

For Chennai Petroleum Corporation Limited (CPCL),

S. Ramanathan
Dy. General Manager (Procurement)
Mechanical Procurement Division, Manali Refinery, Chennai.`;

  const [letterBody, setLetterBody] = useState(defaultLetter);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(letterBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApproveAndSend = () => {
    onSendClarification(
      letterBody,
      'Formal clarification request issued for Turnover discrepancy & OEM validity extension.'
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
                Statutory Clarification Notice Generator
              </h3>
              <p className="text-[11px] text-teal-200">
                Drafts formal inquiry based on detected contradictions & tender criteria
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
            <p className="text-[11px] text-amber-800">
              Automated analysis drafted this communication addressing <strong>2 critical discrepancies</strong> (Turnover mismatch & OEM early expiry) and <strong>1 pending submission</strong> (July EPFO).
            </p>
          </div>

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
              value={letterBody}
              onChange={(e) => setLetterBody(e.target.value)}
              className="w-full p-3 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] leading-relaxed"
            />
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-start space-x-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Approving this clarification will log an entry in the immutable audit trail and transition the bidder status to <strong>Clarification Requested</strong>.
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
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-[#0F766E] hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Approve & Issue Clarification</span>
          </button>
        </div>
      </div>
    </div>
  );
};
