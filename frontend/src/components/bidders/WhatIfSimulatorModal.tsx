import React, { useState } from 'react';
import { Sliders, X, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Bidder, SeverityLevel } from '../../types';
import { riskService, SimulationParams } from '../../services/riskService';

interface WhatIfSimulatorModalProps {
  bidder: Bidder;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatIfSimulatorModal: React.FC<WhatIfSimulatorModalProps> = ({
  bidder,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [params, setParams] = useState<SimulationParams>({
    oemMandatory: true,
    msmeExempt: true,
    minorExpiryTolerated: false,
    financialDiscrepancyCritical: true,
    turnoverRelaxation: false,
  });

  const simulation = riskService.simulateScenario(bidder.complianceScore, params);

  const getRiskBadge = (level: SeverityLevel) => {
    switch (level) {
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">LOW</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">MEDIUM</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800">HIGH</span>;
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">CRITICAL</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#102A43] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-teal-800 text-teal-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Risk Scenario Simulator
              </h3>
              <p className="text-[11px] text-teal-200">
                Interactive "What-If" policy model for {bidder.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Official Disclaimer Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-[11px] flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Scenario simulation only</strong> — does not modify the official verification records,
              dossier calculations, or statutory procurement logs.
            </span>
          </div>

          {/* Current vs Projected Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-md border border-slate-200 bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500">Official Benchmark</div>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-bold text-slate-800">{bidder.complianceScore}</span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Risk:</span>
                {getRiskBadge(bidder.riskLevel)}
              </div>
            </div>

            <div className="p-4 rounded-md border border-teal-200 bg-teal-50/50">
              <div className="text-[10px] uppercase font-bold text-teal-800">Projected Scenario</div>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-bold text-[#0F766E]">
                  {simulation.projectedCompliance}
                </span>
                <span className="text-xs text-teal-600">/100</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Projected Risk:</span>
                {getRiskBadge(simulation.projectedRisk)}
              </div>
            </div>
          </div>

          {/* Policy Toggles */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">
              Simulated Regulatory & Tender Variables
            </h4>

            {/* Toggle 1 */}
            <div className="flex items-center justify-between p-2.5 rounded border border-slate-200 bg-white">
              <div>
                <div className="font-semibold text-slate-800">OEM Authorization Strictly Mandatory</div>
                <div className="text-[10px] text-slate-500">
                  Enforces strict disqualification if manufacturer authorization letter expires early
                </div>
              </div>
              <button
                type="button"
                onClick={() => setParams({ ...params, oemMandatory: !params.oemMandatory })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  params.oemMandatory ? 'bg-[#0F766E]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    params.oemMandatory ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between p-2.5 rounded border border-slate-200 bg-white">
              <div>
                <div className="font-semibold text-slate-800">Financial Discrepancy Weighted as Critical</div>
                <div className="text-[10px] text-slate-500">
                  Treats turnover variation between TECH-4 and audited filings as severe governance risk
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setParams({
                    ...params,
                    financialDiscrepancyCritical: !params.financialDiscrepancyCritical,
                  })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  params.financialDiscrepancyCritical ? 'bg-[#0F766E]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    params.financialDiscrepancyCritical ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3 */}
            <div className="flex items-center justify-between p-2.5 rounded border border-slate-200 bg-white">
              <div>
                <div className="font-semibold text-slate-800">Document Expiry Grace Period (30 Days)</div>
                <div className="text-[10px] text-slate-500">
                  Allow tender submission if certificates expire within 30 days of bid deadline
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setParams({
                    ...params,
                    minorExpiryTolerated: !params.minorExpiryTolerated,
                  })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  params.minorExpiryTolerated ? 'bg-[#0F766E]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    params.minorExpiryTolerated ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 4 */}
            <div className="flex items-center justify-between p-2.5 rounded border border-slate-200 bg-white">
              <div>
                <div className="font-semibold text-slate-800">3-Year Turnover Averaging Relaxation</div>
                <div className="text-[10px] text-slate-500">
                  Considers 3-year aggregated financial strength rather than single FY standalone compliance
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setParams({
                    ...params,
                    turnoverRelaxation: !params.turnoverRelaxation,
                  })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  params.turnoverRelaxation ? 'bg-[#0F766E]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    params.turnoverRelaxation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Model Rationale */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
            <div className="font-bold text-slate-800 text-[11px]">Model Rationale:</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {simulation.explanation}
            </p>
            {simulation.delinquenciesChanged.length > 0 && (
              <ul className="list-disc list-inside text-[10px] text-slate-500 pt-1 space-y-0.5">
                {simulation.delinquenciesChanged.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#102A43] hover:bg-slate-800 text-white text-xs font-semibold"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
