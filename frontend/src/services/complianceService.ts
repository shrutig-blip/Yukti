import { apiGet } from './apiClient';
import { ContradictionItem, ComplianceBreakdown, SeverityLevel } from '../types';

/**
 * DESIGN NOTES — field mapping & modeling decisions
 * ---------------------------------------------------
 * Both methods below now require a tenderId, because compliance/risk is
 * inherently a (bidder, tender) pair on the backend — GET
 * /compliance/{bidder_id}/{tender_id} — not a bidder-only concept. This is
 * a real signature change from the mock (getContradictions(bidderId) ->
 * getContradictions(bidderId, tenderId)), so every call site was updated.
 *
 * getBreakdown(): statutoryCompliance and tenderEligibility come straight
 * from score_breakdown.statutory_score / .eligibility_score in the real
 * GET /compliance response (see data_loader.calculate_compliance_score on
 * the backend). documentCompleteness, financialCompliance and
 * authorizationCompliance have NO backend equivalent (no document vault, no
 * financial audit beyond the turnover check already counted in
 * tenderEligibility, no OEM authorization tracking) — rather than inventing
 * numbers for them, they're set to 0 and flagged via the optional
 * `dataSource` map ('real' vs 'not_tracked') so the UI can show that
 * honestly instead of presenting fake precision.
 *
 * getContradictions(): derived from two REAL sources, not fabricated:
 *   1. Failed tender-eligibility criteria (GET /compliance...details) —
 *      these already carry a `required` vs `bidder_value` pair, which maps
 *      directly onto ContradictionItem.sources as
 *      [{source:'Required (tender)'}, {source:'Bidder declared'}].
 *   2. Failed statutory checks (GET /verify/{bidder_id}.checks) — GST, PAN,
 *      Udyam, blacklist. These don't carry a declared-vs-actual pair (the
 *      backend only exposes a name_match boolean, not the two names), so
 *      the "source" side is the portal's own status/detail/reason field.
 * Severity mirrors the backend's own worst-factor-wins convention: a
 * blacklist failure is CRITICAL, a failed eligibility criterion is HIGH,
 * any other failed statutory check is MEDIUM — the same tiers
 * data_loader.calculate_compliance_score uses, so the two views of the data
 * (score card vs. contradiction list) don't disagree with each other.
 */

interface RawComplianceDetail {
  criterion: string;
  required: any;
  bidder_value: any;
  passed: boolean;
  note?: string;
}

interface RawComplianceResult {
  bidder_id: string;
  tender_id: string;
  overall_compliant: boolean;
  details: RawComplianceDetail[];
  compliance_score: number;
  score_breakdown: {
    eligibility_score: number;
    statutory_score: number;
    weights: { eligibility: number; statutory: number };
  };
  risk_level: SeverityLevel;
  risk_score: number;
  risk_rationale: string;
}

interface RawVerifyCheck {
  check: string;
  passed: boolean;
  status?: string;
  filing_status?: string;
  it_compliance_status?: string;
  detail?: string;
  reason?: string | null;
  name_match?: boolean;
}

interface RawVerifyResult {
  bidder_id: string;
  overall_eligible: boolean;
  checks: RawVerifyCheck[];
}

const CRITERION_LABELS: Record<string, string> = {
  annual_turnover_cr: 'Annual Turnover',
  local_content_percent: 'Local Content %',
  category_allowed: 'Bidder Category',
  msme_only: 'MSME Reservation',
};

const CHECK_LABELS: Record<string, string> = {
  gst: 'GST Registration',
  pan: 'PAN Compliance',
  udyam: 'Udyam Registration',
  blacklist: 'Blacklist / Debarment',
  epfo_esic: 'EPFO / ESIC Compliance',
};

class ComplianceService {
  private contradictionsCache: Map<string, ContradictionItem[]> = new Map();

  private cacheKey(bidderId: string, tenderId: string): string {
    return `${bidderId}:${tenderId}`;
  }

