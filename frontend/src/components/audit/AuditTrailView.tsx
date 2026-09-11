import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Shield,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';
import { AuditRecord } from '../../types';
import { auditService } from '../../services/auditService';

interface AuditTrailViewProps {
  onSelectBidder?: (bidderId: string) => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ onSelectBidder }) => {
  const [records, setRecords] = useState<AuditRecord[]>(auditService.getRecords());
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.comments && r.comments.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesResult = resultFilter === 'ALL' || r.result === resultFilter;
    const matchesRole = roleFilter === 'ALL' || r.role === roleFilter;

    return matchesSearch && matchesResult && matchesRole;
  });

  const handleExportCSV = () => {
    const csv = auditService.exportAuditLogAsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Yukti_AuditTrail_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'PASS':
      case 'QUALIFIED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
            {result}
          </span>
        );
      case 'DISCREPANCY':
      case 'DISQUALIFIED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
            {result}
          </span>
        );
      case 'REVIEW':
      case 'REVIEW REQUIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
            {result}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
            {result}
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
            <span>Governance & Accountability</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Audit Provenance</span>
          </div>
          <h1 className="text-[28px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-[#0F766E]" />
            <span>Immutable Audit Trail & Regulatory Provenance</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-normal leading-relaxed">
            Every document ingestion, automated portal cross-check, discrepancy trigger, and human decision is cryptographically logged.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium bg-[#102A43] text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-teal-300" />
            <span>Export Official Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-md border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit ID, actor, action, comments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <span className="text-slate-600 font-medium">Result:</span>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="p-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 font-normal"
            >
              <option value="ALL">All Outcomes</option>
              <option value="PASS">PASS</option>
              <option value="DISCREPANCY">DISCREPANCY</option>
              <option value="REVIEW REQUIRED">REVIEW REQUIRED</option>
              <option value="RECORDED">RECORDED</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <span className="text-slate-600 font-medium">Actor Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="p-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 font-normal"
            >
              <option value="ALL">All Roles</option>
              <option value="AI Engine">AI Engine</option>
              <option value="Procurement Officer">Procurement Officer</option>
              <option value="System">System / Ingestion</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-800">{filtered.length}</span> audit records
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3">Audit ID</th>
                <th className="py-3 px-3 min-w-[140px]">Timestamp</th>
                <th className="py-3 px-3">Actor & Role</th>
                <th className="py-3 px-3">Action Performed</th>
                <th className="py-3 px-3">System / Portal Source</th>
                <th className="py-3 px-3 text-center">Result</th>
                <th className="py-3 px-4 min-w-[240px]">Evidence & Officer Comments</th>
                {onSelectBidder && <th className="py-3 px-3 text-right">Dossier</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-slate-900 text-xs">
                    {record.id}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-slate-600">
                    {record.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-900 text-sm">{record.actor}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{record.role}</div>
                  </td>
                  <td className="py-3 px-3 font-normal text-slate-900 text-sm">
                    {record.action}
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-xs">
                    {record.source}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {getResultBadge(record.result)}
                  </td>
                  <td className="py-3 px-4 text-slate-700 text-sm font-normal">
                    <div>{record.comments || 'Automated validation passed.'}</div>
                    {record.evidenceRef && (
                      <div className="font-mono text-xs text-[#0F766E] mt-0.5 font-medium">
                        Ref: {record.evidenceRef}
                      </div>
                    )}
                  </td>
                  {onSelectBidder && (
                    <td className="py-3 px-3 text-right">
                      {record.bidderId && (
                        <button
                          onClick={() => onSelectBidder(record.bidderId!)}
                          className="font-mono text-xs text-[#0F766E] hover:underline font-medium"
                        >
                          {record.bidderId} →
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
