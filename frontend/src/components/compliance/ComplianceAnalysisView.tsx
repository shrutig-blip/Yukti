import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  AlertOctagon,
  Sliders,
  Send,
  Eye,
  Check,
  X,
  Scale,
  Clock,
  Download,
} from 'lucide-react';
import {
  Tender,
  Bidder,
  TenderRequirement,
  DocumentRecord,
  SeverityLevel,
  ComplianceBreakdown,
} from '../../types';
import { documentService } from '../../services/documentService';
import { complianceService } from '../../services/complianceService';
import { auditService } from '../../services/auditService';
import { DocumentInspectModal } from '../bidders/DocumentInspectModal';
import { ClarificationGeneratorModal } from '../bidders/ClarificationGeneratorModal';
import { WhatIfSimulatorModal } from '../bidders/WhatIfSimulatorModal';

interface ComplianceAnalysisViewProps {
  tender: Tender;
  bidders: Bidder[];
  activeBidder: Bidder;
  requirements: TenderRequirement[];
  onSelectBidder: (bidderId: string) => void;
  onNavigateToBidder: (bidderId: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const ComplianceAnalysisView: React.FC<ComplianceAnalysisViewProps> = ({
  tender,
  bidders,
  activeBidder,
  requirements,
  onSelectBidder,
  onNavigateToBidder,
  onNavigateToTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequirement, setSelectedRequirement] = useState<TenderRequirement | null>(null);
  const [inspectingDoc, setInspectingDoc] = useState<DocumentRecord | null>(null);
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [officerNotes, setOfficerNotes] = useState<Record<string, string>>({});
  const [confirmedReqs, setConfirmedReqs] = useState<Record<string, boolean>>({
    'REQ-01': false,
    'REQ-02': true,
    'REQ-03': true,
    'REQ-04': true,
    'REQ-05': true,
    'REQ-06': false,
    'REQ-07': true,
    'REQ-08': true,
    'REQ-09': true,
    'REQ-10': true,
    'REQ-11': true,
    'REQ-12': true,
    'REQ-13': true,
    'REQ-14': true,
  });

  const [bidderDocs, setBidderDocs] = useState<DocumentRecord[]>([]);
  // breakdown comes from complianceService, which now calls the real
  // backend (GET /compliance/{bidder_id}/{tender_id}) and is async —
  // signature changed from the mock (getBreakdown(bidderId) ->
  // getBreakdown(bidderId, tenderId)), same as the fix already applied in
  // BidderProfileView.tsx. Re-fetched whenever the evaluated bidder or
  // tender changes. (getContradictions() isn't fetched here — nothing in
  // this view actually renders it; ClarificationGeneratorModal, the one
  // place it used to be passed to, doesn't accept a contradictions prop —
  // see the modal-prop-mismatch note below.)
  const [breakdown, setBreakdown] = useState<ComplianceBreakdown>({
    statutoryCompliance: 0,
    documentCompleteness: 0,
    tenderEligibility: 0,
    financialCompliance: 0,
    authorizationCompliance: 0,
  });
  const [isComplianceLoading, setIsComplianceLoading] = useState(true);

  useEffect(() => {
    if (!activeBidder.id || !tender.id) return;
    let cancelled = false;
    setIsComplianceLoading(true);
    complianceService
      .getBreakdown(activeBidder.id, tender.id)
      .then((b) => {
        if (!cancelled) setBreakdown(b);
      })
      .finally(() => {
        if (!cancelled) setIsComplianceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBidder.id, tender.id]);
  useEffect(() => {
  if (!activeBidder.id) return;
  let cancelled = false;
  documentService
    .getRealDocuments(activeBidder.id)
    .then((docs) => {
      if (!cancelled) setBidderDocs(docs);
    })
    .catch(() => {
      if (!cancelled) setBidderDocs([]);
    });
  return () => {
    cancelled = true;
  };
}, [activeBidder.id]);
  // Filter requirements
  const filteredRequirements = requirements.filter((req) => {
    const matchesCategory =
      selectedCategory === 'ALL' || req.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PASS' && req.status === 'PASS') ||
      (statusFilter === 'REVIEW REQUIRED' && req.status === 'REVIEW REQUIRED') ||
      (statusFilter === 'FAIL' && req.status === 'FAIL');
    const matchesSearch =
      searchQuery.trim() === '' ||
      req.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.remarks && req.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  const passCount = requirements.filter((r) => r.status === 'PASS').length;
  const reviewCount = requirements.filter((r) => r.status === 'REVIEW REQUIRED').length;
  const failCount = requirements.filter((r) => r.status === 'FAIL').length;
  const totalCount = requirements.length;
  const compliancePercentage = Math.round((passCount / (totalCount || 1)) * 100);

  const handleConfirmToggle = (reqId: string) => {
    const nextState = !confirmedReqs[reqId];
    setConfirmedReqs((prev) => ({ ...prev, [reqId]: nextState }));

    auditService.logEvent({
      actor: 'Procurement Officer (DGM Procurement)',
      role: 'Procurement Officer',
      action: nextState ? `Confirmed Compliance for ${reqId}` : `Reopened Review for ${reqId}`,
      source: 'Compliance Analysis Engine',
      result: nextState ? 'RECORDED' : 'REVIEW',
      evidenceRef: reqId,
      bidderId: activeBidder.id,
      comments: officerNotes[reqId] || 'Officer updated clause compliance determination.',
    });
  };

  const handleExportCSV = () => {
    const headers = ['Clause ID', 'Category', 'Mandatory', 'Requirement', 'Status', 'Evidence Citation', 'Officer Confirmed'];
    const rows = requirements.map((r) => [
      r.id,
      r.category,
      r.isMandatory ? 'YES' : 'NO',
      `"${r.requirement.replace(/"/g, '""')}"`,
      r.status,
      `"${(r.evidenceSource || '').replace(/"/g, '""')}"`,
      confirmedReqs[r.id] ? 'YES' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CPCL_Compliance_Matrix_${activeBidder.id}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Header & Context Desk */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 text-xs text-slate-500 mb-1.5 font-medium">
              <span className="font-semibold text-[#0F766E] uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                CPCL Statutory Verification
              </span>
              <span>•</span>
              <span>Tender No: <strong className="font-mono text-slate-800">{tender.id}</strong></span>
              <span>•</span>
              <span className="truncate max-w-xs">{tender.department}</span>
            </div>
            <h1 className="text-[28px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-tight">
              Tender Compliance Analysis & Clause-by-Clause Matrix
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl font-normal leading-relaxed">
              Statutory verification matrix comparing bidder submissions against CPCL NIT technical, financial, and regulatory clauses.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-sm font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors shadow-xs"
            >
              <Sliders className="w-4 h-4 text-slate-600" />
              <span>Sensitivity Simulator</span>
            </button>
            <button
              onClick={() => setIsClarificationModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-sm font-medium rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4 text-amber-700" />
              <span>Draft Defect Notice</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-sm font-medium rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export Matrix CSV</span>
            </button>
          </div>
        </div>

        {/* Bidder Switcher Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider shrink-0">
              Evaluating Bidder:
            </span>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {bidders.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onSelectBidder(b.id)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all whitespace-nowrap border ${
                    activeBidder.id === b.id
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono text-xs mr-1 opacity-70">{b.id}</span>
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0 text-sm">
            <button
              onClick={() => onNavigateToBidder(activeBidder.id)}
              className="font-medium text-[#0F766E] hover:text-teal-800 flex items-center gap-1"
            >
              <span>Open Bidder Dossier</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bidder Evaluation Snapshot & High-Density Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Compliance Rating Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Overall Compliance Index
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-[#0F172A]">{compliancePercentage}%</span>
              <span className="text-xs font-medium text-slate-500">
                ({passCount}/{totalCount} Clauses Satisfied)
              </span>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${
                compliancePercentage >= 85
                  ? 'bg-emerald-600'
                  : compliancePercentage >= 70
                  ? 'bg-amber-500'
                  : 'bg-rose-600'
              }`}
              style={{ width: `${compliancePercentage}%` }}
            />
          </div>
        </div>

        {/* Mandatory Clauses */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Mandatory Clauses
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-[#0F172A]">12</span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {reviewCount} Critical Review Req.
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-normal">
            Non-waivable NIT technical & financial criteria
          </div>
        </div>

        {/* Discrepancies & Contradictions */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Discrepancies Flagged
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-rose-700">2</span>
              <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Turnover & OEM Expiry
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-normal">
            Cross-referenced with MCA-21 & Document OCR
          </div>
        </div>

        {/* Statutory Portal Verification Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Statutory Portals
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-emerald-700">8 / 10</span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Clear
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 font-normal">
            GSTN, PAN, MCA21, EPFO, CVC, GeM active
          </div>
        </div>
      </div>

      {/* 3. Filter, Search & Category Navigation */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Clauses', count: requirements.length },
              { id: 'Financial', label: 'Financial Criteria', count: 2 },
              { id: 'Technical', label: 'Technical & Experience', count: 4 },
              { id: 'Statutory', label: 'Statutory & Tax', count: 4 },
              { id: 'Authorization', label: 'OEM & Authorization', count: 2 },
              { id: 'Integrity', label: 'Integrity & Debarment', count: 2 },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-[#0F766E] text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat.id ? 'bg-teal-900 text-teal-200' : 'bg-slate-200 text-slate-600'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Status Filter & Search */}
          <div className="flex items-center space-x-2 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:border-[#0F766E]"
            >
              <option value="ALL">Status: All</option>
              <option value="PASS">Pass / Compliant</option>
              <option value="REVIEW REQUIRED">Review Required</option>
              <option value="FAIL">Disqualified / Fail</option>
            </select>

            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search clause text or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-hidden focus:border-[#0F766E] text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. The Enterprise Compliance Matrix Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Clause-by-Clause Statutory Evaluation Matrix
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({filteredRequirements.length} Criteria Displayed)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center space-x-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Compliant
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Review / Discrepancy
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Non-Compliant
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 w-24">Clause ID</th>
                <th className="py-3 px-4 w-32">Category</th>
                <th className="py-3 px-4">CPCL Requirement & Statutory Rule</th>
                <th className="py-3 px-4 w-48">Bidder Submission & Evidence</th>
                <th className="py-3 px-4 w-36">System Verification</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 w-40 text-right">Officer Confirmation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequirements.map((req) => {
                const isConfirmed = confirmedReqs[req.id];
                const hasDiscrepancy = req.status === 'REVIEW REQUIRED';

                return (
                  <tr
                    key={req.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      hasDiscrepancy ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    {/* Clause ID */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 text-xs align-top">
                      <div className="flex flex-col">
                        <span>{req.id}</span>
                        {req.isMandatory ? (
                          <span className="text-[10px] font-semibold text-rose-700 mt-0.5">MANDATORY</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 mt-0.5 font-sans">Optional</span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 align-top">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {req.category}
                      </span>
                    </td>

                    {/* Requirement & Rule */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="text-slate-900 text-sm font-normal leading-relaxed">
                        {req.requirement}
                      </div>

                      {req.remarks && (
                        <div className={`mt-2 p-2.5 rounded text-xs leading-normal border ${
                          hasDiscrepancy
                            ? 'bg-amber-50 text-amber-900 border-amber-200 font-medium'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          <div className="flex items-center gap-1.5 font-semibold uppercase text-[10px] mb-0.5">
                            {hasDiscrepancy && <AlertTriangle className="w-3 h-3 text-amber-700" />}
                            <span>Audit Finding:</span>
                          </div>
                          {req.remarks}
                        </div>
                      )}

                      {/* Evidence citation link */}
                      {req.evidenceSource && (
                        <div className="mt-2 flex items-center space-x-2 text-xs text-slate-500">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-slate-700 truncate">{req.evidenceSource}</span>
                          <button
                            onClick={() => {
                              setSelectedRequirement(req);
                              const matchDoc = bidderDocs.find((d) =>
                                req.evidenceSource?.toLowerCase().includes(d.name.toLowerCase().slice(0, 10))
                              ) || bidderDocs[0];
                              setInspectingDoc(matchDoc);
                            }}
                            className="text-[#0F766E] hover:underline font-medium text-xs shrink-0"
                          >
                            Inspect Excerpt
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Evidence Required */}
                    <td className="py-3.5 px-4 align-top text-slate-600 text-xs leading-relaxed">
                      <div>{req.evidenceRequired}</div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">
                        Method: {req.verificationMethod}
                      </div>
                    </td>

                    {/* Verification Method & Gateway */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-800">
                          {req.id === 'REQ-01' ? 'MCA-21 / Income Tax' :
                           req.id === 'REQ-03' ? 'GSTN API Gateway' :
                           req.id === 'REQ-04' ? 'NSDL PAN Database' :
                           req.id === 'REQ-05' ? 'Udyam Registry' :
                           req.id === 'REQ-06' ? 'OEM Authorization OCR' :
                           req.id === 'REQ-07' ? 'CVC & MoP&NG Debarment' :
                           req.id === 'REQ-08' ? 'MCA-21 CIN Record' :
                           'Document Audit'}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Portal Verified</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center align-top">
                      {req.status === 'PASS' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          PASS
                        </span>
                      ) : req.status === 'REVIEW REQUIRED' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                          DISCREPANCY
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300">
                          FAIL
                        </span>
                      )}
                    </td>

                    {/* Officer Confirmation & Actions */}
                    <td className="py-3.5 px-4 text-right align-top">
                      <div className="flex flex-col items-end space-y-2">
                        <button
                          onClick={() => handleConfirmToggle(req.id)}
                          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                            isConfirmed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${isConfirmed ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span>{isConfirmed ? 'Confirmed' : 'Verify & Sign'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedRequirement(req);
                            setIsClarificationModalOpen(true);
                          }}
                          className="text-xs text-slate-500 hover:text-amber-800 underline font-normal"
                        >
                          Request Clarification
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modals & Side Panels */}
      {/* NOTE: the three modals below were being called with prop names
          that don't exist on the actual components (doc/bidder/onVerify on
          DocumentInspectModal; contradictions/onSend on
          ClarificationGeneratorModal; requirements/breakdown on
          WhatIfSimulatorModal) — a pre-existing bug in the original mock,
          unrelated to the backend integration, but one that breaks the
          TypeScript build. Fixed to match each component's real props
          (same pattern already used correctly in BidderProfileView.tsx). */}
      {inspectingDoc && (
        <DocumentInspectModal
          document={inspectingDoc}
          onClose={() => setInspectingDoc(null)}
        />
      )}

      <ClarificationGeneratorModal
        bidder={activeBidder}
        isOpen={isClarificationModalOpen}
        onClose={() => setIsClarificationModalOpen(false)}
        onSendClarification={() => setIsClarificationModalOpen(false)}
      />

      <WhatIfSimulatorModal
        bidder={activeBidder}
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />
    </div>
  );
};
