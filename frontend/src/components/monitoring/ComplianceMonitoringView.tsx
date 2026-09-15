import React, { useState, useEffect, useCallback } from 'react';
import {
  RadioTower,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  PlayCircle,
} from 'lucide-react';
import { MonitoredBidder, ComplianceLapse } from '../../types';
import { monitoringService } from '../../services/monitoringService';
import { useCurrentOfficer } from '../../context/OfficerContext';

interface ComplianceMonitoringViewProps {
  onSelectBidder?: (bidderId: string) => void;
}

/**
 * Continuous Compliance Monitoring — the post-award counterpart to bid-time
 * verification. Bid-time verification (/verify/{bidderId}, surfaced
 * elsewhere in this app) only ever checks a bidder once, at submission.
 * This view is the "living risk-management layer" across the life of the
 * contract: which bidders are currently under an awarded contract, when
 * they were last re-checked, and any mid-contract lapse (blacklisted,
 * GST filing goes overdue, EPFO dues lapse, etc) that's been detected.
 */
export const ComplianceMonitoringView: React.FC<ComplianceMonitoringViewProps> = ({
  onSelectBidder,
}) => {
  const officer = useCurrentOfficer();
  const [monitoredBidders, setMonitoredBidders] = useState<MonitoredBidder[]>([]);
  const [lapses, setLapses] = useState<ComplianceLapse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState<string | null>(null); // bidderId currently being re-checked
  const [isSweeping, setIsSweeping] = useState(false);
  const [lapseFilter, setLapseFilter] = useState<'ALL' | 'PENDING' | 'ACKNOWLEDGED'>('PENDING');

  const loadData = useCallback(async () => {
    try {
      const [bidders, lapseList] = await Promise.all([
        monitoringService.getMonitoredBidders(),
        monitoringService.getLapses(),
      ]);
      setMonitoredBidders(bidders);
      setLapses(lapseList);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load continuous compliance data.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadData();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const handleRecheck = async (bidderId: string) => {
    setRechecking(bidderId);
    try {
      await monitoringService.recheckBidder(bidderId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-check failed.');
    } finally {
      setRechecking(null);
    }
  };

  const handleRunSweep = async () => {
    setIsSweeping(true);
    try {
      await monitoringService.runSweep();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sweep failed.');
    } finally {
      setIsSweeping(false);
    }
  };

  const handleAcknowledge = async (lapseId: string) => {
    try {
      await monitoringService.acknowledgeLapse(lapseId, officer.name);
      setLapses((prev) =>
        prev.map((l) =>
          l.id === lapseId
            ? { ...l, acknowledged: true, acknowledgedBy: officer.name, acknowledgedAt: new Date().toISOString() }
            : l
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not acknowledge lapse.');
    }
  };

  const lapsesByBidder = lapses.reduce<Record<string, number>>((acc, l) => {
    if (!l.acknowledged) acc[l.bidderId] = (acc[l.bidderId] || 0) + 1;
    return acc;
  }, {});

  const filteredLapses = lapses.filter((l) => {
    if (lapseFilter === 'PENDING') return !l.acknowledged;
    if (lapseFilter === 'ACKNOWLEDGED') return l.acknowledged;
    return true;
  });

  const pendingCount = lapses.filter((l) => !l.acknowledged).length;

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return (
      d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) +
      ' IST'
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-sm text-slate-500">Loading continuous compliance data…</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1 font-medium">
            <span>Governance & Accountability</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Continuous Compliance</span>
          </div>
          <h1 className="text-[28px] sm:text-[30px] font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-2.5">
            <RadioTower className="w-6 h-6 text-[#0F766E]" />
            <span>Continuous Compliance Monitoring</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-normal leading-relaxed max-w-3xl">
            Bid-time verification is a one-time gate. This re-checks every bidder currently under
            an awarded / active contract — GST filing, blacklist status, EPFO/ESIC dues, and more —
            and alerts the moment someone who was clean at award lapses mid-contract.
          </p>
        </div>

        <button
          onClick={handleRunSweep}
          disabled={isSweeping || monitoredBidders.length === 0}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium bg-[#102A43] text-white hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <PlayCircle className={`w-4 h-4 text-teal-300 ${isSweeping ? 'animate-spin' : ''}`} />
          <span>{isSweeping ? 'Running sweep…' : 'Run Sweep Now'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-md border border-slate-200 shadow-xs p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Bidders Under Monitoring
          </div>
          <div className="text-2xl font-bold text-slate-900">{monitoredBidders.length}</div>
          <div className="text-xs text-slate-400 mt-1">Active / awarded contracts (QUALIFIED)</div>
        </div>
        <div className="bg-white rounded-md border border-slate-200 shadow-xs p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Unacknowledged Lapses
          </div>
          <div className={`text-2xl font-bold ${pendingCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {pendingCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">Require procurement officer review</div>
        </div>
        <div className="bg-white rounded-md border border-slate-200 shadow-xs p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Lapses Recorded
          </div>
          <div className="text-2xl font-bold text-slate-900">{lapses.length}</div>
          <div className="text-xs text-slate-400 mt-1">Since monitoring began</div>
        </div>
      </div>

      {/* Monitored bidders table */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-[#0F766E]" />
          Monitored Bidders
        </h2>
        <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-3">Bidder</th>
                  <th className="py-3 px-3">Qualified Since</th>
                  <th className="py-3 px-3 text-center">Pending Lapses</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monitoredBidders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 px-3 text-center text-sm text-slate-400 italic">
                      No bidders are currently under continuous monitoring. A bidder is monitored
                      once they receive a QUALIFIED officer decision (i.e. they're awarded /
                      under an active contract).
                    </td>
                  </tr>
                )}
                {monitoredBidders.map((b) => (
                  <tr key={b.bidderId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onSelectBidder?.(b.bidderId)}
                        className="font-semibold text-slate-900 hover:text-[#0F766E] hover:underline text-left"
                      >
                        {b.companyName}
                      </button>
                      <div className="text-xs text-slate-400 font-mono">{b.bidderId}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600">
                      {formatTimestamp(b.qualifiedSince)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {lapsesByBidder[b.bidderId] ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                          {lapsesByBidder[b.bidderId]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Clear
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleRecheck(b.bidderId)}
                        disabled={rechecking === b.bidderId}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:underline disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${rechecking === b.bidderId ? 'animate-spin' : ''}`} />
                        {rechecking === b.bidderId ? 'Re-checking…' : 'Re-check now'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Lapse feed */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Detected Compliance Lapses
          </h2>
          <div className="flex items-center space-x-2 text-sm">
            <select
              value={lapseFilter}
              onChange={(e) => setLapseFilter(e.target.value as typeof lapseFilter)}
              className="p-2 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-800 font-normal"
            >
              <option value="PENDING">Pending Review</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="ALL">All</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-3">Detected</th>
                  <th className="py-3 px-3">Bidder</th>
                  <th className="py-3 px-3">Check</th>
                  <th className="py-3 px-3">Status Change</th>
                  <th className="py-3 px-4 min-w-[220px]">Detail</th>
                  <th className="py-3 px-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLapses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 px-3 text-center text-sm text-slate-400 italic">
                      {lapseFilter === 'PENDING'
                        ? 'No pending lapses — every monitored bidder is currently compliant.'
                        : 'No lapses to show.'}
                    </td>
                  </tr>
                )}
                {filteredLapses.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatTimestamp(l.timestamp)}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onSelectBidder?.(l.bidderId)}
                        className="font-mono text-xs text-[#0F766E] hover:underline font-medium"
                      >
                        {l.bidderId}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-slate-900 text-sm font-medium uppercase">
                      {l.checkType}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      <span className="text-emerald-700 font-medium">{l.previousStatus}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="text-red-700 font-medium">{l.currentStatus}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-sm">{l.detail}</td>
                    <td className="py-3 px-3 text-right">
                      {l.acknowledged ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          By {l.acknowledgedBy}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledge(l.id)}
                          className="text-xs font-medium text-white bg-[#0F766E] hover:bg-teal-800 px-2.5 py-1 rounded-md transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
