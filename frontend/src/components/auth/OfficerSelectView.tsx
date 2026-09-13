import React from 'react';
import { OFFICERS, OfficerProfile } from '../../constants/officer';

interface OfficerSelectViewProps {
  onSelect: (officer: OfficerProfile) => void;
}

export const OfficerSelectView: React.FC<OfficerSelectViewProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">GeM Bid Compliance</h1>
          <p className="text-slate-500 mt-2">Select your identity to continue</p>
        </div>

        <div className="space-y-3">
          {OFFICERS.map((officer) => (
            <button
              key={officer.name}
              onClick={() => onSelect(officer)}
              className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {officer.initials}
              </div>
              <div>
                <div className="font-semibold text-slate-900">{officer.name}</div>
                <div className="text-xs text-slate-500">
                  {officer.designation} • {officer.department}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          Demo mode — no password required
        </div>
      </div>
    </div>
  );
};