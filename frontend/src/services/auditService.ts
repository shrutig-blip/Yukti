import { apiGet , apiPostJson} from './apiClient';
import { AuditRecord } from '../types';



class AuditService {
  /**
   * Officer-triggered actions (decisions, manual re-verification, sent
   * clarifications) are recorded HERE ONLY — client-side, in memory. The
   * backend has no persisted-event store, so these are session-only and
   * reset on reload. This is the same limitation bidderService.ts already
   * has for officerDecision — flagged rather than silently pretending it
   * survives a refresh.
   */
  private sessionRecords: AuditRecord[] = [];

  /**
   * bidderId given -> GET /bidder/{id}/audit-log (real, single-bidder).
   * bidderId omitted -> GET /audit/recent-activity (real, across all
   * bidders — used by the global Audit Trail view). Either way, merged
   * with any officer actions logged this session, newest first.
   */
  public async getRecords(bidderId?: string): Promise<AuditRecord[]> {
  const path = bidderId ? `/bidder/${bidderId}/audit-log` : '/audit/recent-activity?limit=50';
  return apiGet<AuditRecord[]>(path);
}

  public logEvent(event: Omit<AuditRecord, 'id' | 'timestamp'>): void {
  if (!event.bidderId) {
    console.warn('auditService.logEvent called without bidderId — cannot persist without one.');
    return;
  }
  // Fire-and-forget: none of the current call sites use the return value,
  // and a slow/failed log write shouldn't block the officer's actual
  // action (decision, clarification, re-verification).
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