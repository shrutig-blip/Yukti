import { apiGet } from './apiClient';
import { Bidder, OfficerDecision, SeverityLevel } from '../types';

/**
 * DESIGN NOTES — field mapping & modeling decisions (read before editing)
 * ------------------------------------------------------------------------
 * Backend `bidders.csv` fields -> frontend `Bidder` fields:
 *   bidder_id            -> id
 *   company_name         -> name
 *   pan_number            -> pan
 *   gst_number            -> gstin
 *   udyam_number          -> udyam
 *   registration_date    -> incorporationDate (backend calls it
 *                           "registration_date"; it's the closest real field
 *                           to "incorporation date" — not a separate
 *                           incorporation-specific date, flagged here.)
 *   state                 -> registeredAddress (backend only stores
 *                           state-level location, not a street address —
 *                           this is a deliberate approximation, not a full
 *                           address, flagged in case anyone builds an
 *                           address-formatting feature on top of it later.)
 *
 * ONE-TENDER-PER-BIDDER MODEL: `tender_bids.csv` is many-to-many (a bidder
 * can bid on multiple tenders) but the `Bidder` type has a single
 * `tenderId`. For each bidder we pick their lowest tender_id (sorted
 * alphabetically) as the "primary" tender for score/risk display when no
 * tenderId is specified. When a `tenderId` IS specified (e.g. the Bidders
 * list filtered to one tender), we use THAT tender for the compliance/risk
 * calculation instead, since that's the contextually correct one.
 *
 * compliance_score / risk_level -> come straight from
 * GET /compliance/{bidder_id}/{tender_id} (see data_loader.calculate_compliance_score
 * on the backend for how those are derived — real, not invented here).
 *
 * verificationProgress: the backend has no partial/in-progress verification
 * state — every GET /verify/{bidder_id} call is a complete, synchronous
 * check across GST/PAN/Udyam/blacklist. So once a bidder's data has loaded,
 * verificationProgress is set to 100 (fully checked); it is NOT a real
 * "percent complete" metric because the backend doesn't expose one.
 *
 * discrepanciesCount: derived from real data — count of failed statutory
 * checks (GST/PAN/Udyam/blacklist) plus failed tender-eligibility criteria.
 * criticalAlertsCount: 1 if the bidder is blacklisted, else 0 (real).
 * documentsCount: NOT tracked by the backend (no document vault yet) — 0.
 *
 * status: the backend has no officer-decision workflow. Every bidder starts
 * 'Pending Review'; recordOfficerDecision() below still works exactly as it
 * did against the mock — it mutates the in-memory cache client-side only.
 * There is no backend endpoint to persist an officer decision.
 */

interface RawBidder {
  bidder_id: string;
  company_name: string;
  pan_number: string;
  gst_number: string;
  udyam_number: string;
  category: string;
  state: string;
  registration_date: string;
  known_issue_tags: string;
  local_content_percent: number;
  annual_turnover_cr: number;
  is_startup: boolean;
}

interface RawBid {
  tender_id: string;
  bidder_id: string;
  bid_submitted_date: string;
}

interface RawComplianceResult {
  overall_compliant: boolean;
  details: Array<{ criterion: string; passed: boolean }>;
  compliance_score: number;
  risk_level: SeverityLevel;
  risk_score: number;
  risk_rationale: string;
}

interface RawVerifyResult {
  overall_eligible: boolean;
  checks: Array<{ check: string; passed: boolean }>;
}

class BidderService {
  private cache: Bidder[] = [];
  private bidderTenderMap: Map<string, string[]> = new Map();
  private loaded = false;

  private async ensureBidTenderMap(): Promise<void> {
    if (this.bidderTenderMap.size > 0) return;
    const bids = await apiGet<RawBid[]>('/bids');
    const map = new Map<string, string[]>();
    for (const b of bids) {
      const list = map.get(b.bidder_id) || [];
      list.push(b.tender_id);
      map.set(b.bidder_id, list);
    }
    for (const [id, tenderIds] of map) {
      map.set(id, [...new Set(tenderIds)].sort());
    }
    this.bidderTenderMap = map;
  }

