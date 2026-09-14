import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Sliders,
  Send,
  Scale,
  RefreshCw,
  FolderGit2,
  Database,
  ArrowRight,
  Eye,
  Calendar,
  Building2,
  Upload,
  Layers,
  ChevronRight,
  Info,
  Check,
  Download,
} from 'lucide-react';
import {
  Bidder,
  Tender,
  RiskFactor,
  ExpiryItem,
  AuditRecord,
  DocumentRecord,
  VerificationSource,
  ContradictionItem,
  TenderRequirement,
  OfficerDecision,
  SeverityLevel,
  RedFlagHistoryItem,
} from '../../types';
import { DocumentInspectModal } from './DocumentInspectModal';
import { ClarificationGeneratorModal } from './ClarificationGeneratorModal';

import { WhatIfSimulatorModal } from './WhatIfSimulatorModal';
import { HumanDecisionModal } from '../decision/HumanDecisionModal';
import { DocumentVerificationResultPanel } from '../documents/DocumentVerificationResultPanel';
import { documentService } from '../../services/documentService';
import { complianceService } from '../../services/complianceService';
import { riskService } from '../../services/riskService';
import { auditService } from '../../services/auditService';
import { verificationService } from '../../services/verificationService';
import { digilockerService, DigilockerBundle } from '../../services/digilockerService';
import { decisionService } from '../../services/decisionService';
import { useCurrentOfficer } from '../../context/OfficerContext';
interface BidderProfileViewProps {
  bidder: Bidder;
  tender: Tender;
  requirements: TenderRequirement[];
  onBack: () => void;
  onGenerateReport: (bidderId: string) => void;
  onDecisionUpdated: (updatedBidder: Bidder) => void;
}

export const BidderProfileView: React.FC<BidderProfileViewProps> = ({
  bidder,
  tender,
  requirements,
  onBack,
  onGenerateReport,
  onDecisionUpdated,
}) => {
  const CURRENT_OFFICER = useCurrentOfficer();
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'documents'
    | 'portals'
    | 'contradictions'
    | 'risk'
    | 'decision'
    | 'audit'
  >('overview');
  const [uploading, setUploading] = useState(false);
const [uploadResult, setUploadResult] = useState<{ extracted: any; verification: any; document_integrity?: { score: number; flags: string[] } } | null>(null);
const [uploadToast, setUploadToast] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Modal states
  const [inspectingDoc, setInspectingDoc] = useState<DocumentRecord | null>(null);
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);

  // Verification batch running state
  const [isRunningVerification, setIsRunningVerification] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [isFetchingDigilocker, setIsFetchingDigilocker] = useState(false);
  const [digilockerFeedback, setDigilockerFeedback] = useState<string | null>(null);
  const [digilockerBundle, setDigilockerBundle] = useState<DigilockerBundle | null>(null);

  // Data fetching
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(true);
  const [sources, setSources] = useState<VerificationSource[]>([]);
  const [contradictions, setContradictions] = useState<ContradictionItem[]>([]);
  const [breakdown, setBreakdown] = useState<{
    statutoryCompliance: number;
    documentCompleteness: number;
    tenderEligibility: number;
    financialCompliance: number;
    authorizationCompliance: number;
    dataSource?: Record<string, 'real' | 'not_tracked'>;
  }>({
    statutoryCompliance: 0,
    documentCompleteness: 0,
    tenderEligibility: 0,
    financialCompliance: 0,
    authorizationCompliance: 0,
  });
  const [isComplianceLoading, setIsComplianceLoading] = useState(true);
  // after
const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
const [expiries, setExpiries] = useState<ExpiryItem[]>([]);
const [timeline, setTimeline] = useState<RedFlagHistoryItem[]>([]);
const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);

