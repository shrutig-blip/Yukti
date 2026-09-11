import React from 'react';
import { Shield, CheckCircle, AlertTriangle, Scale, Lock, Eye, X, Database } from 'lucide-react';

interface SystemGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemGovernanceModal: React.FC<SystemGovernanceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#102A43] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-teal-800/80 text-teal-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">
                Yukti Verification Engine — System Governance & Architecture
              </h3>
              <p className="text-[11px] text-teal-200">
                Compliance Protocol & Verification Framework for CPCL Enterprise Procurement
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-xs leading-relaxed">
          {/* Statutory Scope Context Box */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
            <div className="font-bold text-[#102A43] text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
              CPCL Statutory Procurement Framework
            </div>
            <p className="text-slate-600 text-[11px]">
              Developed for Chennai Petroleum Corporation Limited (CPCL), Ministry of Petroleum & Natural Gas.
              Eliminates manual verification bottlenecks by automating document extraction, cross-referencing official
              statutory sources, calculating adaptive risk scores, and generating explainable compliance dossiers for
              procurement executives.
            </p>
          </div>

          {/* 5 Golden Governance Pillars */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
              Mandatory Enterprise Governance Principles
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded border border-slate-200 bg-white">
                <div className="flex items-center space-x-2 text-slate-900 font-semibold mb-1">
                  <Scale className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>1. Human-in-the-Loop Decision Authority</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  The system is strictly an intelligent decision-support assistant. Automated models never qualify,
                  disqualify, or award bids. The final statutory decision is exclusively exercised by the Procurement Officer.
                </p>
              </div>

              <div className="p-3 rounded border border-slate-200 bg-white">
                <div className="flex items-center space-x-2 text-slate-900 font-semibold mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>2. Evidence-First Verification</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Every PASS, WARNING, or DISCREPANCY conclusion maintains an explicit cryptographic pointer to the underlying
                  document paragraph, OCR text token, or official portal query ID.
                </p>
              </div>

              <div className="p-3 rounded border border-slate-200 bg-white">
                <div className="flex items-center space-x-2 text-slate-900 font-semibold mb-1">
                  <Lock className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>3. Immutable Audit Trail</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Every verification run, officer override, justification annotation, and clarification request is recorded
                  in a tamper-evident audit ledger compliant with CVC and CAG public procurement guidelines.
                </p>
              </div>

              <div className="p-3 rounded border border-slate-200 bg-white">
                <div className="flex items-center space-x-2 text-slate-900 font-semibold mb-1">
                  <Eye className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>4. Transparent & Explainable Analytics</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  No opaque "black-box" outputs. The system provides plain-language explanations answering "Why is this bidder risky?",
                  detailing exact financial differences, expiry horizons, and legal naming nuances.
                </p>
              </div>
            </div>

            {/* Prototype Environment Notice */}
            <div className="p-3.5 rounded-md bg-amber-50/80 border border-amber-200 text-amber-900">
              <div className="flex items-center space-x-2 font-bold mb-1">
                <Database className="w-4 h-4 text-amber-700 shrink-0" />
                <span>5. Prototype Environment Notice — Simulated Gateways</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                To comply with security and confidentiality protocols, external government databases (GSTN, MCA-21,
                Income Tax NSDL, CVC Debarment Watchlist, and Udyam Portal) are simulated using modular service interfaces.
                The architecture is designed to plug directly into authorized NIC Gov-Gateway APIs for production deployment.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#102A43] hover:bg-[#243B53] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
