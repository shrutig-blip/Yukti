import React, { useState, useEffect, useRef } from 'react';
import { TopNavbar, NavigationTab } from './components/layout/TopNavbar';
import { SystemGovernanceModal } from './components/modals/SystemGovernanceModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { TendersView } from './components/tenders/TendersView';
import { TenderChecklistAI } from './components/tenders/TenderChecklistAI';
import { BiddersView } from './components/bidders/BiddersView';
import { BidderProfileView } from './components/bidders/BidderProfileView';
import { BidderComparisonView } from './components/comparison/BidderComparisonView';
import { CollusionSignalsView } from './components/tenders/collusionSignalsView';
import { ComplianceAnalysisView } from './components/compliance/ComplianceAnalysisView';
import { ComplianceReportView } from './components/reports/ComplianceReportView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { ComplianceMonitoringView } from './components/monitoring/ComplianceMonitoringView';
import { DecisionHistoryView } from './components/decision/DecisionHistoryView';
import { LoginView } from './components/auth/LoginView';
import { OfficerProvider, useOfficerContext } from './context/OfficerContext';
import { OfficerSelectView } from './components/officer/OfficerSelectView';
import { DEMO_ACCOUNT_EMAIL } from './config/demo';
import { NonDemoAccountView } from './components/auth/NonDemoAccountView';

import { authService } from './services/authService';
import { tenderService } from './services/tenderService';
import { bidderService } from './services/bidderService';
import { Tender, Bidder, TenderRequirement } from './types';

function AppContent() {
  const { officer, setOfficer, clearOfficer } = useOfficerContext();
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
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const currentUser = authService.getStoredUser();
  const isDemoAccount = currentUser?.email?.toLowerCase() === DEMO_ACCOUNT_EMAIL.toLowerCase();

  // Bug fix: handleExtractTenderDocument(For) below need to know the
  // CURRENTLY selected tender at the moment the upload actually finishes —
  // not whichever tender was selected when that handler closure was first
  // created. In the "upload NIT PDF -> create tender -> extract -> open it"
  // flow (TendersView's __new__ path), create+select+extract+open all
  // happen inside one button-click's async chain, so the `currentTender`
  // closure captured at render time is stale by the time extraction
  // finishes, and the subsequent onOpenExtraction() call re-selects the
  // SAME tender id (a no-op for React, so the fetch-on-select effect never
  // re-fires) — the net effect was a freshly-extracted tender showing
  // "0 Requirements Extracted" until the page was manually refreshed. A
  // ref always holds the live value regardless of which render created the
  // closure reading it.
  const selectedTenderIdRef = useRef(selectedTenderId);
  useEffect(() => {
    selectedTenderIdRef.current = selectedTenderId;
  }, [selectedTenderId]);

  useEffect(() => {
    if (!isDemoAccount) {
      setIsInitialLoading(false);
      return;
    }
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
  }, [isDemoAccount]);

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

  const handleCreateTender = async (newTenderData: any): Promise<Tender> => {
    const created = await tenderService.createTender(newTenderData);
    setTenders((prev) => [created, ...prev]);
    setSelectedTenderId(created.id);
    return created;
  };

  const handleUpdateRequirement = (id: string, updates: Partial<TenderRequirement>) => {
    const updated = tenderService.updateRequirement(id, updates);
    if (updated) {
      setCurrentRequirements((prev) => prev.map((r) => (r.id === id ? updated : r)));
    }
  };

  const handleExtractTenderDocument = async (file: File) => {
    const result = await tenderService.extractTenderDocument(selectedTenderId, file);
    const updatedCached = tenderService.getTenderById(selectedTenderId);
    if (updatedCached) {
      setTenders((prev) => prev.map((t) => (t.id === selectedTenderId ? updatedCached : t)));
    }
    // requirements_extracted means the backend actually re-parsed fields from
    // this PDF and the cached requirements list was rebuilt from them —
    // pull the fresh list into view instead of the stale pre-upload one.
    if (result.requirement && selectedTenderId === selectedTenderIdRef.current) {
      tenderService.getRequirements(selectedTenderId).then(setCurrentRequirements);
    }
    return result;
  };

  // Same as above but for an explicit tenderId, used by TendersView's
  // "Upload Tender Document" modal, which may be extracting for a
  // just-created tender rather than whatever tender is currently selected.
  const handleExtractTenderDocumentFor = async (tenderId: string, file: File) => {
    const result = await tenderService.extractTenderDocument(tenderId, file);
    const updatedCached = tenderService.getTenderById(tenderId);
    if (updatedCached) {
      setTenders((prev) => prev.map((t) => (t.id === tenderId ? updatedCached : t)));
    }
    if (result.requirement && tenderId === selectedTenderIdRef.current) {
      tenderService.getRequirements(tenderId).then(setCurrentRequirements);
    }
    return result;
  };

  const handleDecisionUpdated = (updatedBidder: Bidder) => {
    const updatedList = bidders.map((b) => (b.id === updatedBidder.id ? updatedBidder : b));
    setBidders(updatedList);
  };

  const handleLogout = () => {         
    clearOfficer();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  if (!officer) {
    return <OfficerSelectView onSelect={setOfficer} />;
  }

  if (!isDemoAccount) {                                    // ← naya
    return <NonDemoAccountView userEmail={currentUser?.email} onLogout={handleLogout} />;
  }

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
        onLogout={handleLogout}
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
            onExtractDocumentFor={handleExtractTenderDocumentFor}
          />
        )}

        {activeTab === 'checklist-ai' && (
          <TenderChecklistAI
            tender={currentTender}
            requirements={currentRequirements}
            onUpdateRequirement={handleUpdateRequirement}
            onNavigateToBidders={() => setActiveTab('bidders')}
            onExtractDocument={handleExtractTenderDocument}
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
        {activeTab === 'collusion-signals' && (      // <-- YE POORA BLOCK ADD KARO
          <CollusionSignalsView
            tender={currentTender}
            onSelectBidder={handleSelectBidder}
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

        {activeTab === 'continuous-compliance' && (
          <ComplianceMonitoringView onSelectBidder={handleSelectBidder} />
        )}

        {activeTab === 'audit-trail' && (
          <AuditTrailView onSelectBidder={handleSelectBidder} />
        )}

        {activeTab === 'decision-history' && (
          <DecisionHistoryView onSelectBidder={handleSelectBidder} />
        )}
      </main>

      <SystemGovernanceModal
        isOpen={isGovernanceModalOpen}
        onClose={() => setIsGovernanceModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <OfficerProvider>
      <AppContent />
    </OfficerProvider>
  );
}