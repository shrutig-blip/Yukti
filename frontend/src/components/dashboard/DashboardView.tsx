import React from 'react';
import {
  FileSpreadsheet,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  Calendar,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Tender, Bidder } from '../../types';

declare module 'react/jsx-runtime';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface DashboardViewProps {
  tenders: Tender[];
  bidders: Bidder[];
  onSelectBidder: (bidderId: string) => void;
  onSelectTender: (tenderId: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tenders,
  bidders,
  onSelectBidder,
  onSelectTender,
  onNavigateToTab,
}) => {
  // ---- Derived metrics from real props (replace all hardcoded numbers below) ----
  const activeTendersCount = tenders.length;
  const tendersInEvaluation = tenders.filter(
    (t: Tender) => t.overallStatus === 'Pending Verification' || t.overallStatus === 'Review Required'
  ).length;

  const totalBidders = bidders.length;
  const totalDocsIngested = bidders.reduce((sum: number, b: Bidder) => sum + b.documentsCount, 0);

  const bidersNeedingAction = bidders.filter(
    (b: Bidder) => b.status === 'Pending Review' || b.status === 'Clarification Requested'
  );
  const highPriorityActionCount = bidersNeedingAction.filter(
    (b: Bidder) => b.riskLevel === 'HIGH' || b.riskLevel === 'CRITICAL'
  ).length;

  const criticalAlertsTotal = bidders.reduce((sum: number, b: Bidder) => sum + b.criticalAlertsCount, 0);

  const compliantCount = bidders.filter((b: Bidder) => b.status === 'Qualified').length;
  const reviewRequiredCount = bidders.filter(
    (b: Bidder) => b.status === 'Clarification Requested' || b.status === 'Pending Review'
  ).length;
  const nonCompliantCount = bidders.filter((b: Bidder) => b.status === 'Disqualified').length;
  const pendingCount = bidders.filter((b: Bidder) => b.status === 'Under Verification').length;

  const pct = (n: number) => (totalBidders > 0 ? ((n / totalBidders) * 100).toFixed(1) : '0.0');

  const lowRiskCount = bidders.filter((b: Bidder) => b.riskLevel === 'LOW').length;
  const mediumRiskCount = bidders.filter((b: Bidder) => b.riskLevel === 'MEDIUM').length;
  const highCriticalRiskCount = bidders.filter(
    (b: Bidder) => b.riskLevel === 'HIGH' || b.riskLevel === 'CRITICAL'
  ).length;
  const riskPct = (n: number) => (totalBidders > 0 ? Math.round((n / totalBidders) * 100) : 0);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Hero Context */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#0F766E] bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />
              CPCL Statutory Verification Engine
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              CPCL Manali Refinery Central Procurement
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-tight">
            Procurement Compliance Overview
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl font-normal leading-relaxed">
            Live multi-portal statutory verification, anomaly detection, and human-in-the-loop decision console.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onNavigateToTab('checklist-ai')}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md bg-[#0F766E] text-white hover:bg-teal-800 transition-all shadow-xs"
          >
            <span>Requirement Extraction</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigateToTab('bidder-comparison')}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
          >
            <span>Compare Bidders</span>
          </button>
        </div>
      </div>

      {/* 4 Core High-Level Metric Cards with Generous Breathing Space */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Active Tenders */}
        <div
          onClick={() => onNavigateToTab('tenders')}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-teal-500 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Active Tenders</span>
              <div className="p-2.5 rounded-lg bg-slate-100 text-[#102A43] group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl font-bold text-[#102A43]">{activeTendersCount}</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {tendersInEvaluation} in Evaluation
              </span>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Critical Plant Works</span>
            <span className="font-semibold text-[#0F766E] group-hover:translate-x-1 transition-transform flex items-center gap-1">
              View <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* KPI 2: Bidders Under Verification */}
        <div
          onClick={() => onNavigateToTab('bidders')}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-teal-500 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Bidders Verified</span>
              <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-100 transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl font-bold text-[#102A43]">{totalBidders}</span>
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {bidersNeedingAction.length} In Focus Tender
              </span>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{totalDocsIngested} Docs Ingested</span>
            <span className="font-semibold text-[#0F766E] group-hover:translate-x-1 transition-transform flex items-center gap-1">
              View <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* KPI 3: Pending Reviews */}
        <div
          onClick={() => onSelectBidder('BID-2026-0047')}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Officer Action Req.</span>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-100 transition-colors">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl font-bold text-amber-800">{bidersNeedingAction.length}</span>
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Requires Review
              </span>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{highPriorityActionCount} High-Priority</span>
            <span className="font-semibold text-amber-800 group-hover:translate-x-1 transition-transform flex items-center gap-1">
              Action <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* KPI 4: Critical Alerts */}
        <div
          onClick={() => onSelectBidder('BID-2026-0047')}
          className="bg-white p-6 rounded-xl border border-red-200 shadow-xs hover:border-red-400 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between bg-red-50/10"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Critical Anomaly Flags</span>
              <div className="p-2.5 rounded-lg bg-red-100 text-red-700 group-hover:bg-red-200 transition-colors">
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl font-bold text-red-700">{criticalAlertsTotal}</span>
              <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Turnover / OEM / CVC
              </span>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-red-100 flex items-center justify-between text-xs text-slate-500">
            <span>Yukti Cross-Check</span>
            <span className="font-semibold text-red-700 group-hover:translate-x-1 transition-transform flex items-center gap-1">
              Inspect <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Compliance Overview & Risk Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Compliance Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-[18px] sm:text-[20px] font-semibold text-slate-900">
                Compliance Standing
              </h2>
              <p className="text-sm text-slate-500 mt-0.5 font-normal">
                Qualification status across {totalBidders} active procurement evaluations
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
              {totalBidders} Bidders
            </span>
          </div>

          {/* Segmented Bar with Clean Spacing */}
          <div className="space-y-2">
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: `${pct(compliantCount)}%` }} className="bg-[#15803D]" title={`Compliant (${compliantCount})`} />
              <div style={{ width: `${pct(reviewRequiredCount)}%` }} className="bg-[#B7791F]" title={`Review Required (${reviewRequiredCount})`} />
              <div style={{ width: `${pct(nonCompliantCount)}%` }} className="bg-[#B91C1C]" title={`Non-Compliant (${nonCompliantCount})`} />
              <div style={{ width: `${pct(pendingCount)}%` }} className="bg-[#0F766E]" title={`Pending (${pendingCount})`} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>Verified Compliant (59.5%)</span>
              <span>Pending / Discrepancy (40.5%)</span>
            </div>
          </div>

          {/* Breakdown Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-[#15803D]" />
                <span>Compliant</span>
              </div>
              <div className="text-2xl font-bold text-emerald-900 mt-1">28</div>
              <div className="text-xs text-emerald-700 font-medium">59.5%</div>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-800">
                <span className="w-2 h-2 rounded-full bg-[#B7791F]" />
                <span>Review Req.</span>
              </div>
              <div className="text-2xl font-bold text-amber-900 mt-1">11</div>
              <div className="text-xs text-amber-700 font-medium">23.4%</div>
            </div>

            <div className="p-3.5 rounded-lg bg-red-50/70 border border-red-200">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-red-800">
                <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />
                <span>Discrepancy</span>
              </div>
              <div className="text-2xl font-bold text-red-900 mt-1">5</div>
              <div className="text-xs text-red-700 font-medium">10.6%</div>
            </div>

            <div className="p-3.5 rounded-lg bg-teal-50/70 border border-teal-200">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-teal-800">
                <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
                <span>Pending</span>
              </div>
              <div className="text-2xl font-bold text-teal-900 mt-1">3</div>
              <div className="text-xs text-teal-700 font-medium">6.5%</div>
            </div>
          </div>
        </div>

        {/* Adaptive Risk Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-[18px] sm:text-[20px] font-semibold text-slate-900">
                Yukti Risk Radar
              </h2>
              <p className="text-sm text-slate-500 mt-0.5 font-normal">
                Weighted risk model prioritizing critical failure flags over gross averages
              </p>
            </div>
            <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
              Adaptive Algorithm
            </span>
          </div>

          <div className="space-y-4">
            {/* Low Risk */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center space-x-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>Low Risk (Verified & Clean)</span>
                </span>
                <span className="text-slate-900 font-semibold">{lowRiskCount} Bidders ({riskPct(lowRiskCount)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${riskPct(lowRiskCount)}%` }} />
              </div>
            </div>

            {/* Medium Risk */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center space-x-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Medium Risk (Minor Expiry / Syntax Variation)</span>
                </span>
                <span className="text-slate-900 font-semibold">{mediumRiskCount} Bidders ({riskPct(mediumRiskCount)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${riskPct(mediumRiskCount)}%` }} />
              </div>
            </div>

            {/* High / Critical Risk */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center space-x-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  <span>High / Critical Risk (Turnover Inflation / OEM Expiry)</span>
                </span>
                <span className="text-red-700 font-semibold">{highCriticalRiskCount} Bidders ({riskPct(highCriticalRiskCount)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 rounded-full" style={{ width: `${riskPct(highCriticalRiskCount)}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>High-risk bids trigger mandatory justification before qualification.</span>
            <span className="font-semibold text-[#0F766E]">Rule 1 Enforced</span>
          </div>
        </div>
      </div>

      {/* Critical Attention Required & Recent Verification Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Critical Attention Required (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-red-100 text-red-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-slate-900">
                  Critical Attention Flags
                </h2>
                <p className="text-sm text-slate-500 font-normal">
                  Yukti detected high-severity issues requiring immediate Procurement Officer review
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded">
               {bidders.filter((b) => b.criticalAlertsCount > 0).length} Unresolved
            </span>
          </div>

          <div className="space-y-3.5">
            {bidders.filter((b) => b.criticalAlertsCount > 0).length === 0 ? (
  <p className="text-sm text-slate-500 py-4 text-center">
    No critical alerts at this time.
  </p>
) : (
  bidders
    .filter((b) => b.criticalAlertsCount > 0)
    .slice(0, 3)
    .map((b) => (
      <div
        key={b.id}
        onClick={() => onSelectBidder(b.id)}
        className="p-4 rounded-lg border border-red-200 bg-red-50/40 hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-red-800">
                {b.criticalAlertsCount} Critical Alert{b.criticalAlertsCount > 1 ? 's' : ''}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-200 text-red-900">
                {b.riskLevel}
              </span>
            </div>
            <div className="text-xs text-slate-800">
              Bidder: <strong className="font-semibold">{b.name}</strong> ({b.id})
            </div>
            <div className="text-xs text-slate-600 pt-0.5">
              {b.discrepanciesCount} discrepancy(ies) found across {b.documentsCount} documents.
            </div>
          </div>
          <span className="text-xs font-bold text-red-700 group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0 pt-1">
            Examine <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    ))
)}
          </div>
        </div>

        {/* Recent Multi-Portal Verification Activity (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-[18px] sm:text-[20px] font-semibold text-slate-900">
                Multi-Portal Live Activity
              </h2>
              <p className="text-sm text-slate-500 font-normal">
                Automated statutory cross-checks in real time
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('audit-trail')}
              className="text-xs font-semibold text-[#0F766E] hover:underline"
            >
              Full Log →
            </button>
          </div>

          <div className="space-y-3">
            {/* Item 1 */}
            <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">ABC Engineering Pvt. Ltd.</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  GSTN MATCH
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Active GST verified via GSTN API
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-between font-mono">
                <span>09 Sep, 14:32 IST</span>
                <span>VER-GST-84721</span>
              </div>
            </div>

            {/* Item 2 */}
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/20 hover:bg-amber-50 transition-colors">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">Bharat Industrial Systems</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  OEM REVIEW
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                OEM authorization tier gap detected
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-between font-mono">
                <span>09 Sep, 11:15 IST</span>
                <span>VER-OEM-44102</span>
              </div>
            </div>

            {/* Item 3 */}
            <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">Zenith Infrastructure Ltd.</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  CVC CLEAR
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Debarment check clean across CVC & GeM
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-between font-mono">
                <span>08 Sep, 16:45 IST</span>
                <span>VER-DEBAR-0019</span>
              </div>
            </div>

            {/* Item 4 */}
            <div className="p-3 rounded-lg border border-red-200 bg-red-50/30 hover:bg-red-50 transition-colors">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">ABC Engineering Pvt. Ltd.</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                  MCA MISMATCH
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                ₹18.4 Cr declared vs ₹12.7 Cr audited in MCA-21
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-between font-mono">
                <span>09 Sep, 14:34 IST</span>
                <span>VER-MCA-99120</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tenders Quick Table with Clean Alignment */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-[18px] sm:text-[20px] font-semibold text-slate-900">
              Priority Tenders in Evaluation
            </h2>
            <p className="text-sm text-slate-500 font-normal">
              Select tender to inspect extracted compliance requirements and active submissions
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('tenders')}
            className="text-xs font-semibold text-[#0F766E] hover:underline"
          >
            View All Tenders →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Tender ID</th>
                <th className="py-3 px-4">Tender Title</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Bidders</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenders.map((tender) => (
                <tr
                  key={tender.id}
                  className="hover:bg-slate-50/90 cursor-pointer transition-colors"
                  onClick={() => onSelectTender(tender.id)}
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 text-xs">
                    {tender.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{tender.title}</div>
                    <div className="text-xs text-slate-500 font-mono">Est: {tender.estimatedValue}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-sm">{tender.department}</td>
                  <td className="py-3.5 px-4 text-slate-600 text-sm whitespace-nowrap">{tender.deadline}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 text-sm">{tender.biddersCount} bids</span>
                    <div className="text-xs text-slate-500">
                      {tender.verifiedCount} verified • {tender.pendingCount} pending
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                        tender.overallStatus === 'Compliant'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {tender.overallStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTender(tender.id);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-[#0F766E] bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 transition-colors"
                    >
                      Open Tender →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
