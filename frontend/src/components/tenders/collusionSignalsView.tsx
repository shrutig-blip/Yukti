import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Network, Loader2, ShieldAlert, Users } from 'lucide-react';
import { Tender, CollusionSignalsResult } from '../../types';
import { collusionService } from '../../services/collusionService';

interface CollusionSignalsViewProps {
  tender: Tender;
  onSelectBidder?: (bidderId: string) => void;
}

const SEVERITY_STYLES: Record<string, { dot: string; badge: string; stroke: string }> = {
  HIGH: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-800', stroke: '#ef4444' },
  MEDIUM: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800', stroke: '#f59e0b' },
};

/**
 * Renders flagged bidders + connections as a simple circular-layout SVG
 * graph. Deliberately plain SVG (no charting/graph library) since none is
 * in package.json yet — this keeps the feature dependency-free. Swap in a
 * force-directed layout (e.g. d3-force or react-force-graph) later if a
 * denser graph needs better spacing.
 */
const CollusionGraph: React.FC<{ result: CollusionSignalsResult; onSelectBidder?: (id: string) => void }> = ({
  result,
  onSelectBidder,
}) => {
  // Only render bidders that are actually part of a flagged cluster —
  // showing all 40-50 bidders on a tender would make the graph unreadable
  // and bury the signal.
  const flaggedIds = useMemo(
    () => new Set(result.flaggedClusters.flatMap((c) => c.bidderIds)),
    [result.flaggedClusters]
  );
  const flaggedNodes = result.nodes.filter((n) => flaggedIds.has(n.bidderId));

  if (flaggedNodes.length === 0) return null;

  const size = 420;
  const center = size / 2;
  const radius = size / 2 - 70;

  const positions = new Map<string, { x: number; y: number }>();
  flaggedNodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / flaggedNodes.length - Math.PI / 2;
    positions.set(n.bidderId, {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    });
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[420px] mx-auto">
      {result.edges.map((e, i) => {
        const a = positions.get(e.bidderA);
        const b = positions.get(e.bidderB);
        if (!a || !b) return null;
        const style = SEVERITY_STYLES[e.severity] ?? SEVERITY_STYLES.MEDIUM;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={style.stroke}
            strokeWidth={e.severity === 'HIGH' ? 2.5 : 1.5}
            strokeDasharray={e.severity === 'HIGH' ? undefined : '4 3'}
            opacity={0.8}
          />
        );
      })}
      {flaggedNodes.map((n) => {
        const pos = positions.get(n.bidderId)!;
        return (
          <g
            key={n.bidderId}
            transform={`translate(${pos.x}, ${pos.y})`}
            className="cursor-pointer"
            onClick={() => onSelectBidder?.(n.bidderId)}
          >
            <circle r={7} fill="#102A43" stroke="white" strokeWidth={2} />
            <text
              y={-12}
              textAnchor="middle"
              className="fill-slate-700"
              style={{ fontSize: 9, fontWeight: 600 }}
            >
              {n.bidderId}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const CollusionSignalsView: React.FC<CollusionSignalsViewProps> = ({ tender, onSelectBidder }) => {
  const [result, setResult] = useState<CollusionSignalsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tender?.id) return;
    setLoading(true);
    setError(null);
    collusionService
      .getSignals(tender.id)
      .then(setResult)
      .catch((err) => setError(err.message || 'Could not load collusion signals'))
      .finally(() => setLoading(false));
  }, [tender?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Analyzing bidder relationships for {tender.id}…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 text-red-700 text-sm">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-[#102A43] tracking-tight flex items-center gap-2">
          <Network className="w-6 h-6 text-[#0F766E]" />
          Cartel / Collusion Signals
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Cross-bidder pattern detection for {tender.id} — {result.bidderCount} bidders analyzed,{' '}
          {result.flaggedClusters.length} linked group{result.flaggedClusters.length === 1 ? '' : 's'} flagged.
        </p>
      </div>

      {result.flaggedClusters.length === 0 ? (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 text-emerald-800 text-sm">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>No linked-bidder patterns detected among the {result.bidderCount} bidders on this tender.</span>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <CollusionGraph result={result} onSelectBidder={onSelectBidder} />
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-500 inline-block" /> Same registration date
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 inline-block border-t border-dashed" /> Similar company name
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {result.flaggedClusters.map((cluster, idx) => {
              const clusterNodes = result.nodes.filter((n) => cluster.bidderIds.includes(n.bidderId));
              const clusterEdges = result.edges.filter(
                (e) => cluster.bidderIds.includes(e.bidderA) && cluster.bidderIds.includes(e.bidderB)
              );
              const worstSeverity = clusterEdges.some((e) => e.severity === 'HIGH') ? 'HIGH' : 'MEDIUM';
              const style = SEVERITY_STYLES[worstSeverity];

              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-semibold text-[#102A43]">
                        Linked group #{idx + 1} — {cluster.size} bidders
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${style.badge}`}>
                      {worstSeverity}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {clusterNodes.map((n) => (
                      <button
                        key={n.bidderId}
                        onClick={() => onSelectBidder?.(n.bidderId)}
                        className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
                      >
                        {n.companyName}{' '}
                        <span className="text-slate-400">({n.bidderId})</span>
                      </button>
                    ))}
                  </div>

                  <ul className="space-y-1">
                    {clusterEdges.flatMap((e) =>
                      e.reasons.map((r, i) => (
                        <li key={`${e.bidderA}-${e.bidderB}-${i}`} className="text-xs text-slate-600 flex gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${SEVERITY_STYLES[r.severity].dot}`} />
                          <span>
                            <span className="font-medium">{e.bidderA} ↔ {e.bidderB}:</span> {r.detail}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
        Signals are based on identical incorporation dates and matching company names (after stripping legal-entity
        suffixes) among bidders on the same tender — real data-derived indicators, not a confirmed finding. Officer
        review is required before any action is taken.
      </p>
    </div>
  );
};