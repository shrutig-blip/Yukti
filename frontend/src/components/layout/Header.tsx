import React, { useState } from 'react';
import {
  Shield,
  Search,
  Bell,
  AlertTriangle,
  FileCheck,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Info,
  User,
  Sliders,
} from 'lucide-react';
import { Tender, Bidder } from '../../types';
import { CURRENT_OFFICER } from '../../constants/officer';

interface HeaderProps {
  onSearchSelect?: (type: 'bidder' | 'tender', id: string) => void;
  onOpenGovernance: () => void;
  bidders: Bidder[];
  tenders: Tender[];
  onNavigateToBidder: (bidderId: string) => void;
  onNavigateToTender: (tenderId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGovernance,
  bidders,
  tenders,
  onNavigateToBidder,
  onNavigateToTender,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Organization context & Environment Indicator */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-[#102A43] flex items-center justify-center text-white font-bold text-sm tracking-wide shadow-xs">
              <Shield className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Chennai Petroleum Corporation Ltd (CPCL)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800 border border-teal-300">
                  ENTERPRISE SYSTEM
                </span>
              </div>
              <div className="text-sm font-bold text-[#102A43] tracking-tight">
                Yukti <span className="font-normal text-slate-500 text-xs">— Central Procurement Verification Desk</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-slate-200">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Simulated Gov Portals Active
            </span>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="relative w-72 md:w-96">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tender ID, bidder, GSTIN, PAN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] focus:border-transparent text-slate-800 placeholder-slate-400 transition-colors"
            />
          </div>

          {/* Quick Search Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg py-2 z-50 max-h-80 overflow-y-auto">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Bidders
              </div>
              {filteredBidders.length > 0 ? (
                filteredBidders.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onNavigateToBidder(b.id);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{b.name}</div>
                      <div className="text-[10px] text-slate-500">
                        GSTIN: {b.gstin} • Score: {b.complianceScore}/100
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))
              ) : (
                <div className="px-3 py-1 text-xs text-slate-400 italic">No matching bidders</div>
              )}

              <div className="px-3 py-1 mt-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-t border-slate-100">
                Tenders
              </div>
              {filteredTenders.length > 0 ? (
                filteredTenders.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onNavigateToTender(t.id);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{t.id}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[280px]">
                        {t.title}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))
              ) : (
                <div className="px-3 py-1 text-xs text-slate-400 italic">No matching tenders</div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions, Alerts, and Officer Profile */}
        <div className="flex items-center space-x-3">
          {/* System Governance Dialog Trigger */}
          <button
            onClick={onOpenGovernance}
            className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-[#0F766E] px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            title="System Governance & CPCL Transparency Principles"
          >
            <Info className="w-3.5 h-3.5 text-[#0F766E]" />
            <span className="hidden sm:inline">Governance Policy</span>
          </button>

          {/* Notifications / Critical Alerts */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
              title="3 Critical Compliance Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#B91C1C] rounded-full ring-2 ring-white" />
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-md shadow-xl py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Critical Alerts Requiring Action</span>
                  <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                    3 High/Critical
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  <div
                    onClick={() => {
                      onNavigateToBidder('BID-2026-0047');
                      setIsNotificationOpen(false);
                    }}
                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-red-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Turnover Mismatch Detected</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      ABC Engineering: Declared ₹18.4 Cr vs Audited ₹12.7 Cr
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Tender: CPCL/PROC/2026/047</div>
                  </div>

                  <div
                    onClick={() => {
                      onNavigateToBidder('BID-2026-0047');
                      setIsNotificationOpen(false);
                    }}
                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>OEM Authorization Expiry in 18 Days</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      ABC Engineering: Letter expires on 28 Sep (before tender completion)
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Severity: HIGH</div>
                  </div>

                  <div
                    onClick={() => {
                      onNavigateToBidder('BID-2026-0050');
                      setIsNotificationOpen(false);
                    }}
                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-red-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Watchlist Match in GeM Registry</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Nova Industrial Technologies: Temporary debarment record in 2024
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Severity: CRITICAL</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Officer Profile Badge */}
          <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold border border-slate-300">
              {CURRENT_OFFICER.initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {CURRENT_OFFICER.name}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                {CURRENT_OFFICER.designation} • {CURRENT_OFFICER.department}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
