import { apiGet } from './apiClient';
import { mockAuditRecords } from '../data/mockData';
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
  private records: AuditRecord[] = [...mockAuditRecords];

  public getRecords(bidderId?: string): AuditRecord[] {
    if (bidderId) {
      return this.records.filter((r) => !r.bidderId || r.bidderId === bidderId);
    }
    return this.records;
  }

  /**
   * Real backend-driven activity feed (used by the Dashboard's "Recent
   * Verification Activity" panel). Separate from getRecords()/this.records
   * on purpose — this.records stays mock/manual-log data as before;
   * nothing here mutates it.
   */
  public async getRecentActivity(limit: number = 10): Promise<AuditRecord[]> {
    const raw = await apiGet<RawActivityItem[]>(`/audit/recent-activity?limit=${limit}`);
    return raw.map(mapRawActivity);
  }

  public logEvent(event: Omit<AuditRecord, 'id' | 'timestamp'>): AuditRecord {
    const newRecord: AuditRecord = {
      id: `AUD-${Math.floor(8800 + Math.random() * 1000)}`,
      timestamp: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      ...event,
    };
    this.records.unshift(newRecord);
    return newRecord;
  }

  public exportAuditLogAsCSV(): string {
    const header = ['Audit ID', 'Timestamp', 'Actor', 'Role', 'Action', 'Source', 'Result', 'Evidence Ref', 'Comments'];
    const rows = this.records.map((r) => [
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