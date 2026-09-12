import { Bidder } from '../types';

export type AlertSeverity = 'CRITICAL' | 'HIGH';

export interface ComplianceAlert {
  id: string;
  bidderId: string;
  bidderName: string;
  tenderId: string; 
  severity: AlertSeverity;
  title: string;
  message: string;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { CRITICAL: 0, HIGH: 1 };

export function getComplianceAlerts(bidders: Bidder[], maxAlerts = 3): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];

  bidders.forEach((b) => {
    if (b.turnoverMismatch) {
      alerts.push({
        id: `${b.id}-turnover`,
        bidderId: b.id,
        bidderName: b.name,
        tenderId: b.tenderId,
        severity: 'CRITICAL',
        title: 'Turnover Mismatch Detected',
        message: `${b.name}: Declared ₹${b.declaredTurnoverCr} Cr vs Audited ₹${b.auditedTurnoverCr} Cr`,
      });
    }

    if (b.oemAuthorizationStatus === 'EXPIRED') {
      alerts.push({
        id: `${b.id}-oem-expired`,
        bidderId: b.id,
        bidderName: b.name,
        tenderId: b.tenderId,
        severity: 'CRITICAL',
        title: 'OEM Authorization Expired',
        message: `${b.name}: Authorization expired on ${b.oemAuthorizationExpiry}`,
      });
    } else if (b.oemAuthorizationStatus === 'EXPIRING_SOON') {
      alerts.push({
        id: `${b.id}-oem-expiring`,
        bidderId: b.id,
        bidderName: b.name,
        tenderId: b.tenderId,
        severity: 'HIGH',
        title: 'OEM Authorization Expiring Soon',
        message: `${b.name}: Authorization ends on ${b.oemAuthorizationExpiry}`,
      });
    }
  });

  return alerts
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, maxAlerts);
}