import React, { useEffect, useState } from 'react';
import { Scale, Search } from 'lucide-react';
import { decisionService } from '../../services/decisionService';

interface DecisionRecord {
  id: string;
  bidder_id: string;
  bidder_name: string;
  decision: string;
  officer_name: string;
  officer_designation: string;
  timestamp: string;
  comments: string | null;
  conditions_or_stipulations: string | null;
}

interface DecisionHistoryViewProps {
  onSelectBidder: (bidderId: string) => void;
}

export const DecisionHistoryView: React.FC<DecisionHistoryViewProps> = ({ onSelectBidder }) => {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    decisionService
      .getAllDecisions()
      .then((data) => {
        if (!cancelled) setDecisions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load decisions');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = searchQuery.trim()
    ? decisions.filter(
        (d) =>
          d.bidder_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.bidder_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.officer_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : decisions;

  const decisionBadge = (decision: string) => {
    switch (decision) {
      case 'QUALIFIED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DISQUALIFIED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'CLARIFICATION_REQUESTED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#0F766E]" />
            Officer Decision History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every qualification decision ever recorded, across all bidders — newest first
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bidder or officer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md w-64 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
        {isLoading && <div className="p-4 text-sm text-slate-500">Loading decision history…</div>}
        {error && <div className="p-4 text-sm text-red-600">{error}</div>}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-4 text-sm text-slate-400 italic">No decisions recorded yet.</div>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Bidder</th>
                <th className="py-2.5 px-3">Decision</th>
                <th className="py-2.5 px-3">Officer</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => onSelectBidder(d.bidder_id)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{d.bidder_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{d.bidder_id}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${decisionBadge(d.decision)}`}>
                      {d.decision}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-800">{d.officer_name}</div>
                    <div className="text-[10px] text-slate-400">{d.officer_designation}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    {new Date(d.timestamp).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                    {d.comments || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};