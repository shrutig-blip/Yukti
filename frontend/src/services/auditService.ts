import { mockAuditRecords } from '../data/mockData';
import { AuditRecord } from '../types';

class AuditService {
  private records: AuditRecord[] = [...mockAuditRecords];

  public getRecords(bidderId?: string): AuditRecord[] {
    if (bidderId) {
      return this.records.filter((r) => !r.bidderId || r.bidderId === bidderId);
    }
    return this.records;
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
