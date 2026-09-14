import { apiGet, apiPostJson } from './apiClient';
import { OfficerDecision } from '../types';

/**
 * Wires the Officer Decision flow to the REAL backend endpoints:
 *   POST /bidder/{bidder_id}/decision  (data_loader.record_officer_decision)
 *   GET  /bidder/{bidder_id}/decision  (data_loader.get_officer_decision)
 *
 * Both persist to data/data/officer_decisions.csv on the backend — this
 * replaces the previous client-only implementation in bidderService.ts,
 * which only mutated an in-memory cache and lost every decision on
 * refresh despite the backend already supporting real persistence.
 */

interface RawOfficerDecision {
  id?: string;
  bidder_id: string;
  decision: OfficerDecision['decision'] | null;
  officer_name?: string;
  officer_designation?: string;
  timestamp?: string;
  comments?: string | null;
  conditions_or_stipulations?: string | null;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) +
    ' IST'
  );
}

function toOfficerDecision(raw: RawOfficerDecision): OfficerDecision {
  return {
    decision: raw.decision as OfficerDecision['decision'],
    officerName: raw.officer_name || '',
    officerDesignation: raw.officer_designation || '',
    timestamp: raw.timestamp ? formatTimestamp(raw.timestamp) : '',
    comments: raw.comments || '',
    conditionsOrStipulations: raw.conditions_or_stipulations || undefined,
  };
}

class DecisionService {
  /** Latest recorded decision for this bidder, or null if none exists yet. */
  public async getDecision(bidderId: string): Promise<OfficerDecision | null> {
    try {
      const raw = await apiGet<RawOfficerDecision>(`/bidder/${bidderId}/decision`);
      if (!raw || !raw.decision) return null;
      return toOfficerDecision(raw);
    } catch {
      // Backend unreachable / bidder not found — treat as "no decision yet"
      // rather than crashing the profile view.
      return null;
    }
  }

  public async submitDecision(
    bidderId: string,
    decision: OfficerDecision['decision'],
    officerName: string,
    officerDesignation: string,
    comments: string,
    conditionsOrStipulations?: string
  ): Promise<OfficerDecision> {
    const raw = await apiPostJson<RawOfficerDecision>(`/bidder/${bidderId}/decision`, {
      decision,
      officer_name: officerName,
      officer_designation: officerDesignation,
      comments,
      conditions_or_stipulations: conditionsOrStipulations || null,
    });
    return toOfficerDecision(raw);
  }

  /**
   * Every decision ever recorded, across ALL bidders — powers the
   * "Decision History" list view. Backed by GET /decisions
   * (data_loader.get_all_decisions), which reads the full
   * officer_decisions.csv rather than just the latest row per bidder.
   */
  public async getAllDecisions(): Promise<Array<{
    id: string;
    bidder_id: string;
    bidder_name: string;
    decision: string;
    officer_name: string;
    officer_designation: string;
    timestamp: string;
    comments: string | null;
    conditions_or_stipulations: string | null;
  }>> {
    return apiGet('/decisions');
  }
}

export const decisionService = new DecisionService();