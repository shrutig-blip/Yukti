import { apiGet, apiPostJson } from './apiClient';
import {
  MonitoredBidder,
  ComplianceCheckResult,
  ComplianceLapse,
  ComplianceSnapshot,
  RecheckResult,
  SweepResult,
} from '../types';

/**
 * DESIGN NOTES — Continuous Compliance Monitoring frontend integration
 * ------------------------------------------------------------------------
 * Backend: backend/continuous_compliance.py + the /monitoring/* routes in
 * backend/main.py. All field-name mapping (snake_case -> camelCase) happens
 * here, same convention as the other *Service.ts files, so components never
 * touch raw API shapes.
 */

interface RawMonitoredBidder {
  bidder_id: string;
  company_name: string;
  qualified_since: string;
}

interface RawCheckResult {
  check: string;
  passed: boolean;
  status?: string;
  filing_status?: string;
  detail?: string;
  [key: string]: unknown;
}

interface RawLapse {
  id: string;
  bidder_id: string;
  timestamp: string;
  check_type: string;
  previous_status: string;
  current_status: string;
  detail: string;
  snapshot_id: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

interface RawSnapshot {
  id: string;
  bidder_id: string;
  timestamp: string;
  trigger: 'scheduled' | 'manual';
  overall_eligible: boolean;
  checks: RawCheckResult[];
}

// Matches continuous_compliance.recheck_bidder()'s actual return shape —
// deliberately NOT `extends RawSnapshot`, since that function's response has
// no `id`/`trigger` keys and uses `snapshot_id` rather than `id` (the
// stored-snapshot shape from get_snapshot_history() is a different function
// entirely). See the RecheckResult comment in types/index.ts for why these
// are kept separate instead of unified.
interface RawRecheckResult {
  bidder_id: string;
  snapshot_id: string;
  timestamp: string;
  overall_eligible: boolean;
  checks: RawCheckResult[];
  lapses_detected: RawLapse[];
  is_first_check: boolean;
}

interface RawSweepResult {
  run_at: string;
  trigger: 'scheduled' | 'manual';
  bidders_checked: number;
  lapses_detected: number;
  results: RawRecheckResult[];
}

function mapCheck(raw: RawCheckResult): ComplianceCheckResult {
  const { filing_status, ...rest } = raw;
  return {
    ...rest,
    filingStatus: filing_status,
  };
}

function mapLapse(raw: RawLapse): ComplianceLapse {
  return {
    id: raw.id,
    bidderId: raw.bidder_id,
    timestamp: raw.timestamp,
    checkType: raw.check_type,
    previousStatus: raw.previous_status,
    currentStatus: raw.current_status,
    detail: raw.detail,
    snapshotId: raw.snapshot_id,
    acknowledged: raw.acknowledged,
    acknowledgedBy: raw.acknowledged_by,
    acknowledgedAt: raw.acknowledged_at,
  };
}

function mapSnapshot(raw: RawSnapshot): ComplianceSnapshot {
  return {
    id: raw.id,
    bidderId: raw.bidder_id,
    timestamp: raw.timestamp,
    trigger: raw.trigger,
    overallEligible: raw.overall_eligible,
    checks: raw.checks.map(mapCheck),
  };
}

function mapRecheckResult(raw: RawRecheckResult): RecheckResult {
  return {
    bidderId: raw.bidder_id,
    snapshotId: raw.snapshot_id,
    timestamp: raw.timestamp,
    overallEligible: raw.overall_eligible,
    checks: raw.checks.map(mapCheck),
    lapsesDetected: raw.lapses_detected.map(mapLapse),
    isFirstCheck: raw.is_first_check,
  };
}

class MonitoringService {
  /** Bidders currently under continuous monitoring — i.e. in an
   * active/awarded contract (latest officer decision QUALIFIED), not
   * merely a past bidder on some tender. */
  public async getMonitoredBidders(): Promise<MonitoredBidder[]> {
    const raw = await apiGet<RawMonitoredBidder[]>('/monitoring/bidders');
    return raw.map((r) => ({
      bidderId: r.bidder_id,
      companyName: r.company_name,
      qualifiedSince: r.qualified_since,
    }));
  }

  /** Trigger an immediate re-check for one bidder (same logic the
   * scheduled sweep runs, on demand). */
  public async recheckBidder(bidderId: string): Promise<RecheckResult> {
    const raw = await apiPostJson<RawRecheckResult>(`/monitoring/${bidderId}/recheck`, {});
    return mapRecheckResult(raw);
  }

  /** Trigger a full sweep across every monitored bidder — the same job
   * the background scheduler runs automatically. */
  public async runSweep(): Promise<SweepResult> {
    const raw = await apiPostJson<RawSweepResult>('/monitoring/run', {});
    return {
      runAt: raw.run_at,
      trigger: raw.trigger,
      biddersChecked: raw.bidders_checked,
      lapsesDetected: raw.lapses_detected,
      results: raw.results.map(mapRecheckResult),
    };
  }

  /** Detected mid-contract lapses. bidderId scopes to one bidder;
   * acknowledged filters by review status. Leave both undefined for the
   * full feed (newest first), used by the monitoring dashboard. */
  public async getLapses(opts?: { bidderId?: string; acknowledged?: boolean }): Promise<ComplianceLapse[]> {
    const params = new URLSearchParams();
    if (opts?.bidderId) params.set('bidder_id', opts.bidderId);
    if (opts?.acknowledged !== undefined) params.set('acknowledged', String(opts.acknowledged));
    const qs = params.toString();
    const raw = await apiGet<RawLapse[]>(`/monitoring/lapses${qs ? `?${qs}` : ''}`);
    return raw.map(mapLapse);
  }

  /** Every point-in-time compliance snapshot ever taken for a bidder,
   * newest first — powers a compliance-over-time view on the bidder
   * profile / dossier. */
  public async getComplianceHistory(bidderId: string): Promise<ComplianceSnapshot[]> {
    const raw = await apiGet<RawSnapshot[]>(`/bidder/${bidderId}/compliance-history`);
    return raw.map(mapSnapshot);
  }

  public async acknowledgeLapse(lapseId: string, officerName: string): Promise<ComplianceLapse> {
    const raw = await apiPostJson<RawLapse>(`/monitoring/lapses/${lapseId}/acknowledge`, {
      officer_name: officerName,
    });
    return mapLapse(raw);
  }
}

export const monitoringService = new MonitoringService();
