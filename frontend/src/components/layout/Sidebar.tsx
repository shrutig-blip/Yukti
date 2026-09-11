import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  FolderGit2,
  History,
  FileText,
  Building2,
  Scale,
  Cpu,
  Layers,
  ListChecks,
} from 'lucide-react';

import { NavigationTab } from './TopNavbar';
export type { NavigationTab };

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  activeTenderId: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeTenderId,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'tenders' as NavigationTab,
      label: 'Tenders',
      icon: FileSpreadsheet,
      badge: '3 Active',
    },
    {
      id: 'checklist-ai' as NavigationTab,
      label: 'Requirement Extraction',
      icon: ListChecks,
      badge: 'NIT Matrix',
    },
    {
      id: 'bidders' as NavigationTab,
      label: 'Bidders Management',
      icon: Users,
      badge: '6 Bids',
    },
    {
      id: 'verification-center' as NavigationTab,
      label: 'Verification Center',
      icon: ShieldCheck,
      badge: '10 Portals',
    },
    {
      id: 'compliance-analysis' as NavigationTab,
      label: 'Compliance Engine',
      icon: CheckCircle2,
      badge: undefined,
    },
    {
      id: 'risk-intelligence' as NavigationTab,
      label: 'Risk Intelligence & Radar',
      icon: AlertOctagon,
      badge: 'Adaptive',
    },
    {
      id: 'bidder-comparison' as NavigationTab,
      label: 'Bidder Comparison',
      icon: Scale,
      badge: undefined,
    },
    {
      id: 'document-vault' as NavigationTab,
      label: 'Document Vault & OCR',
      icon: FolderGit2,
      badge: '14 Files',
    },
    {
      id: 'audit-trail' as NavigationTab,
      label: 'Audit Trail',
      icon: History,
      badge: 'Immutable',
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Compliance Reports',
      icon: FileText,
      badge: undefined,
    },
  ];

  return (
    <aside className="w-64 bg-[#102A43] text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* CPSE / Ministry Branding */}
      <div className="p-4 border-b border-slate-800/80 bg-[#0B1D30]">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded bg-teal-800/60 border border-teal-500/40 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider text-teal-300 uppercase">
              CPCL / MoP&NG
            </div>
            <div className="text-[11px] text-slate-300 font-medium">
              Enterprise Procurement
            </div>
            <div className="text-[9px] text-teal-400 font-mono">
              Manali Refinery Complex
            </div>
          </div>
        </div>

        {/* Current Active Tender Focus */}
        <div className="mt-3 p-2 rounded bg-slate-800/60 border border-slate-700/60 text-[11px]">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
            Active Tender Context
          </div>
          <div className="font-mono text-teal-300 font-semibold truncate mt-0.5">
            {activeTenderId}
          </div>
          <div className="text-slate-300 text-[10px] truncate">
            Heavy-Duty API 610 Centrifugal Pumps
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#0F766E] text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              } ${item.highlight && !isActive ? 'border border-teal-500/30 text-teal-200 bg-teal-950/20' : ''}`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-white' : item.highlight ? 'text-teal-300' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive
                      ? 'bg-teal-900 text-teal-100 border border-teal-700'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Decision Support & Governance Guarantee Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-[#0B1D30] text-[11px] text-slate-300">
        <div className="flex items-center space-x-2 mb-1.5">
          <Scale className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="font-semibold text-white text-[11px]">Human Decision Support</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Automated verification provides advisory scoring & anomaly flags. Final qualification authority strictly rests with the Procurement Officer.
        </p>
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400 font-mono">
          <span>Engine v3.4.2</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Audit Logging ON
          </span>
        </div>
      </div>
    </aside>
  );
};
