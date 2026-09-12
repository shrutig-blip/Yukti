import React, { useState } from 'react';
import { Scale, CheckCircle2, XCircle, Clock, Send, AlertTriangle, X, Shield } from 'lucide-react';
import { Bidder, OfficerDecision } from '../../types';
import { CURRENT_OFFICER } from '../../constants/officer';

interface HumanDecisionModalProps {
  bidder: Bidder;
  isOpen: boolean;
  onClose: () => void;
  onSubmitDecision: (decision: OfficerDecision) => void;
}

export const HumanDecisionModal: React.FC<HumanDecisionModalProps> = ({
  bidder,
  isOpen,
  onClose,
  onSubmitDecision,
}) => {
  if (!isOpen) return null;

  const [selectedDecision, setSelectedDecision] = useState<'QUALIFIED' | 'DISQUALIFIED' | 'CLARIFICATION_REQUESTED' | 'PENDING'>('CLARIFICATION_REQUESTED');
  const [officerName, setOfficerName] = useState(CURRENT_OFFICER.name);
  const [officerDesignation, setOfficerDesignation] = useState(CURRENT_OFFICER.fullDesignation);
  const [comments, setComments] = useState(
    'Seeking formal reconciliation for declared ₹18.40 Cr turnover vs ₹12.72 Cr audited statement, and OEM authorization extension beyond tender deadline.'
  );
  const [conditions, setConditions] = useState('Subject to verified CA reconciliation certificate and OEM 90-day extension letter.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) return;

    const decisionRecord: OfficerDecision = {
      decision: selectedDecision,
      officerName,
      officerDesignation,
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      comments,
      conditionsOrStipulations: conditions,
    };

    onSubmitDecision(decisionRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border-2 border-[#102A43] shadow-2xl max-w-xl w-full overflow-hidden">
        {/* Header - High prominence highlighting Human Decision */}
        <div className="px-6 py-4 bg-[#102A43] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-teal-800 text-teal-300">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-teal-300">
                Rule 1: Human Decision Authority
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                HUMAN DECISION — PROCUREMENT OFFICER
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Verification Advisory Separation Banner */}
          <div className="p-3 bg-slate-100 border border-slate-300 rounded-md text-slate-700 text-[11px] leading-relaxed">
            <span className="font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Statutory Decision Gate
            </span>
            The verification engine has furnished an advisory score of <strong>{bidder.complianceScore}/100</strong> and <strong>{bidder.riskLevel}</strong> risk rating.
            In strict adherence to CPCL procurement policy, this decision is non-automated and legally executed by the Procurement Officer.
          </div>

          {/* Decision Selection Grid */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2">
              Official Decision Category
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedDecision('QUALIFIED')}
                className={`p-3 rounded border text-left flex items-start space-x-2 transition-all ${
                  selectedDecision === 'QUALIFIED'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 mt-0.5 ${selectedDecision === 'QUALIFIED' ? 'text-emerald-700' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-slate-900">Approve / Qualify</div>
                  <div className="text-[10px] text-slate-500">Admit to commercial bid opening</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDecision('CLARIFICATION_REQUESTED')}
                className={`p-3 rounded border text-left flex items-start space-x-2 transition-all ${
                  selectedDecision === 'CLARIFICATION_REQUESTED'
                    ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Clock className={`w-4 h-4 mt-0.5 ${selectedDecision === 'CLARIFICATION_REQUESTED' ? 'text-amber-700' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-slate-900">Request Clarification</div>
                  <div className="text-[10px] text-slate-500">Seek bidder written reconciliation</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDecision('DISQUALIFIED')}
                className={`p-3 rounded border text-left flex items-start space-x-2 transition-all ${
                  selectedDecision === 'DISQUALIFIED'
                    ? 'border-red-600 bg-red-50/80 ring-2 ring-red-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <XCircle className={`w-4 h-4 mt-0.5 ${selectedDecision === 'DISQUALIFIED' ? 'text-red-700' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-slate-900">Reject / Disqualify</div>
                  <div className="text-[10px] text-slate-500">Non-responsive to mandatory criteria</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDecision('PENDING')}
                className={`p-3 rounded border text-left flex items-start space-x-2 transition-all ${
                  selectedDecision === 'PENDING'
                    ? 'border-slate-600 bg-slate-100 ring-2 ring-slate-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Clock className={`w-4 h-4 mt-0.5 ${selectedDecision === 'PENDING' ? 'text-slate-700' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-slate-900">Keep Pending</div>
                  <div className="text-[10px] text-slate-500">Awaiting internal committee review</div>
                </div>
              </button>
            </div>
          </div>

          {/* Officer Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                Procurement Officer Name
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-slate-800 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                Official Designation
              </label>
              <input
                type="text"
                value={officerDesignation}
                onChange={(e) => setOfficerDesignation(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-slate-800"
                required
              />
            </div>
          </div>

          {/* Officer Justification / Remarks */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
              Officer Technical Justification / Audit Remarks <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
              placeholder="Record mandatory rationale for public procurement compliance..."
              required
            />
          </div>

          {/* Conditions / Stipulations */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
              Stipulations or Conditions (If any)
            </label>
            <input
              type="text"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-slate-800"
              placeholder="e.g. Subject to submission of PBG..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#102A43] hover:bg-slate-800 text-white rounded font-bold shadow-xs flex items-center space-x-1.5"
            >
              <Scale className="w-3.5 h-3.5 text-teal-400" />
              <span>Record Statutory Decision</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
