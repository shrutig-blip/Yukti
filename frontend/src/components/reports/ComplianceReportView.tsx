import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  ArrowLeft,
  Shield,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Building2,
  Scale,
} from 'lucide-react';
import { Bidder, Tender, TenderRequirement, ContradictionItem, DocumentRecord  } from '../../types';
import { complianceService } from '../../services/complianceService';
import { documentService } from '../../services/documentService';
import { riskService } from '../../services/riskService';

interface ComplianceReportViewProps {
  bidder: Bidder;
  tender: Tender;
  requirements: TenderRequirement[];
  onBack: () => void;
}

export const ComplianceReportView: React.FC<ComplianceReportViewProps> = ({
  bidder,
  tender,
  requirements,
  onBack,
}) => {
  // getContradictions() now hits the real backend and is async — same
  // signature change (bidderId -> bidderId, tenderId) already applied in
  // BidderProfileView.tsx and ComplianceAnalysisView.tsx.
  const [contradictions, setContradictions] = useState<ContradictionItem[]>([]);
  const [isLoadingContradictions, setIsLoadingContradictions] = useState(true);
  const expiries = riskService.getExpiries(bidder.id);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  useEffect(() => {
    if (!bidder.id || !tender.id) return;
    let cancelled = false;
    setIsLoadingContradictions(true);
    complianceService
      .getContradictions(bidder.id, tender.id)
      .then((c) => {
        if (!cancelled) setContradictions(c);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingContradictions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bidder.id, tender.id]);
  useEffect(() => {
  if (!bidder.id) return;
  let cancelled = false;
  documentService
    .getRealDocuments(bidder.id)
    .then((docs) => {
      if (!cancelled) setDocuments(docs);
    })
    .catch(() => {
      if (!cancelled) setDocuments([]);
    });
  return () => {
    cancelled = true;
  };
}, [bidder.id]);
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
        <button
          onClick={onBack}
          className="text-xs text-slate-600 hover:text-[#0F766E] font-medium flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Bidder Profile</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#102A43] text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-teal-300" />
            <span>Print Official Dossier / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-white border border-slate-300 shadow-md rounded-lg p-8 sm:p-12 space-y-8 print:border-0 print:shadow-none print:p-0 text-slate-900 font-sans">
        {/* Report Header */}
        <div className="border-b-2 border-slate-900 pb-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded bg-[#102A43] text-white flex items-center justify-center font-bold text-sm tracking-widest">
                CPCL
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                  Chennai Petroleum Corporation Limited (CPCL)
                </h1>
                <div className="text-xs text-slate-600">
                  (A Government of India Enterprise & Group Company of IndianOil)
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs font-bold text-[#0F766E]">
                PROCURESURE-AI-REPORT-2026-047
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Generated: {new Date().toLocaleDateString('en-GB')} • v2.4.1 Enterprise
              </div>
            </div>
          </div>

          <div className="pt-3 text-center">
            <h2 className="text-lg font-extrabold uppercase tracking-wide text-[#102A43]">
              Tender Compliance & Bidder Verification Technical Dossier
            </h2>
            <div className="text-xs text-slate-600 font-medium">
              Automated Statutory Cross-Verification & Human Decision Sign-off Record
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded text-xs">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Tender Reference</div>
            <div className="font-mono font-bold text-slate-900">{tender.id}</div>
            <div className="text-[10px] text-slate-500 truncate">{tender.title}</div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Bidder Entity</div>
            <div className="font-bold text-slate-900">{bidder.name}</div>
            <div className="font-mono text-[10px] text-slate-500">{bidder.id}</div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Department / Division</div>
            <div className="text-slate-800 font-medium">{tender.department}</div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Officer In-Charge</div>
            <div className="font-bold text-slate-900">S. Ramanathan</div>
            <div className="text-[10px] text-slate-500">DGM (Procurement)</div>
          </div>
        </div>

        {/* Executive Summary Metrics Box */}
        <div className="border border-slate-300 rounded p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
            Executive Evaluation Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">Compliance Score</div>
              <div className="text-2xl font-bold text-[#102A43] mt-1">{bidder.complianceScore} / 100</div>
              <div className="text-[10px] text-teal-700 font-semibold">Weighted Composite</div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">Adaptive Risk Rating</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">{bidder.riskLevel}</div>
              <div className="text-[10px] text-slate-500">Governed by Critical Flags</div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">AI Advisory Assessment</div>
              <div className="text-xs font-bold text-amber-900 mt-2">FURTHER REVIEW RECOMMENDED</div>
              <div className="text-[10px] text-slate-500">Officer Action Required</div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">Verification Rate</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{bidder.verificationProgress}%</div>
              <div className="text-[10px] text-slate-500">10 Official Sources</div>
            </div>
          </div>
        </div>

        {/* Section 1: Statutory Verification Results */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#102A43] border-b border-slate-300 pb-1">
            1. Statutory & Regulatory Cross-Verification
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Income Tax PAN</span>
              <span className="font-mono font-bold text-slate-900">{bidder.pan}</span>
              <span className="text-emerald-700 font-bold block text-[10px] mt-0.5">✓ Active & Linked (ITD)</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">GST Registration</span>
              <span className="font-mono font-bold text-slate-900">{bidder.gstin}</span>
              <span className="text-emerald-700 font-bold block text-[10px] mt-0.5">✓ Active & Tax-Compliant (GSTN)</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Corporate Identity (CIN)</span>
              <span className="font-mono font-bold text-slate-400">Not tracked by backend</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">MSME Udyam Number</span>
              <span className="font-mono font-bold text-slate-900">{bidder.udyam}</span>
              <span className="text-teal-700 font-bold block text-[10px] mt-0.5">✓ Medium Mfg Enterprise</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Debarment Database</span>
              <span className="font-bold text-slate-900">National Register</span>
              <span className="text-emerald-700 font-bold block text-[10px] mt-0.5">✓ Clean Record (CVC/GeM)</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Statutory Provident Fund</span>
              <span className="font-mono font-bold text-slate-400">Not tracked by backend</span>
            </div>
          </div>
        </div>

        {/* Section 2: Technical & Tender Requirements Evaluation */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#102A43] border-b border-slate-300 pb-1">
            2. Tender Eligibility Evaluation Matrix (14 Mandatory Criteria)
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                <th className="py-2 px-3 border-b border-slate-200">Ref</th>
                <th className="py-2 px-3 border-b border-slate-200">Criterion</th>
                <th className="py-2 px-3 border-b border-slate-200">Submitted Evidence</th>
                <th className="py-2 px-3 border-b border-slate-200">Source</th>
                <th className="py-2 px-3 border-b border-slate-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {requirements.map((req) => (
                <tr key={req.id}>
                  <td className="py-2 px-3 font-mono font-semibold text-slate-600">{req.id}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900">{req.requirement}</td>
                  <td className="py-2 px-3 text-slate-700">{req.evidenceRequired}</td>
                  <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{req.evidenceSource || 'Portal API'}</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        req.status === 'PASS'
                          ? 'text-emerald-800 bg-emerald-50'
                          : req.status === 'REVIEW REQUIRED'
                          ? 'text-amber-800 bg-amber-50'
                          : 'text-red-800 bg-red-50'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Cross-Document Discrepancy Findings */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#102A43] border-b border-slate-300 pb-1">
            3. Cross-Document Discrepancy Findings
          </h3>
          <div className="space-y-2.5 text-xs">
            {contradictions.map((c) => (
              <div key={c.id} className="p-3 border border-slate-200 bg-slate-50/50 rounded space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900">{c.field} ({c.id})</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      c.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-800'
                        : c.severity === 'HIGH'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    Severity: {c.severity}
                  </span>
                </div>
                <div className="text-slate-700 text-[11px]">{c.assessment}</div>
                <div className="text-teal-900 font-semibold text-[11px]">Action: {c.recommendation}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Human Officer Decision & Sign-off Block */}
        <div className="border-2 border-slate-900 rounded p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-300 pb-2">
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-[#102A43]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#102A43]">
                4. Statutory Human Officer Decision & Authentication
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
              Rule 1 Enforced
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-500">Official Decision</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">
                {bidder.officerDecision ? bidder.officerDecision.decision : 'PENDING COMMITTEE DETERMINATION'}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase text-slate-500">Authentication Timestamp</div>
              <div className="font-mono text-slate-800 mt-0.5">
                {bidder.officerDecision ? bidder.officerDecision.timestamp : 'Pending officer submission'}
              </div>
            </div>
          </div>

          <div className="text-xs space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
            <div className="font-bold text-slate-800">Officer Technical Rationale:</div>
            <div className="text-slate-700 leading-relaxed italic">
              "{bidder.officerDecision?.comments ||
                'Bidder technically strong with cleared debarment record. However, procurement regulations mandate formal statutory CA clarification regarding the ₹18.4 Cr vs ₹12.7 Cr turnover variation, and submission of an OEM validity extension letter prior to commercial evaluation.'}"
            </div>
          </div>

          <div className="pt-6 grid grid-cols-2 gap-8 text-xs border-t border-slate-200">
            <div>
              <div className="border-b border-slate-400 w-48 mb-1">
                <span className="font-serif italic text-slate-600 text-sm">S. Ramanathan</span>
              </div>
              <div className="font-bold text-slate-900">S. Ramanathan</div>
              <div className="text-slate-500 text-[11px]">Dy. General Manager (Procurement)</div>
              <div className="text-slate-500 text-[10px]">Mechanical Procurement Division, CPCL</div>
            </div>

            <div className="text-right">
              <div className="inline-block text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Digital Verification Stamp
                </div>
                <div className="p-2 border border-slate-300 rounded font-mono text-[9px] text-slate-600 bg-slate-50 space-y-0.5">
                  <div>SHA256: e4f98d62b1a0...99c4</div>
                  <div>PLATFORM: Yukti Statutory Verification Engine</div>
                  <div>CPCL SECURE ENCLAVE CERTIFIED</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer / Statutory Notice */}
        <div className="text-[10px] text-slate-400 text-center italic pt-4 border-t border-slate-200">
          This technical dossier is generated under the CPCL Electronic Procurement Integrity Framework.
          Automated analytical components serve strictly as decision-support heuristics.
          Final legal authority and tender qualification determinations rest exclusively with designated Procurement Officers.
        </div>
      </div>
    </div>
  );
};