  public async getContradictions(bidderId: string, tenderId: string): Promise<ContradictionItem[]> {
    const key = this.cacheKey(bidderId, tenderId);
    if (this.contradictionsCache.has(key)) {
      return this.contradictionsCache.get(key)!;
    }

    const [compliance, verify] = await Promise.all([
      apiGet<RawComplianceResult>(`/compliance/${bidderId}/${tenderId}`),
      apiGet<RawVerifyResult>(`/verify/${bidderId}`),
    ]);

    const items: ContradictionItem[] = [];

    for (const detail of compliance.details) {
      if (detail.passed) continue;
      items.push({
        id: `${key}-${detail.criterion}`,
        bidderId,
        field: CRITERION_LABELS[detail.criterion] || detail.criterion,
        sources: [
          { source: 'Required (tender criteria)', value: String(detail.required) },
          { source: 'Bidder declared', value: String(detail.bidder_value) },
        ],
        assessment: `Does not meet the tender's ${CRITERION_LABELS[detail.criterion] || detail.criterion} requirement.`,
        severity: 'HIGH',
        recommendation: 'Request clarification or supporting documentation from the bidder before proceeding.',
        status: 'Active',
        evidenceRef: `GET /compliance/${bidderId}/${tenderId}`,
      });
    }

    for (const check of verify.checks) {
      if (check.passed) continue;
      const detailParts = [
        check.status ? `Status: ${check.status}` : null,
        check.filing_status ? `Filing: ${check.filing_status}` : null,
        check.it_compliance_status ? `IT compliance: ${check.it_compliance_status}` : null,
        check.detail || null,
        check.reason ? `Reason: ${check.reason}` : null,
        check.name_match === false ? 'Registered name does not match bidder company name' : null,
      ].filter(Boolean);

      items.push({
        id: `${key}-${check.check}`,
        bidderId,
        field: CHECK_LABELS[check.check] || check.check,
        sources: [
          { source: `${CHECK_LABELS[check.check] || check.check} portal`, value: detailParts.join('; ') || 'Check failed' },
        ],
        assessment: `${CHECK_LABELS[check.check] || check.check} check did not pass.`,
        severity: check.check === 'blacklist' ? 'CRITICAL' : 'MEDIUM',
        recommendation:
          check.check === 'blacklist'
            ? 'Bidder is on the debarred-vendor registry — this is an absolute bar per CVC vigilance guidance, not a scored deduction.'
            : 'Request an updated certificate or clarification from the bidder before proceeding.',
        status: 'Active',
        evidenceRef: `GET /verify/${bidderId}`,
      });
    }

    this.contradictionsCache.set(key, items);
    return items;
  }

  public async getBreakdown(bidderId: string, tenderId: string): Promise<ComplianceBreakdown> {
    const compliance = await apiGet<RawComplianceResult>(`/compliance/${bidderId}/${tenderId}`);
    return {
      statutoryCompliance: compliance.score_breakdown.statutory_score,
      documentCompleteness: 0,
      tenderEligibility: compliance.score_breakdown.eligibility_score,
      financialCompliance: 0,
      authorizationCompliance: 0,
      dataSource: {
        statutoryCompliance: 'real',
        tenderEligibility: 'real',
        documentCompleteness: 'not_tracked',
        financialCompliance: 'not_tracked',
        authorizationCompliance: 'not_tracked',
      },
    };
  }

  public markContradictionReviewed(id: string): ContradictionItem | null {
    for (const [key, list] of this.contradictionsCache) {
      const item = list.find((c) => c.id === id);
      if (item) {
        item.status = 'Reviewed';
        return item;
      }
    }
    return null;
  }

  public calculateWeightedScore(breakdown: ComplianceBreakdown): number {
    const score =
      breakdown.statutoryCompliance * 0.2 +
      breakdown.documentCompleteness * 0.2 +
      breakdown.tenderEligibility * 0.25 +
      breakdown.financialCompliance * 0.2 +
      breakdown.authorizationCompliance * 0.15;
    return Math.round(score);
  }
}

export const complianceService = new ComplianceService();