  private async mapRawBidder(raw: RawBidder, tenderId: string): Promise<Bidder> {
    let compliance: RawComplianceResult | null = null;
    let verify: RawVerifyResult | null = null;
    try {
      [compliance, verify] = await Promise.all([
        apiGet<RawComplianceResult>(`/compliance/${raw.bidder_id}/${tenderId}`),
        apiGet<RawVerifyResult>(`/verify/${raw.bidder_id}`),
      ]);
    } catch {
      // Leave compliance/verify null — bidder still renders with defaults
      // below rather than the whole list failing on one bad record.
    }

    const failedEligibility = compliance
      ? compliance.details.filter((d) => !d.passed).length
      : 0;
    const failedStatutory = verify
      ? verify.checks.filter((c) => !c.passed).length
      : 0;
    const isBlacklisted = verify
      ? verify.checks.some((c) => c.check === 'blacklist' && !c.passed)
      : false;

    return {
      id: raw.bidder_id,
      name: raw.company_name,
      pan: raw.pan_number,
      gstin: raw.gst_number,
      udyam: raw.udyam_number,
      tenderId,
      complianceScore: compliance?.compliance_score ?? 0,
      riskLevel: compliance?.risk_level ?? 'LOW',
      verificationProgress: compliance || verify ? 100 : 0,
      status: 'Pending Review',
      documentsCount: 0,
      discrepanciesCount: failedEligibility + failedStatutory,
      criticalAlertsCount: isBlacklisted ? 1 : 0,
      incorporationDate: raw.registration_date,
      registeredAddress: raw.state,
    };
  }

  public async getBidders(tenderId?: string): Promise<Bidder[]> {
    await this.ensureBidTenderMap();
    const rawBidders = await apiGet<RawBidder[]>('/bidders');

    const targets: Array<{ raw: RawBidder; tenderId: string }> = [];
    for (const raw of rawBidders) {
      const tenderIds = this.bidderTenderMap.get(raw.bidder_id) || [];
      if (tenderIds.length === 0) continue;
      if (tenderId) {
        if (tenderIds.includes(tenderId)) {
          targets.push({ raw, tenderId });
        }
      } else {
        targets.push({ raw, tenderId: tenderIds[0] });
      }
    }

    const mapped = await Promise.all(
      targets.map(({ raw, tenderId: tid }) => this.mapRawBidder(raw, tid))
    );

    if (!tenderId) {
      this.cache = mapped;
      this.loaded = true;
    } else {
      for (const b of mapped) {
        const idx = this.cache.findIndex((c) => c.id === b.id);
        if (idx === -1) this.cache.push(b);
      }
    }

    return mapped;
  }

  public async getBidderById(id: string): Promise<Bidder | undefined> {
    if (this.loaded) {
      const cached = this.cache.find((b) => b.id === id);
      if (cached) return cached;
    }
    await this.ensureBidTenderMap();
    const tenderIds = this.bidderTenderMap.get(id) || [];
    if (tenderIds.length === 0) return undefined;
    const raw = await apiGet<RawBidder>(`/bidder/${id}`);
    const bidder = await this.mapRawBidder(raw, tenderIds[0]);
    const idx = this.cache.findIndex((c) => c.id === id);
    if (idx === -1) this.cache.push(bidder);
    else this.cache[idx] = bidder;
    return bidder;
  }

  public recordOfficerDecision(bidderId: string, decision: OfficerDecision): Bidder | null {
    const index = this.cache.findIndex((b) => b.id === bidderId);
    if (index === -1) return null;

    let newStatus: Bidder['status'] = 'Pending Review';
    if (decision.decision === 'QUALIFIED') newStatus = 'Qualified';
    else if (decision.decision === 'DISQUALIFIED') newStatus = 'Disqualified';
    else if (decision.decision === 'CLARIFICATION_REQUESTED') newStatus = 'Clarification Requested';
    else newStatus = 'Pending Review';

    this.cache[index] = {
      ...this.cache[index],
      status: newStatus,
      officerDecision: decision,
    };
    return this.cache[index];
  }

  public updateVerificationProgress(bidderId: string, progress: number, newScore?: number): void {
    const bidder = this.cache.find((b) => b.id === bidderId);
    if (bidder) {
      bidder.verificationProgress = progress;
      if (newScore !== undefined) {
        bidder.complianceScore = newScore;
      }
    }
  }
}

export const bidderService = new BidderService();
