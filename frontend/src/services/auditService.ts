import { apiGet, apiPostJson } from './apiClient';
import { AuditRecord } from '../types';

/**
 * DESIGN NOTES — real backend integration for the "Recent Verification
 * Activity" feed
 * ------------------------------------------------------------------------
 * GET /audit/recent-activity runs the real GST/PAN/Udyam/Blacklist/EPFO
 * checks (via data_loader.verify_bidder_credentials) and returns individual
 * check results, failed checks first. There is no stored historical
 * audit-trail table backing this — it's a live snapshot, not a log of past
 * events, so "timestamp" reflects when the check was run (now).
 *
 * check_type -> source portal name, and passed -> AuditRecord['result']
 * mapping below are the only judgment calls here; everything else
 * (bidder_name, detail, reference_id) passes straight through from the
 * backend's real data.
 */

interface RawActivityItem {
  bidder_id: string;
  bidder_name: string;
  check_type: 'gst' | 'pan' | 'udyam' | 'blacklist' | 'epfo_esic';
  passed: boolean;
  detail: string;
  reference_id: string;
  timestamp: string; // ISO string
}

const CHECK_TYPE_LABELS: Record<RawActivityItem['check_type'], { action: string; source: string }> = {
  gst: { action: 'GST Status Check', source: 'GST Portal (mock)' },
  pan: { action: 'PAN Verification', source: 'Income Tax / PAN Portal (mock)' },
  udyam: { action: 'Udyam Registration Check', source: 'Udyam Registration Portal (mock)' },
  blacklist: { action: 'Blacklist / Debarment Check', source: 'CVC / GeM Debarred Registry (mock)' },
  epfo_esic: { action: 'EPFO / ESIC Compliance Check', source: 'EPFO / ESIC Portal (mock)' },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) +
    ' IST'
  );
}

function mapRawActivity(raw: RawActivityItem): AuditRecord {
  const { action, source } = CHECK_TYPE_LABELS[raw.check_type];
  return {
    id: raw.reference_id,
    timestamp: formatTimestamp(raw.timestamp),
    actor: 'Yukti Verification Engine',
    role: 'AI Verification Engine',
    action,
    source,
    result: raw.passed ? 'PASS' : 'DISCREPANCY',
    evidenceRef: raw.reference_id,
    comments: raw.detail,
    bidderId: raw.bidder_id,
  };
}

class AuditService {
  /**
   * bidderId given -> GET /bidder/{id}/audit-log (real, single-bidder).
   * bidderId omitted -> GET /audit/recent-activity (real, across all
   * bidders — used by the global Audit Trail view).
   */
  public async getRecords(bidderId?: string): Promise<AuditRecord[]> {
    const path = bidderId ? `/bidder/${bidderId}/audit-log` : '/audit/recent-activity?limit=50';
    return apiGet<AuditRecord[]>(path);
  }

  /**
   * Real backend-driven activity feed (used by the Dashboard's "Recent
   * Verification Activity" panel). Separate from getRecords() on purpose —
   * this maps raw per-check results into the AuditRecord shape the
   * dashboard expects.
   */
  public async getRecentActivity(limit: number = 10): Promise<AuditRecord[]> {
     return apiGet<AuditRecord[]>(`/audit/recent-activity?limit=${limit}`);
  }

  /**
   * Officer-triggered actions (decisions, manual re-verification, sent
   * clarifications) are persisted to the real backend audit log for that
   * bidder. Fire-and-forget: none of the current call sites use the return
   * value, and a slow/failed log write shouldn't block the officer's
   * actual action (decision, clarification, re-verification).
   */
  public logEvent(event: Omit<AuditRecord, 'id' | 'timestamp'>): void {
    if (!event.bidderId) {
      console.warn('auditService.logEvent called without bidderId — cannot persist without one.');
      return;
    }
    apiPostJson(`/bidder/${event.bidderId}/audit-log`, {
      actor: event.actor,
      role: event.role,
      action: event.action,
      source: event.source,
      result: event.result,
      evidence_ref: event.evidenceRef,
      comments: event.comments,
    }).catch((err) => console.warn('Failed to persist audit event:', err));
  }

  /** Now takes the records to export explicitly — data lives in component
   * state (fetched async) rather than a synchronous in-memory array on the
   * service, so callers pass whatever list they currently have on screen. */
  public exportAuditLogAsCSV(records: AuditRecord[]): string {
    const header = ['Audit ID', 'Timestamp', 'Actor', 'Role', 'Action', 'Source', 'Result', 'Evidence Ref', 'Comments'];
    const rows = records.map((r) => [
      r.id,
      r.timestamp,
      r.actor,
      r.role,
      `"${r.action}"`,
      `"${r.source}"`,
      r.result,
      `"${r.evidenceRef || ''}"`,
      `"${(r.comments || '').replace(/"/g, '""')}"`,
    ]);
    return [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}

export const auditService = new AuditService();
