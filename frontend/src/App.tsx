import React, { useState, useEffect } from 'react';
import { TopNavbar, NavigationTab } from './components/layout/TopNavbar';
import { SystemGovernanceModal } from './components/modals/SystemGovernanceModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { TendersView } from './components/tenders/TendersView';
import { TenderChecklistAI } from './components/tenders/TenderChecklistAI';
import { BiddersView } from './components/bidders/BiddersView';
import { BidderProfileView } from './components/bidders/BidderProfileView';
import { BidderComparisonView } from './components/comparison/BidderComparisonView';
import { ComplianceAnalysisView } from './components/compliance/ComplianceAnalysisView';
import { ComplianceReportView } from './components/reports/ComplianceReportView';
import { AuditTrailView } from './components/audit/AuditTrailView';

import { tenderService } from './services/tenderService';
import { bidderService } from './services/bidderService';
import { Tender, Bidder, TenderRequirement } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab | 'bidder-profile'>('dashboard');
  const [isGovernanceModalOpen, setIsGovernanceModalOpen] = useState(false);

  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bidders, setBidders] = useState<Bidder[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string>('');
  const [selectedBidderId, setSelectedBidderId] = useState<string>('');
  const [currentRequirements, setCurrentRequirements] = useState<TenderRequirement[]>([]);
  const [tenderBidders, setTenderBidders] = useState<Bidder[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loadedTenders, loadedBidders] = await Promise.all([
          tenderService.getTenders(),
          bidderService.getBidders(),
        ]);
        if (cancelled) return;
        setTenders(loadedTenders);
        setBidders(loadedBidders);
        if (loadedTenders.length > 0) setSelectedTenderId(loadedTenders[0].id);
        if (loadedBidders.length > 0) setSelectedBidderId(loadedBidders[0].id);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Failed to load data from the backend. Is the FastAPI server running?'
          );
        }
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentTender =
    tenders.find((t) => t.id === selectedTenderId) || tenders[0] || ({} as Tender);
  const currentBidder =
    tenderBidders.find((b) => b.id === selectedBidderId) ||
    bidders.find((b) => b.id === selectedBidderId) ||
    bidders[0] ||
    ({} as Bidder);

  useEffect(() => {
    if (!currentTender.id) {
      setCurrentRequirements([]);
      return;
    }
    let cancelled = false;
    tenderService.getRequirements(currentTender.id).then((reqs) => {
      if (!cancelled) setCurrentRequirements(reqs);
    });
    return () => {
      cancelled = true;
    };
  }, [currentTender.id]);

  useEffect(() => {
    if (!currentTender.id) {
      setTenderBidders([]);
      return;
    }
    let cancelled = false;
    bidderService.getBidders(currentTender.id).then((list) => {
      if (!cancelled) setTenderBidders(list);
    });
    return () => {
      cancelled = true;
    };
  }, [currentTender.id]);

  const handleSelectBidder = (bidderId: string) => {
    setSelectedBidderId(bidderId);
    setActiveTab('bidder-profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTender = (tenderId: string) => {
    setSelectedTenderId(tenderId);
    setActiveTab('bidders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenExtraction = (tenderId: string) => {
    setSelectedTenderId(tenderId);
    setActiveTab('checklist-ai');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateReport = (bidderId: string) => {
    setSelectedBidderId(bidderId);
    setActiveTab('reports');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateTender = (newTenderData: any) => {
    const created = tenderService.createTender(newTenderData);
    setTenders((prev) => [created, ...prev]);
    setSelectedTenderId(created.id);
  };

  const handleUpdateRequirement = (id: string, updates: Partial<TenderRequirement>) => {
    const updated = tenderService.updateRequirement(id, updates);
    if (updated) {
      setCurrentRequirements((prev) => prev.map((r) => (r.id === id ? updated : r)));
    }
  };

  const handleDecisionUpdated = (updatedBidder: Bidder) => {
    const updatedList = bidders.map((b) => (b.id === updatedBidder.id ? updatedBidder : b));
    setBidders(updatedList);
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading data from the backend…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <div className="text-sm font-semibold text-rose-700">Couldn't load data from the backend</div>
          <div className="text-xs text-slate-500">{loadError}</div>
          <div className="text-xs text-slate-400">
            Start the API with <code>uvicorn main:app --reload</code> from the{' '}
            <code>backend/</code> folder, then reload this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex flex-col">
      <TopNavbar
        activeTab={activeTab as NavigationTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        activeTender={currentTender}
        tenders={tenders}
        bidders={bidders}
        activeBidder={currentBidder}
        onSelectTender={handleSelectTender}
        onSelectBidder={handleSelectBidder}
        onOpenGovernance={() => setIsGovernanceModalOpen(true)}
      />

      <main className="flex-1 w-full bg-slate-50">
        {activeTab === 'dashboard' && (
          <DashboardView
            tenders={tenders}
            bidders={bidders}
            onSelectBidder={handleSelectBidder}
            onSelectTender={handleSelectTender}
            onNavigateToTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'tenders' && (
          <TendersView
            tenders={tenders}
            onSelectTender={handleSelectTender}
            onOpenExtraction={handleOpenExtraction}
            onCreateTender={handleCreateTender}
          />
        )}

        {activeTab === 'checklist-ai' && (
          <TenderChecklistAI
            tender={currentTender}
            requirements={currentRequirements}
            onUpdateRequirement={handleUpdateRequirement}
            onNavigateToBidders={() => setActiveTab('bidders')}
          />
        )}

        {activeTab === 'bidders' && (
          <BiddersView
            bidders={tenderBidders}
            onSelectBidder={handleSelectBidder}
            onCompareBidders={() => setActiveTab('bidder-comparison')}
            selectedTenderId={selectedTenderId}
          />
        )}

        {activeTab === 'bidder-profile' && (
          <BidderProfileView
            bidder={currentBidder}
            tender={currentTender}
            requirements={currentRequirements}
            onBack={() => setActiveTab('bidders')}
            onGenerateReport={handleGenerateReport}
            onDecisionUpdated={handleDecisionUpdated}
          />
        )}

        {activeTab === 'compliance-analysis' && (
          <ComplianceAnalysisView
            tender={currentTender}
            bidders={tenderBidders}
            activeBidder={currentBidder}
            requirements={currentRequirements}
            onSelectBidder={(bidderId) => setSelectedBidderId(bidderId)}
            onNavigateToBidder={handleSelectBidder}
            onNavigateToTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'bidder-comparison' && (
          <BidderComparisonView
            bidders={bidders}
            onSelectBidder={handleSelectBidder}
            onBack={() => setActiveTab('bidders')}
          />
        )}

        {activeTab === 'reports' && (
          <ComplianceReportView
            bidder={currentBidder}
            tender={currentTender}
            requirements={currentRequirements}
            onBack={() => setActiveTab('bidder-profile')}
          />
        )}

        {activeTab === 'audit-trail' && (
          <AuditTrailView onSelectBidder={handleSelectBidder} />
        )}
      </main>

      <SystemGovernanceModal
        isOpen={isGovernanceModalOpen}
        onClose={() => setIsGovernanceModalOpen(false)}
      />
    </div>
  );
}
