import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Bidder, SeverityLevel } from '../../types';

interface BiddersViewProps {
  bidders: Bidder[];
  onSelectBidder: (id: string) => void;
  onCompareBidders: () => void;
  selectedTenderId?: string;
}

export const BiddersView: React.FC<BiddersViewProps> = ({
  bidders,
  onSelectBidder,
  onCompareBidders,
  selectedTenderId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = bidders.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.udyam.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = riskFilter === 'ALL' || b.riskLevel === riskFilter;
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesTender = !selectedTenderId || b.tenderId === selectedTenderId;

    return matchesSearch && matchesRisk && matchesStatus && matchesTender;
  });

  const getRiskBadge = (level: SeverityLevel) => {
    switch (level) {
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            LOW
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            MEDIUM
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
            HIGH
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            CRITICAL
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1 font-medium">
            <span>Evaluation Desk</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Bidders Registry</span>
          </div>
          <h1 className="text-[28px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-tight">
            Bidder Compliance & Verification Registry
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-normal leading-relaxed">
            Real-time compliance evaluations, cross-document discrepancy flags, and statutory portal records.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onCompareBidders}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span>Side-by-Side Comparison</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-md border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bidder name, PAN, GSTIN, Udyam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <span className="text-slate-600 font-medium">Risk Filter:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="p-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 font-normal"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk Only</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <span className="text-slate-600 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 font-normal"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Under Verification">Under Verification</option>
              <option value="Qualified">Qualified</option>
              <option value="Disqualified">Disqualified</option>
              <option value="Clarification Requested">Clarification Requested</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-800">{filtered.length}</span> bidders
        </div>
      </div>

      {/* Bidders Table */}
      <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 min-w-[200px]">Bidder Entity</th>
                <th className="py-3 px-3">PAN</th>
                <th className="py-3 px-3">GSTIN</th>
                <th className="py-3 px-3">Udyam No.</th>
                <th className="py-3 px-3">Tender Ref</th>
                <th className="py-3 px-3 text-center">Docs</th>
                <th className="py-3 px-3 min-w-[120px]">Compliance Score</th>
                <th className="py-3 px-3 text-center">Risk</th>
                <th className="py-3 px-3 min-w-[120px]">Verification</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((bidder) => (
                <tr
                  key={bidder.id}
                  onClick={() => onSelectBidder(bidder.id)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900 group-hover:text-[#0F766E] transition-colors text-sm">
                      {bidder.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      ID: {bidder.id} • Inc: {bidder.incorporationDate}
                    </div>
                    {bidder.discrepanciesCount > 0 && (
                      <div className="text-xs font-medium text-rose-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{bidder.discrepanciesCount} Discrepancies Flagged</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-medium text-slate-700 text-xs">
                    {bidder.pan}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-700 text-xs">
                    {bidder.gstin}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-600 text-xs">
                    {bidder.udyam}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-600 text-xs">
                    {bidder.tenderId}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded text-xs">
                      {bidder.documentsCount}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-sm font-semibold text-slate-900">
                        {bidder.complianceScore}
                      </span>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${
                          bidder.complianceScore >= 90
                            ? 'bg-emerald-600'
                            : bidder.complianceScore >= 75
                            ? 'bg-teal-600'
                            : bidder.complianceScore >= 60
                            ? 'bg-amber-500'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${bidder.complianceScore}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {getRiskBadge(bidder.riskLevel)}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">{bidder.verificationProgress}%</span>
                      <span className="text-xs text-slate-400">
                        {bidder.status}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-700 rounded-full"
                        style={{ width: `${bidder.verificationProgress}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBidder(bidder.id);
                      }}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-[#0F766E] bg-teal-50 hover:bg-teal-100 rounded-md border border-teal-200 transition-colors"
                    >
                      <span>Inspect Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
