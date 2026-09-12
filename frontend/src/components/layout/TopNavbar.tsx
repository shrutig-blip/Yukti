import React, { useState } from 'react';
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
  Scale,
  ListChecks,
  Search,
  Bell,
  AlertTriangle,
  ChevronRight,
  Info,
  Shield,
  Layers,
  X,
} from 'lucide-react';
import { CURRENT_OFFICER } from '../../constants/officer';
import { Tender, Bidder } from '../../types';

export type NavigationTab =
  | 'dashboard'
  | 'tenders'
  | 'checklist-ai'
  | 'bidders'
  | 'bidder-profile'
  | 'compliance-analysis'
  | 'bidder-comparison'
  | 'audit-trail'
  | 'reports';

interface TopNavbarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  activeTender: Tender;
  tenders: Tender[];
  bidders: Bidder[];
  activeBidder?: Bidder;
  onSelectTender: (tenderId: string) => void;
  onSelectBidder: (bidderId: string) => void;
  onOpenGovernance?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onSelectTab,
  activeTender,
  tenders,
  bidders,
  activeBidder,
  onSelectTender,
  onSelectBidder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isTenderDropdownOpen, setIsTenderDropdownOpen] = useState(false);

  const filteredBidders = searchQuery.trim()
    ? bidders.filter(
        (b) =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.pan.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredTenders = searchQuery.trim()
    ? tenders.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'tenders' as NavigationTab,
      label: 'Tenders & NIT',
      icon: FileSpreadsheet,
      badge: `${tenders.length}`,
    },
    {
      id: 'checklist-ai' as NavigationTab,
      label: 'NIT Requirements',
      icon: ListChecks,
      badge: 'Matrix',
    },
    {
      id: 'bidders' as NavigationTab,
      label: 'Bidders Directory',
      icon: Users,
      badge: `${bidders.length}`,
    },
    {
      id: 'bidder-profile' as NavigationTab,
      label: 'Bidder Dossier',
      icon: ShieldCheck,
      badge: activeBidder ? activeBidder.name.split(' ')[0] : 'Active',
    },
    {
      id: 'compliance-analysis' as NavigationTab,
      label: 'Compliance Analysis',
      icon: CheckCircle2,
      badge: '14 Clauses',
      highlight: true,
    },
    {
      id: 'bidder-comparison' as NavigationTab,
      label: 'Comparison',
      icon: Scale,
      badge: undefined,
    },
    {
      id: 'audit-trail' as NavigationTab,
      label: 'Audit Trail',
      icon: History,
      badge: undefined,
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Evaluation Reports',
      icon: FileText,
      badge: undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Utility & Brand Bar */}
      <div className="border-b border-slate-800 bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Organization */}
          <div className="flex items-center space-x-3.5 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-[#0F766E] border border-teal-500/40 flex items-center justify-center text-white font-black text-lg shadow-xs">
              <Shield className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  Yukti <span className="text-teal-300 text-xs font-semibold uppercase tracking-wider bg-teal-950 px-1.5 py-0.5 rounded border border-teal-700/60">Verification System</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-300 hidden sm:inline-block">
                  • CPCL Manali Refinery
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-teal-300 border border-slate-700">
                  CPSE PROCUREMENT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Statutory Tender Compliance & Bidder Verification Console
              </p>
            </div>
          </div>

          {/* Active Tender Selector Pill */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setIsTenderDropdownOpen(!isTenderDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-left transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Tender</div>
                <div className="font-mono font-bold text-teal-300 truncate max-w-[200px]">
                  {activeTender?.id || 'CPCL/PROC/2026/047'}
                </div>
              </div>
            </button>

            {/* Tender Dropdown */}
            {isTenderDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50 text-slate-800">
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Select Active Tender
                </div>
                {tenders.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTender(t.id);
                      setIsTenderDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between ${
                      activeTender?.id === t.id ? 'bg-teal-50/70 border-l-4 border-teal-600' : ''
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 font-mono">{t.id}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[220px]">{t.title}</div>
                    </div>
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                      {t.biddersCount} Bids
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center Search Input */}
          <div className="relative flex-1 max-w-xs md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tender ID, bidder, GSTIN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-800/90 border border-slate-700 rounded-md focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-white placeholder-slate-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick Search Dropdown */}
            {isSearchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50 max-h-80 overflow-y-auto text-slate-800">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Matching Bidders
                </div>
                {filteredBidders.length > 0 ? (
                  filteredBidders.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        onSelectBidder(b.id);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between border-b border-slate-50"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{b.name}</div>
                        <div className="text-[11px] text-slate-500">
                          GSTIN: {b.gstin} • Score: {b.complianceScore}/100
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-1.5 text-xs text-slate-400 italic">No matching bidders found</div>
                )}

                <div className="px-3 py-1 mt-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100">
                  Matching Tenders
                </div>
                {filteredTenders.length > 0 ? (
                  filteredTenders.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelectTender(t.id);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 font-mono">{t.id}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[240px]">{t.title}</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-1.5 text-xs text-slate-400 italic">No matching tenders found</div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Utilities */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Gov Portal Badge */}
            <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>10 Gov Portals Linked</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-slate-300 hover:text-white rounded-md hover:bg-slate-800 transition-colors relative"
                title="3 Critical Compliance Alerts"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0F172A]" />
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50 text-slate-800">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Critical Flags Requiring Review</span>
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                      3 Pending
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    <div
                      onClick={() => {
                        onSelectBidder('BID-2026-0047');
                        setIsNotificationOpen(false);
                      }}
                      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Turnover Mismatch Detected</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        ABC Engineering: Declared ₹18.4 Cr vs Audited ₹12.7 Cr
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        onSelectBidder('BID-2026-0047');
                        setIsNotificationOpen(false);
                      }}
                      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>OEM Validity Expiry in 18 Days</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        ABC Engineering: Authorization ends before bid closing
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        onSelectBidder('BID-2026-0050');
                        setIsNotificationOpen(false);
                      }}
                      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Watchlist Match in GeM Registry</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Nova Industrial Technologies: 2024 debarment record
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Officer Profile Badge */}
            <div className="flex items-center space-x-2 pl-3 border-l border-slate-700">
              <div className="w-7 h-7 rounded-full bg-teal-800 text-teal-100 flex items-center justify-center text-xs font-bold border border-teal-600">
                {CURRENT_OFFICER.initials}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-white leading-tight">{CURRENT_OFFICER.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight">{CURRENT_OFFICER.designation}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Navigation Bar (Clean, spacious horizontal view on the top) */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1 sm:space-x-2 py-2 overflow-x-auto no-scrollbar scroll-smooth">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#0F766E] text-white shadow-xs font-medium'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  } ${item.highlight && !isActive ? 'bg-teal-50 text-[#0F766E] border border-teal-200' : ''}`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : item.highlight ? 'text-[#0F766E]' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded font-mono font-medium ${
                        isActive
                          ? 'bg-teal-900 text-teal-100 border border-teal-700'
                          : item.highlight
                          ? 'bg-teal-200 text-teal-900'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
