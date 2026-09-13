import React from 'react';
import { Shield, ChevronRight } from 'lucide-react';
import { OFFICERS, OfficerProfile } from '../../constants/officer';

interface OfficerSelectViewProps {
  onSelect: (officer: OfficerProfile) => void;
}

export const OfficerSelectView: React.FC<OfficerSelectViewProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-1.5">
          <div className="w-10 h-10 rounded-md bg-[#102A43] flex items-center justify-center mx-auto shadow-xs">
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <h1 className="text-sm font-bold text-[#102A43] tracking-tight">
            Select Procurement Officer
          </h1>
          <p className="text-xs text-slate-500">
            Choose the identity you're operating as for this session.
          </p>
        </div>

        <div className="space-y-2.5">
          {OFFICERS.map((officer) => (
            <button
              key={officer.name}
              onClick={() => onSelect(officer)}
              className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-[#0F766E] hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-[#102A43]">
                  {officer.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{officer.name}</div>
                  <div className="text-[11px] text-slate-500">{officer.fullDesignation}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};