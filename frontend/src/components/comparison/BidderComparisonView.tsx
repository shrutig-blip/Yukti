import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
  Download,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { Bidder, SeverityLevel } from '../../types';

interface BidderComparisonViewProps {
  bidders: Bidder[];
  onSelectBidder: (id: string) => void;
  onBack: () => void;
}

export const BidderComparisonView: React.FC<BidderComparisonViewProps> = ({
  bidders,
  onSelectBidder,
  onBack,
}) => {
  // Let user pick up to 3 bidders for side-by-side comparison
  const defaultSelected = bidders.slice(0, 3).map((b) => b.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelected);

  const selectedBidders = bidders.filter((b) => selectedIds.includes(b.id));

  const toggleBidder = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((x) => x !== id));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const getRiskBadge = (level: SeverityLevel) => {
    switch (level) {
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">LOW</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">MEDIUM</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">HIGH</span>;
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">CRITICAL</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-[#0F766E] font-medium flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Bidders</span>
          </button>
          <h1 className="text-2xl font-bold text-[#102A43] tracking-tight">
            Side-by-Side Bidder Evaluation Matrix
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comparative analysis of compliance scores, statutory filings, and risk contradictions across participating vendors
          </p>
        </div>

        {/* Bidder selector pills */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Select up to 3 bidders:</span>
          <div className="flex flex-wrap gap-1.5">
            {bidders.map((b) => (
              <button
                key={b.id}
                onClick={() => toggleBidder(b.id)}
                className={`px-2.5 py-1 text-xs rounded border transition-all ${
                  selectedIds.includes(b.id)
                    ? 'bg-[#102A43] text-white border-[#102A43] font-semibold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {b.name.split(' ')[0]} ({b.id.split('-')[2]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-4 px-4 w-1/4 border-r border-slate-200">Evaluation Parameter</th>
                {selectedBidders.map((b) => (
                  <th key={b.id} className="py-4 px-4 border-r border-slate-200 last:border-r-0">
                    <div className="text-slate-900 font-bold text-sm tracking-tight">{b.name}</div>
                    <div className="text-[10px] font-mono text-slate-500 font-normal mt-0.5">
                      {b.id} • {b.tenderId}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {/* Row: Compliance Score */}
              <tr className="bg-slate-50/50">
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200">
                  Overall Compliance Score
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3 px-4 border-r border-slate-200 last:border-r-0">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-xl font-bold text-[#102A43]">{b.complianceScore}</span>
                      <span className="text-xs text-slate-400">/100</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row: Risk Level */}
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200">
                  Adaptive Risk Level
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3 px-4 border-r border-slate-200 last:border-r-0">
                    {getRiskBadge(b.riskLevel)}
                  </td>
                ))}
              </tr>

              {/* Row: Statutory PAN */}
              <tr className="bg-slate-50/50">
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200">
                  Income Tax PAN
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3 px-4 font-mono border-r border-slate-200 last:border-r-0">
                    <span className="font-semibold text-slate-900">{b.pan}</span>
                    <span className="text-emerald-700 font-bold block text-[10px] mt-0.5">✓ ITD Active</span>
                  </td>
                ))}
              </tr>

              {/* Row: GSTIN Status */}
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200">
                  GSTIN Registration & Filing
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3 px-4 font-mono text-[11px] border-r border-slate-200 last:border-r-0">
                    <div>{b.gstin}</div>
                    <span className="text-emerald-700 font-bold text-[10px] block mt-0.5">✓ 3B/GSTR-1 Regular</span>
                  </td>
                ))}
              </tr>

              {/* Row: Udyam MSME */}
              <tr className="bg-slate-50/50">
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200">
                  Udyam MSME Category
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3 px-4 font-mono text-[11px] border-r border-slate-200 last:border-r-0">
                    <div>{b.udyam}</div>
                    <span className="text-teal-700 font-semibold text-[10px]">Medium Enterprise (NIC 28132)</span>
                  </td>
                ))}
              </tr>

              {/* Row: Annual Turnover */}
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200">
                  Annual Turnover (Declared vs Audited)
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3 px-4 border-r border-slate-200 last:border-r-0">
                    {b.id === 'BID-2026-0047' ? (
                      <div className="space-y-1">
                        <div className="text-slate-800">Declared: <strong>₹18.40 Cr</strong></div>
                        <div className="text-red-700 font-semibold">Audited: ₹12.72 Cr (Mismatch)</div>
                      </div>
                    ) : b.id === 'BID-2026-0048' ? (
                      <div className="space-y-1">
                        <div className="text-slate-800">Declared: <strong>₹24.10 Cr</strong></div>
                        <div className="text-emerald-700 font-semibold">Audited: ₹24.10 Cr (Match)</div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-slate-800">Declared: <strong>₹9.80 Cr</strong></div>
                        <div className="text-red-700 font-semibold">Audited: ₹8.40 Cr (Below threshold)</div>
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row: OEM Authorization */}
              <tr className="bg-slate-50/50">
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200">
                  OEM Authorization Validity
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3 px-4 border-r border-slate-200 last:border-r-0">
                    {b.id === 'BID-2026-0047' ? (
                      <div>
                        <span className="text-amber-800 font-bold">Expires: 28 Sep 2026</span>
                        <div className="text-[10px] text-red-700 font-medium mt-0.5">⚠️ Expires 2d before bid validity</div>
                      </div>
                    ) : b.id === 'BID-2026-0048' ? (
                      <div>
                        <span className="text-emerald-800 font-bold">Expires: 31 Dec 2027</span>
                        <div className="text-[10px] text-emerald-700 font-medium mt-0.5">✓ Fully valid through contract</div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-red-800 font-bold">Expired: 15 Aug 2026</span>
                        <div className="text-[10px] text-red-700 font-medium mt-0.5">✗ Non-compliant</div>
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row: Debarment Check */}
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200">
                  Debarment / Blacklisting Check
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3 px-4 border-r border-slate-200 last:border-r-0">
                    <span className="inline-flex items-center text-emerald-700 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      CLEARED (CVC / GeM / MoP&NG)
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row: Documents Submitted */}
              <tr className="bg-slate-50/50">
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200">
                  Documents Verified
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3 px-4 border-r border-slate-200 last:border-r-0">
                    <span className="font-semibold text-slate-800">{b.documentsCount} documents</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{b.verificationProgress}% completed</span>
                  </td>
                ))}
              </tr>

              {/* Row: Discrepancies Count */}
              <tr>
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-200">
                  Discrepancies Flagged
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3 px-4 border-r border-slate-200 last:border-r-0">
                    {b.discrepanciesCount === 0 ? (
                      <span className="text-emerald-700 font-bold">0 Discrepancies</span>
                    ) : (
                      <span className="text-red-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {b.discrepanciesCount} Flagged
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row: Action Link */}
              <tr className="bg-slate-100">
                <td className="py-3.5 px-4 font-bold text-slate-700 border-r border-slate-200">
                  Inspection Action
                </td>
                {selectedBidders.map((b) => (
                  <td key={b.id} className="py-3.5 px-4 border-r border-slate-200 last:border-r-0">
                    <button
                      onClick={() => onSelectBidder(b.id)}
                      className="px-3 py-1 bg-[#102A43] hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs flex items-center space-x-1"
                    >
                      <span>Open Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