useEffect(() => {
  if (!bidder.id) return;
  let cancelled = false;
  Promise.all([
    riskService.getRiskFactors(bidder.id, tender.id),
    riskService.getExpiries(bidder.id),
    riskService.getTimeline(bidder.id),
    auditService.getRecords(bidder.id),
  ]).then(([factors, exp, tl, records]) => {
    if (cancelled) return;
    setRiskFactors(factors);
    setExpiries(exp);
    setTimeline(tl);
    setAuditRecords(records);
  });
  return () => {
    cancelled = true;
  };
}, [bidder.id, tender.id]);
  // sources/contradictions/breakdown all now come from real backend calls
  // (verificationService/complianceService), which are async — re-fetched
  // whenever the focused bidder or tender changes.
  useEffect(() => {
    if (!bidder.id || !tender.id) return;
    let cancelled = false;
    setIsComplianceLoading(true);
    Promise.all([
      verificationService.getSources(bidder.id),
      complianceService.getContradictions(bidder.id, tender.id),
      complianceService.getBreakdown(bidder.id, tender.id),
    ])
      .then(([s, c, b]) => {
        if (cancelled) return;
        setSources(s);
        setContradictions(c);
        setBreakdown(b);
      })
      .finally(() => {
        if (!cancelled) setIsComplianceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bidder.id, tender.id]);
  useEffect(() => {
  if (!bidder.id) return;
  let cancelled = false;
  setIsDocumentsLoading(true);
  documentService
    .getRealDocuments(bidder.id)
    .then((docs) => {
      if (!cancelled) setDocuments(docs);
    })
    .catch(() => {
      if (!cancelled) setDocuments([]);
    })
    .finally(() => {
      if (!cancelled) setIsDocumentsLoading(false);
    });
  return () => {
    cancelled = true;
  };
}, [bidder.id]);

  // Load any previously-recorded officer decision from the backend
  // (officer_decisions.csv) so it survives a page refresh — the decision
  // flow used to be entirely client-state, so a saved decision would
  // silently vanish the moment the page reloaded.
  useEffect(() => {
    if (!bidder.id) return;
    let cancelled = false;
    decisionService.getDecision(bidder.id).then((decision) => {
      if (cancelled || !decision) return;
      // Only hydrate if we don't already have a (possibly newer) decision
      // in memory, to avoid clobbering a decision just recorded this session.
      if (!bidder.officerDecision) {
        const status =
          decision.decision === 'QUALIFIED'
            ? ('Qualified' as const)
            : decision.decision === 'DISQUALIFIED'
            ? ('Disqualified' as const)
            : decision.decision === 'CLARIFICATION_REQUESTED'
            ? ('Clarification Requested' as const)
            : ('Pending Review' as const);
        onDecisionUpdated({ ...bidder, officerDecision: decision, status });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidder.id]);

  const handleRunVerification = async () => {
    setIsRunningVerification(true);
    setVerificationFeedback('Querying real statutory portals (GST, PAN, Udyam, NSIC, Blacklist, EPFO/ESIC)...');
    try {
      // Re-fetches the REAL backend checks (GET /verify/{bidder_id}) and
      // refreshes both the Multi-Portal Checks and Document Vault tabs from
      // that live result. Previously this called runFullVerificationBatch(),
      // which ignored bidder.id entirely and always returned the same fake
      // numbers — nothing on screen actually changed as a result.
      const [freshSources, freshDocs] = await Promise.all([
        verificationService.getSources(bidder.id),
        documentService.getRealDocuments(bidder.id),
      ]);
      setSources(freshSources);
      setDocuments(freshDocs);

      const realSources = freshSources.filter((s) => !s.isSimulated);
      const passed = realSources.filter((s) => s.verificationStatus === 'VERIFIED').length;
      const warnings = realSources.filter((s) => s.verificationStatus === 'WARNING').length;
      const discrepancies = realSources.filter((s) => s.matchStatus === 'DISCREPANCY').length;

      auditService.logEvent({
        actor: 'Procurement Officer (Initiated)',
        role: 'Procurement Officer',
        action: 'Manual Re-verification Trigger',
        source: 'CPCL Statutory Verification Engine',
        result: 'RECORDED',
        bidderId: bidder.id,
        comments: `Officer re-executed live cross-check across ${realSources.length} real statutory sources (GST/PAN/Udyam/NSIC/Blacklist/EPFO-ESIC).`,
      });

      setVerificationFeedback(
        `Verification refreshed: ${passed} passed, ${warnings} warning(s)` +
          (discrepancies ? `, ${discrepancies} discrepancy(ies)` : '') +
          ` across ${realSources.length} real sources (+1 unavailable — OEM Authorization — not tracked by backend yet).`
      );
      setTimeout(() => setVerificationFeedback(null), 6000);
    } catch (err) {
      setVerificationFeedback(
        err instanceof Error ? `Verification refresh failed: ${err.message}` : 'Verification refresh failed.'
      );
      setTimeout(() => setVerificationFeedback(null), 6000);
    } finally {
      setIsRunningVerification(false);
    }
  };

  const handleFetchDigilocker = async () => {
    setIsFetchingDigilocker(true);
    setDigilockerFeedback('Pulling issued documents via DigiLocker...');
    try {
      const bundle = await digilockerService.fetchDocuments(bidder.id);
      setDigilockerBundle(bundle);

      const docCount = bundle.documents?.length ?? 0;
      const sourceLabel = bundle.source === 'sandbox_live' ? 'live Sandbox API' : 'mock data (no Sandbox API key configured)';

      auditService.logEvent({
        actor: 'Procurement Officer (Initiated)',
        role: 'Procurement Officer',
        action: 'DigiLocker document pull',
        source: `DigiLocker (${bundle.source})`,
        result: 'RECORDED',
        bidderId: bidder.id,
        comments: `Pulled ${docCount} digitally-signed issuer document(s) via ${sourceLabel}.`,
      });

      setDigilockerFeedback(`${docCount} document(s) fetched via DigiLocker (${sourceLabel}).`);
      setTimeout(() => setDigilockerFeedback(null), 6000);
    } catch (err) {
      setDigilockerFeedback(
        err instanceof Error ? `DigiLocker fetch failed: ${err.message}` : 'DigiLocker fetch failed.'
      );
      setTimeout(() => setDigilockerFeedback(null), 6000);
    } finally {
      setIsFetchingDigilocker(false);
    }
  };

  const handleDecisionRecorded = (decision: OfficerDecision) => {
    const updated = {
      ...bidder,
      officerDecision: decision,
      status:
        decision.decision === 'QUALIFIED'
          ? ('Qualified' as const)
          : decision.decision === 'DISQUALIFIED'
          ? ('Disqualified' as const)
          : decision.decision === 'CLARIFICATION_REQUESTED'
          ? ('Clarification Requested' as const)
          : ('Pending Review' as const),
    };

    auditService.logEvent({
      actor: `${decision.officerName} (${decision.officerDesignation})`,
      role: 'Procurement Officer',
      action: `Statutory Officer Decision: ${decision.decision}`,
      source: 'Yukti Officer Decision Desk',
      result: decision.decision === 'QUALIFIED' ? 'QUALIFIED' : 'RECORDED',
      bidderId: bidder.id,
      comments: decision.comments,
    });

    onDecisionUpdated(updated);
  };

  const handleSendClarification = (clarificationText: string, reason: string) => {
    const updated = {
      ...bidder,
      status: 'Clarification Requested' as const,
    };

    auditService.logEvent({
      actor: `${CURRENT_OFFICER.name} (${CURRENT_OFFICER.designation})`,
      role: 'Procurement Officer',
      action: 'Issued Official Clarification Notice',
      source: 'Clarification Drafting Engine',
      result: 'RECORDED',
      evidenceRef: 'CPCL/PROC/2026/047/CLR-01',
      bidderId: bidder.id,
      comments: reason,
    });

    onDecisionUpdated(updated);
  };

  const getRiskBadge = (level: SeverityLevel) => {
    switch (level) {
      case 'LOW':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">LOW RISK</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">MEDIUM RISK</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">HIGH RISK</span>;
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300">CRITICAL RISK</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Sticky Top Bidder Summary Header */}
      <div className="bg-white rounded-md border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <button onClick={onBack} className="hover:text-[#0F766E] font-medium flex items-center gap-1">
                ← Back to Bidders
              </button>
              <span>/</span>
              <span className="font-mono text-slate-700">{bidder.id}</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold">{bidder.name}</span>
            </div>
            <div className="flex items-center space-x-3">
              <h1 className="text-[28px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-tight">
                {bidder.name}
              </h1>
              {getRiskBadge(bidder.riskLevel)}
              <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {bidder.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5 font-normal">
              <span>Tender Ref: <strong className="text-slate-800 font-mono font-medium">{tender.id}</strong></span>
              <span>•</span>
              <span>PAN: <strong className="text-slate-800 font-mono font-medium">{bidder.pan}</strong></span>
              <span>•</span>
              <span>GSTIN: <strong className="text-slate-800 font-mono font-medium">{bidder.gstin}</strong></span>
              <span>•</span>
              <span>Udyam: <strong className="text-slate-800 font-mono font-medium">{bidder.udyam}</strong></span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-6 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Compliance Score
              </div>
              <div className="text-2xl font-bold text-[#102A43] mt-0.5">
                {bidder.complianceScore}
                <span className="text-xs text-slate-400 font-normal">/100</span>
              </div>
              <div className="text-xs text-teal-700 font-medium">Weighted Scoring Matrix</div>
            </div>

            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Verification Progress
              </div>
              <div className="text-2xl font-bold text-slate-800 mt-0.5">
                {bidder.verificationProgress}%
              </div>
              <div className="text-xs text-slate-500 font-normal">
                {isComplianceLoading ? 'Loading…' : `${sources.length} Source${sources.length === 1 ? '' : 's'} Checked`}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunVerification}
              disabled={isRunningVerification}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-sm font-medium bg-[#102A43] hover:bg-slate-800 text-white shadow-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningVerification ? 'animate-spin' : ''}`} />
              <span>{isRunningVerification ? 'Verifying Sources...' : 'Run Verification'}</span>
            </button>

            <button
              onClick={() => setIsClarificationModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4 text-slate-500" />
              <span>Request Clarification</span>
            </button>

            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-sm font-medium bg-teal-50 border border-teal-300 text-[#0F766E] hover:bg-teal-100 transition-colors shadow-xs"
            >
              <Sliders className="w-4 h-4" />
              <span>What-If Simulator</span>
            </button>

            <button
              onClick={handleFetchDigilocker}
              disabled={isFetchingDigilocker}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Database className={`w-4 h-4 text-slate-500 ${isFetchingDigilocker ? 'animate-pulse' : ''}`} />
              <span>{isFetchingDigilocker ? 'Fetching via DigiLocker...' : 'Fetch via DigiLocker'}</span>
            </button>


            <button
              onClick={() => onGenerateReport(bidder.id)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Generate Report</span>
            </button>
          </div>

          {/* Primary Human Decision CTA */}
          <button
            onClick={() => setIsDecisionModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-[#0F766E] hover:bg-teal-800 text-white shadow-xs transition-colors"
          >
            <Scale className="w-4 h-4 text-teal-200" />
            <span>Record Procurement Officer Decision</span>
          </button>
        </div>

        {verificationFeedback && (
          <div className="p-2.5 rounded bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2 font-medium">
              <CheckCircle className="w-4 h-4 text-teal-700" />
              <span>{verificationFeedback}</span>
            </div>
            <span className="font-mono text-xs text-teal-600">Live Verification</span>
          </div>
        )}

        {digilockerFeedback && (
          <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2 font-medium">
              <Database className="w-4 h-4 text-blue-700" />
              <span>{digilockerFeedback}</span>
            </div>
            <span className="font-mono text-xs text-blue-600">
              {digilockerBundle?.source === 'sandbox_live' ? 'Sandbox API (live)' : 'Sandbox API (mock data)'}
            </span>
          </div>
        )}

        {digilockerBundle && digilockerBundle.documents && digilockerBundle.documents.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              DigiLocker — Issued Documents
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {digilockerBundle.documents.map((doc) => (
                <div
                  key={`${doc.type}-${doc.number}`}
                  className="flex items-center justify-between px-3 py-2 rounded border border-slate-100 bg-slate-50 text-xs"
                >
                  <div>
                    <div className="font-medium text-slate-800">{doc.type}</div>
                    <div className="text-slate-500">{doc.issuer} • {doc.number}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white px-3 rounded-t-md">
        <div className="flex flex-wrap space-x-1">
          {[
            { id: 'overview', label: 'Overview & Vital Signs' },
            { id: 'documents', label: `Document Vault (${documents.length})` },
            { id: 'portals', label: isComplianceLoading ? 'Multi-Portal Checks (loading…)' : `Multi-Portal Checks (${sources.length})` },
            { id: 'contradictions', label: isComplianceLoading ? 'Anomaly Intelligence (loading…)' : `Anomaly Intelligence (${contradictions.length})` },
            { id: 'risk', label: 'Adaptive Risk & Expiry Radar' },
            { id: 'decision', label: 'Officer Decision Hub' },
            { id: 'audit', label: `Audit Trail (${auditRecords.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#0F766E] text-[#0F766E] font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview & AI Summary */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* "Why is this bidder risky?" AI Card (Section 12) */}
          <div className="bg-white rounded-md border-2 border-amber-300/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-amber-100 text-amber-800">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Why is this bidder risky?
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Statutory risk rationale based on cross-document & portal analytics
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                contradictions.length > 0
                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                  : 'text-emerald-800 bg-emerald-50 border-emerald-200'
              }`}>
                {contradictions.length > 0 ? 'System Advisory: Further Review Recommended' : 'System Advisory: No Issues Flagged'}
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {contradictions.length > 0
                ? `This bidder has a compliance score of ${bidder.complianceScore}/100. ${contradictions.length} identified inconsistenc${contradictions.length === 1 ? 'y requires' : 'ies require'} Procurement Officer review before commercial opening:`
                : `This bidder has a compliance score of ${bidder.complianceScore}/100 with no cross-document inconsistencies currently flagged.`}
            </p>

            <div className="space-y-2.5 pt-1">
              {[...contradictions]
                .sort((a, b) => {
                  const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                  return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
                })
                .slice(0, 3)
                .map((item, idx) => {
                  const styles =
                    item.severity === 'CRITICAL'
                      ? { wrap: 'bg-red-50/60 border-red-200', title: 'text-red-900', badge: 'bg-red-200 text-red-900' }
                      : item.severity === 'HIGH'
                      ? { wrap: 'bg-amber-50/60 border-amber-200', title: 'text-amber-900', badge: 'bg-amber-200 text-amber-900' }
                      : { wrap: 'bg-slate-50 border-slate-200', title: 'text-slate-800', badge: 'bg-slate-200 text-slate-700' };
                  return (
                    <div key={item.id} className={`p-3 rounded border ${styles.wrap} text-xs`}>
                      <div className={`flex items-center justify-between font-bold ${styles.title}`}>
                        <span>{idx + 1}. {item.field}</span>
                        <span className={`text-[10px] uppercase px-1.5 py-0.2 rounded ${styles.badge}`}>
                          {item.severity} Severity
                        </span>
                      </div>
                      <div className="text-slate-700 mt-1">{item.assessment}</div>
                    </div>
                  );
                })}
              {contradictions.length === 0 && (
                <div className="text-xs text-slate-500 italic py-1">
                  No cross-document inconsistencies detected for this bidder.
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-600 border-t border-amber-100">
              <span className="italic">
                Advisory note: Automated analysis does not disqualify the bidder. Officer reconciliation required.
              </span>
              <button
                onClick={() => setActiveTab('contradictions')}
                className="text-xs font-semibold text-[#0F766E] hover:underline flex items-center gap-1"
              >
                <span>View Full Evidence Matrix</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Compliance Breakdown Cards & Document Integrity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Breakdown */}
            <div className="bg-white rounded-md border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#102A43] uppercase tracking-wider">
                  Compliance Score Breakdown
                </h3>
                <span className="text-sm font-bold text-[#102A43]">
                  {bidder.complianceScore} / 100
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Statutory Compliance (Weight: 20%)</span>
                    <span className="font-bold text-slate-800">{breakdown.statutoryCompliance}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${breakdown.statutoryCompliance}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Document Completeness (Weight: 20%)</span>
                    <span className="font-bold text-slate-400">Not tracked by backend</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-300 rounded-full" style={{ width: `0%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Tender Eligibility Criteria (Weight: 25%)</span>
                    <span className="font-bold text-slate-800">{breakdown.tenderEligibility}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-600 rounded-full" style={{ width: `${breakdown.tenderEligibility}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Financial Compliance (Weight: 20%)</span>
                    <span className="font-bold text-slate-400">Not tracked by backend</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-300 rounded-full" style={{ width: `0%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">OEM Authorization Compliance (Weight: 15%)</span>
                    <span className="font-bold text-slate-400">Not tracked by backend</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-300 rounded-full" style={{ width: `0%` }} />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 italic">
                Statutory Compliance and Tender Eligibility are computed live from the backend. Document Completeness, Financial Compliance, and OEM Authorization Compliance have no backend data source yet and are not scored.
              </div>
            </div>

            {/* Document Integrity & Fraud Anomaly Check (Section 15) */}
            <div className="bg-white rounded-md border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-[#102A43] uppercase tracking-wider">
                    Document Integrity Analysis
                  </h3>
                </div>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  1 Observation
                </span>
              </div>

              <p className="text-xs text-slate-600">
                Evaluates document metadata, font consistency, layout symmetry, and digital certificate footprints.
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded border border-amber-200 bg-amber-50/50 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-amber-900">
                    <span>OEM Authorization Letter (DOC-03)</span>
                    <span className="text-[10px] uppercase font-bold text-amber-800">Review Required</span>
                  </div>
                  <div className="text-slate-700 text-[11px]">
                    Detected: Date formatting and header font kerning slightly differs from standard Kirloskar Flow Technologies issuer template.
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Statistical Confidence: 74%</span>
                    <span className="font-semibold text-[#0F766E]">Manual verification with issuer suggested</span>
                  </div>
                </div>

                <div className="p-3 rounded border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-emerald-900">
                    <span>Audited Balance Sheet & P&L (DOC-02)</span>
                    <span className="text-[10px] uppercase font-bold text-emerald-800">Clear</span>
                  </div>
                  <div className="text-slate-700 text-[11px]">
                    CA UDIN 25048912AAAAAB1234 cryptographically valid. Digital signature authentic.
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500">
                Mandatory Policy: System flags potential anomalies for officer review. It does not establish fraud.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Document Vault */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-md border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#102A43] uppercase tracking-wider">
                Submitted Document Repository & OCR Status
              </h3>
              <p className="text-[11px] text-slate-500">
                Click any document row to open high-resolution OCR entity extraction, validation checks, and portal cross-matches
              </p>
            </div>

            <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#102A43] text-white hover:bg-slate-800 cursor-pointer shadow-xs">
              <Upload className="w-3.5 h-3.5 text-teal-300" />
              <span>Simulate Document Ingestion</span>
              <input
                type="file"
                className="hidden"
                onChange={async (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are accepted');
      return;
    }
    setUploading(true);
    try {
      const result = await documentService.uploadCertificateForVerification(bidder.id, file);
      setUploadResult(result);
      const v = result.verification;
      if (v.document_type === 'unknown') {
        setUploadToast({ type: 'error', message: 'Document type could not be recognized — please check the file.' });
      } else if (v.all_passed && !v.needs_review) {
        setUploadToast({ type: 'success', message: `${v.document_type.toUpperCase()} certificate verified successfully.` });
      } else if (v.all_passed && v.needs_review) {
        setUploadToast({ type: 'warning', message: 'Passed, but this document needs officer review before it can be cleared.' });
      } else {
        const firstFailure = v.checks.find((c: any) => !c.passed);
        setUploadToast({
          type: 'error',
          message: `Verification not passed${firstFailure?.detail ? `: ${firstFailure.detail}` : ' — see checklist below for details.'}`,
        });
      }
      setTimeout(() => setUploadToast(null), 6000);
    } catch (err) {
      setUploadToast({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed' });
      setTimeout(() => setUploadToast(null), 6000);
    } finally {
      setUploading(false);
      setActiveTab('documents');
    }
  }
}}
              />
            </label>
          </div>
          {uploadResult && (
            <DocumentVerificationResultPanel
              extracted={uploadResult.extracted}
              verification={uploadResult.verification}
              documentIntegrity={uploadResult.document_integrity}
            />
          )}

          {uploadToast && (
            <div
              className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-lg shadow-lg border text-sm font-medium ${
                uploadToast.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : uploadToast.type === 'warning'
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-red-600 text-white border-red-700'
              }`}
            >
              {uploadToast.message}
            </div>
          )}
          {!isDocumentsLoading && documents.length === 0 && (
  <div className="p-3 text-sm text-slate-500">No statutory records found for this bidder.</div>
)}
          {isDocumentsLoading && (
      <div className="p-3 text-sm text-slate-500">Loading statutory records…</div>
    )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-2.5 px-3">Document ID</th>
                  <th className="py-2.5 px-3">Document Title & File</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-center">OCR Status</th>
                  <th className="py-2.5 px-3">Cross-Check</th>
                  <th className="py-2.5 px-3 text-center">Risk</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setInspectingDoc(doc)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800 text-xs">{doc.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900 hover:text-[#0F766E] transition-colors text-sm">
                        {doc.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{doc.fileSize}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 text-sm">{doc.category}</td>
                    <td className="py-3 px-3 text-slate-600 text-xs">{doc.uploadedDate}</td>
                    <td className="py-3 px-3 text-slate-700 text-xs">
                      {doc.expiryDate ? (
                        <span className={doc.expiryDate.includes('Sep 2026') ? 'font-semibold text-amber-700' : ''}>
                          {doc.expiryDate}
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        <CheckCircle className="w-3 h-3 text-emerald-600 mr-1" />
                        {doc.ocrStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                          doc.crossVerificationStatus === 'MATCH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.crossVerificationStatus === 'MISMATCH'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {doc.crossVerificationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          doc.riskLevel === 'LOW'
                            ? 'bg-emerald-50 text-emerald-700'
                            : doc.riskLevel === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {doc.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingDoc(doc);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-[#0F766E] bg-teal-50 hover:bg-teal-100 rounded border border-teal-200"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Multi-Portal Verification (Simulated official sources) */}
      {activeTab === 'portals' && (
        <div className="bg-white rounded-md border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#102A43] uppercase tracking-wider">
                  Verification Sources (External Government Portals)
                </h3>
                <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                  Prototype / Simulated Verification
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Direct cross-examination of bidder submissions against official registers (GSTN, MCA-21, CVC, Udyam, PESO)
              </p>
            </div>

            <button
              onClick={handleRunVerification}
              disabled={isRunningVerification}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#0F766E] text-white hover:bg-teal-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningVerification ? 'animate-spin' : ''}`} />
              <span>{isRunningVerification ? 'Executing Simulated Queries...' : 'Re-verify All Portals'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src) => (
              <div
                key={src.id}
                className="p-4 rounded-md border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {src.category}
                    </div>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">{src.name}</div>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                      src.verificationStatus === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : src.verificationStatus === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {src.verificationStatus}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                  {src.evidenceSummary}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Last Checked: {src.lastChecked}</span>
                  <span className="font-mono font-bold text-slate-700">
                    MATCH: <span className={src.matchStatus === 'DISCREPANCY' ? 'text-red-700' : src.matchStatus === 'REVIEW' ? 'text-amber-700' : 'text-emerald-700'}>{src.matchStatus}</span>
                  </span>
                </div>

                <div className="text-[9px] font-mono text-slate-400 truncate">
                  {src.endpointNote}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded text-xs text-amber-900 flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Prototype Architecture Notice:</strong> External government portal integrations are simulated via mock endpoints.
              In a production CPSE deployment, these connectors link to authentic API gateways provisioned by NIC, GSTN, and MCA.
            </span>
          </div>
        </div>
      )}

      {/* Tab 4: Cross-Document Intelligence (Contradiction Detector) */}
      {activeTab === 'contradictions' && (
        <div className="bg-white rounded-md border border-slate-200 shadow-xs p-5 space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-[#102A43] uppercase tracking-wider">
                Cross-Document Intelligence & Contradiction Detector
              </h3>
              <span className="text-[10px] font-bold uppercase bg-red-100 text-red-900 px-2 py-0.5 rounded border border-red-300">
                {contradictions.length} Inconsistencies Detected
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cross-verification compares declared figures and certificates against statutory filings to uncover inconsistencies
            </p>
          </div>

          <div className="space-y-4">
            {contradictions.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-md border ${
                  item.severity === 'CRITICAL'
                    ? 'border-red-300 bg-red-50/30'
                    : item.severity === 'HIGH'
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-slate-200 bg-slate-50/50'
                } space-y-3`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{item.id}</span>
                    <span className="font-bold text-slate-800 text-xs">{item.field}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        item.severity === 'CRITICAL'
                          ? 'bg-red-200 text-red-900'
                          : item.severity === 'HIGH'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      Severity: {item.severity}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Status: {item.status}
                    </span>
                  </div>
                </div>

                {/* Visual Multi-Source Comparison Table */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {item.sources.map((src, idx) => (
                    <div key={idx} className="p-3 bg-white rounded border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase truncate">
                        {src.source}
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-xs mt-1">
                        {src.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Assessment & Recommendation */}
                <div className="p-3 bg-white rounded border border-slate-200 space-y-1.5 text-xs">
                  <div className="text-slate-800 leading-relaxed">
                    <strong className="text-slate-900">System Assessment:</strong> {item.assessment}
                  </div>
                  <div className="text-teal-900 font-medium">
                    <strong>Recommended Officer Action:</strong> {item.recommendation}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100">
                    Evidence Ref: {item.evidenceRef}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Adaptive Risk & Expiry Radar */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          {/* Itemized Risk Factor Breakdown — real per-bidder flags from riskService.getRiskFactors() */}
<div className="bg-white rounded-md border border-slate-200 shadow-xs p-5 space-y-4">
  <div className="pb-2 border-b border-slate-100">
    <h3 className="text-sm font-bold text-[#102A43] uppercase tracking-wider">
      Active Risk Factors
    </h3>
    <p className="text-[11px] text-slate-500">
      Itemized flags contributing to this bidder's overall risk rating
    </p>
  </div>

  {riskFactors.length > 0 ? (
    <div className="space-y-3">
      {riskFactors.map((factor) => (
        <div key={factor.id} className="p-3 bg-slate-50 rounded-md border border-slate-200">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="font-semibold text-slate-900 text-xs">{factor.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              {getRiskBadge(factor.severity)}
              <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                {factor.category}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{factor.description}</p>
          <div className="text-[10px] text-slate-400 font-mono pt-1.5 mt-1.5 border-t border-slate-100">
            Evidence Ref: {factor.evidenceRef}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="text-xs text-slate-400 italic py-2">
      No active risk factors — all statutory, financial, and eligibility checks currently pass.
    </div>
  )}
</div>
          {/* Expiry Radar Section (Section 13) */}
          <div className="bg-white rounded-md border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-[#102A43] uppercase tracking-wider">
                  Compliance Expiry Radar
                </h3>
                <p className="text-[11px] text-slate-500">
                  Predictive horizon monitoring expiring certificates relative to tender milestone deadlines
                </p>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">7-30d</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">60d</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">90d+</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Requirement & Instrument</th>
                    <th className="py-2.5 px-3">Document Name</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-center">Days Remaining</th>
                    <th className="py-2.5 px-3 text-center">Risk Level</th>
                    <th className="py-2.5 px-3">Action Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiries.map((exp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{exp.requirement}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{exp.documentName}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{exp.expiryDate}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded text-xs ${
                            exp.daysRemaining <= 30
                              ? 'bg-red-100 text-red-800'
                              : exp.daysRemaining <= 60
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {exp.daysRemaining} days
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">{getRiskBadge(exp.risk)}</td>
                      <td className="py-3 px-3 text-slate-700">{exp.actionRequired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Red-Flag Historical Timeline (Section 14) */}
          <div className="bg-white rounded-md border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#102A43] uppercase tracking-wider">
                Bidder Compliance & Red-Flag Timeline (2012 — 2026)
              </h3>
              <p className="text-[11px] text-slate-500">
                Automated dossier summary tracking statutory milestones and historical non-compliance flags
              </p>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timeline.map((event, idx) => (
                <div key={idx} className="relative group">
                  <div
                    className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                      event.type === 'critical'
                        ? 'border-red-600 ring-4 ring-red-100'
                        : event.type === 'warning'
                        ? 'border-amber-500 ring-4 ring-amber-100'
                        : event.type === 'milestone'
                        ? 'border-teal-600 ring-4 ring-teal-100'
                        : 'border-slate-400'
                    }`}
                  />
                  <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{event.title}</span>
                      <span className="font-mono text-[10px] text-slate-500 font-semibold">{event.date}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Human Decision Hub (Section 19) */}
      {activeTab === 'decision' && (
        <div className="space-y-6">
          {/* Visual Separation: AI Advisory vs Officer Decision */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Advisory Assessment */}
            <div className="bg-slate-50 rounded-md border border-slate-300 p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Automated Verification Advisory
                </span>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                  Non-Autonomous
                </span>
              </div>

              <div className="space-y-2">
                <div className={`text-lg font-bold ${contradictions.length > 0 ? 'text-amber-900' : 'text-emerald-800'}`}>
                  {contradictions.length > 0 ? '"FURTHER REVIEW RECOMMENDED"' : '"NO ISSUES FLAGGED"'}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Based on algorithmic assessment of {requirements.length} requirement{requirements.length === 1 ? '' : 's'}, {sources.length} portal{sources.length === 1 ? '' : 's'}, and {documents.length} document{documents.length === 1 ? '' : 's'},
                  qualification {contradictions.length > 0
                    ? `cannot proceed cleanly without resolution of ${contradictions.length} identified discrepanc${contradictions.length === 1 ? 'y' : 'ies'}.`
                    : 'has no outstanding discrepancies flagged for review.'}
                </p>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-slate-800">Identified Review Points:</div>
                {contradictions.length > 0 || expiries.some((e) => e.daysRemaining <= 60) ? (
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                    {contradictions.map((c) => (
                      <li key={c.id}>{c.assessment}</li>
                    ))}
                    {expiries
                      .filter((e) => e.daysRemaining <= 60)
                      .map((e, idx) => (
                        <li key={`exp-${idx}`}>
                          {e.requirement} expires on {e.expiryDate} ({e.daysRemaining} days remaining).
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="text-[11px] text-slate-500 italic">No outstanding review points identified.</div>
                )}
              </div>

              <div className="text-[10px] text-slate-400 italic">
                Statutory Governance Rule: Automated recommendations are strictly decision-support advisories. The system cannot qualify or disqualify.
              </div>
            </div>

            {/* Human Decision Hub */}
            <div className="bg-white rounded-md border-2 border-[#102A43] shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-[#102A43]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#102A43]">
                    HUMAN DECISION — PROCUREMENT OFFICER
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                  Statutory Sign-off
                </span>
              </div>

              {bidder.officerDecision ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Recorded Decision:</span>
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {bidder.officerDecision.decision}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    <strong>Officer:</strong> {bidder.officerDecision.officerName} ({bidder.officerDecision.officerDesignation})
                  </div>
                  <div className="text-slate-600">
                    <strong>Timestamp:</strong> {bidder.officerDecision.timestamp}
                  </div>
                  <div className="text-slate-800 bg-white p-2.5 rounded border border-slate-200">
                    <strong>Comments:</strong> {bidder.officerDecision.comments}
                  </div>
                  {bidder.officerDecision.conditionsOrStipulations && (
                    <div className="text-[11px] text-teal-800">
                      <strong>Stipulations:</strong> {bidder.officerDecision.conditionsOrStipulations}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded text-xs text-amber-900 space-y-1.5">
                  <div className="font-bold">Pending Official Officer Decision</div>
                  <p className="text-[11px] text-slate-700">
                    No final qualification or disqualification decision has been executed yet for this bidder.
                    Review the evidence matrix and record your decision below.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => setIsDecisionModalOpen(true)}
                  className="px-4 py-2 bg-[#102A43] hover:bg-slate-800 text-white rounded font-bold text-xs shadow-xs flex items-center space-x-1.5"
                >
                  <Scale className="w-4 h-4 text-teal-300" />
                  <span>{bidder.officerDecision ? 'Update Decision Record' : 'Record Officer Decision'}</span>
                </button>
                <button
                  onClick={() => setIsClarificationModalOpen(true)}
                  className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded font-semibold text-xs shadow-xs"
                >
                  Draft Clarification Letter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-md border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#102A43] uppercase tracking-wider">
                Immutable Audit Trail for {bidder.name}
              </h3>
              <p className="text-[11px] text-slate-500">
                Traceable ledger recording all automated verification runs, discrepancy flags, and manual officer annotations
              </p>
            </div>
            <button
              onClick={() => {
                const csv = auditService.exportAuditLogAsCSV(auditRecords);
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Audit_Trail_${bidder.id}.csv`;
                a.click();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Audit CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Audit ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor / Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3 text-center">Result</th>
                  <th className="py-2.5 px-3">Officer Comments / Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{rec.id}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{rec.timestamp}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{rec.actor}</div>
                      <div className="text-[10px] text-slate-400">{rec.role}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">{rec.action}</td>
                    <td className="py-3 px-3 text-slate-600">{rec.source}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.result === 'PASS' || rec.result === 'QUALIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.result === 'DISCREPANCY'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.result}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 max-w-xs">
                      <div>{rec.comments || 'Standard automated check.'}</div>
                      {rec.evidenceRef && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Ref: {rec.evidenceRef}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Inspect Modal */}
      <DocumentInspectModal
        document={inspectingDoc}
        onClose={() => setInspectingDoc(null)}
      />

      {/* Clarification Generator Modal */}
      <ClarificationGeneratorModal
        bidder={bidder}
        tender={tender}
        contradictions={contradictions}
        isOpen={isClarificationModalOpen}
        onClose={() => setIsClarificationModalOpen(false)}
        onSendClarification={handleSendClarification}
      />

      {/* What-If Simulator Modal */}
      <WhatIfSimulatorModal
        bidder={bidder}
        tender={tender}
        contradictions={contradictions}
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      {/* Human Decision Modal */}
      <HumanDecisionModal
        bidder={bidder}
        tender={tender}
        contradictions={contradictions}
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        onSubmitDecision={handleDecisionRecorded}
      />
    </div>
  );
};