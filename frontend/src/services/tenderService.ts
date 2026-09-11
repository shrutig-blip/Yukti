import { apiGet } from './apiClient';
import { Tender, TenderRequirement, SeverityLevel } from '../types';

/**
 * DESIGN NOTES — field mapping & modeling decisions
 * ---------------------------------------------------
 * Backend `tender_criteria.csv` fields -> frontend `Tender` fields:
 *   tender_id     -> id
 *   tender_title  -> title (real)
 *   department, deadline, estimatedValue, extractedDate -> NOT tracked by
 *     the backend at all. Rather than inventing plausible-looking values,
 *     these are explicitly set to the literal string 'Not tracked by backend'
 *     so it's visually obvious in the UI that no real data exists for them.
 *   description   -> composed (not invented) from the real criteria fields:
 *     min turnover, min local content %, allowed categories, MSME-only,
 *     startup relaxation. Every number in it comes straight from
 *     tender_criteria.csv.
 *   biddersCount  -> real count of bidders who bid on this tender
 *     (tender_bids.csv, via GET /bids).
 *   verifiedCount -> real count of those bidders whose calculated risk_level
 *     is LOW (see data_loader.calculate_compliance_score on the backend).
 *   pendingCount  -> biddersCount - verifiedCount.
 *   overallStatus -> derived aggregate over the same per-bidder risk levels:
 *     any CRITICAL  -> 'Non-Compliant'
 *     else any HIGH/MEDIUM -> 'Review Required'
 *     else (all LOW, and at least 1 bidder) -> 'Compliant'
 *     else (0 bidders) -> 'Pending Verification'
 *
 * getRequirements(): the backend has no per-requirement checklist endpoint —
 * only aggregate tender_criteria fields. We synthesize a TenderRequirement[]
 * by turning each real criterion into one checklist row (turnover, local
 * content %, category, and MSME-only when applicable). Because pass/fail for
 * these is inherently per-BIDDER (not per-tender), each synthesized
 * requirement's `status` is left 'PENDING' as a template default — actual
 * per-bidder pass/fail is shown elsewhere (BidderProfileView,
 * ComplianceAnalysisView), which pull the real per-bidder result from
 * GET /compliance/{bidder_id}/{tender_id}.
 *
 * createTender() / updateRequirement(): there is no backend endpoint for
 * creating tenders or editing requirements (POST /tenders does not exist).
 * These remain session-local, in-memory operations on the cache below,
 * exactly as they were against the mock — flagged here so it's clear this
 * part is NOT wired to the backend and will not persist across a reload.
 */

interface RawTenderCriteria {
  tender_id: string;
  tender_title: string;
  category_allowed: string;
  min_turnover_cr: number;
  min_local_content_percent: number;
  msme_only: boolean;
  startup_relaxation: boolean;
}

interface RawBid {
  tender_id: string;
  bidder_id: string;
  bid_submitted_date: string;
}

interface RawComplianceResult {
  risk_level: SeverityLevel;
}

const NOT_TRACKED = 'Not tracked by backend';

function nowFormatted(): string {
  return (
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) +
    ' IST'
  );
}

function buildDescription(c: RawTenderCriteria): string {
  const parts = [
    `Min. turnover: ₹${c.min_turnover_cr} Cr`,
    `Min. local content: ${c.min_local_content_percent}%`,
    `Categories allowed: ${c.category_allowed.split(';').join(', ')}`,
    `MSME-only: ${c.msme_only ? 'Yes' : 'No'}`,
    `Startup turnover relaxation: ${c.startup_relaxation ? 'Yes (GFR Rule 173)' : 'No'}`,
  ];
  return parts.join(' · ');
}

function buildRequirements(c: RawTenderCriteria): TenderRequirement[] {
  const reqs: TenderRequirement[] = [
    {
      id: `${c.tender_id}-REQ-TURNOVER`,
      tenderId: c.tender_id,
      requirement: `Minimum annual turnover of ₹${c.min_turnover_cr} Cr`,
      evidenceRequired: 'Audited financial statements / turnover certificate',
      isMandatory: true,
      verificationMethod: c.startup_relaxation
        ? 'bidder.annual_turnover_cr >= min_turnover_cr (DPIIT startup relaxation under GFR Rule 173 may exempt eligible startups)'
        : 'bidder.annual_turnover_cr >= min_turnover_cr',
      status: 'PENDING',
      category: 'Financial',
      officerConfirmed: false,
      remarks: 'Per-bidder pass/fail is calculated individually — see the Bidder Profile or Compliance Analysis view.',
      evidenceSource: 'backend: tender_criteria.csv',
      lastUpdated: nowFormatted(),
    },
    {
      id: `${c.tender_id}-REQ-LOCALCONTENT`,
      tenderId: c.tender_id,
      requirement: `Minimum local content of ${c.min_local_content_percent}%`,
      evidenceRequired: 'Local content declaration',
      isMandatory: true,
      verificationMethod: 'bidder.local_content_percent >= min_local_content_percent',
      status: 'PENDING',
      category: 'Technical / Experience',
      officerConfirmed: false,
      remarks: 'Per-bidder pass/fail is calculated individually — see the Bidder Profile or Compliance Analysis view.',
      evidenceSource: 'backend: tender_criteria.csv',
      lastUpdated: nowFormatted(),
    },
    {
      id: `${c.tender_id}-REQ-CATEGORY`,
      tenderId: c.tender_id,
      requirement: `Bidder category must be one of: ${c.category_allowed.split(';').join(', ')}`,
      evidenceRequired: 'Registration / category declaration',
      isMandatory: true,
      verificationMethod: 'bidder.category in category_allowed',
      status: 'PENDING',
      category: 'Technical / Experience',
      officerConfirmed: false,
      remarks: 'Per-bidder pass/fail is calculated individually — see the Bidder Profile or Compliance Analysis view.',
      evidenceSource: 'backend: tender_criteria.csv',
      lastUpdated: nowFormatted(),
    },
  ];

  if (c.msme_only) {
    reqs.push({
      id: `${c.tender_id}-REQ-MSMEONLY`,
      tenderId: c.tender_id,
      requirement: 'Tender is MSME-reserved (non-OEM bidders only)',
      evidenceRequired: 'Udyam / MSME registration',
      isMandatory: true,
      verificationMethod: "bidder.category != 'OEM'",
      status: 'PENDING',
      category: 'Statutory',
      officerConfirmed: false,
      remarks: 'Per-bidder pass/fail is calculated individually — see the Bidder Profile or Compliance Analysis view.',
      evidenceSource: 'backend: tender_criteria.csv',
      lastUpdated: nowFormatted(),
    });
  }

  return reqs;
}

class TenderService {
  private tendersCache: Tender[] = [];
  private requirementsCache: Map<string, TenderRequirement[]> = new Map();

  public async getTenders(): Promise<Tender[]> {
    const [criteriaList, bids] = await Promise.all([
      apiGet<RawTenderCriteria[]>('/tenders'),
      apiGet<RawBid[]>('/bids'),
    ]);

    const bidsByTender = new Map<string, string[]>();
    for (const b of bids) {
      const list = bidsByTender.get(b.tender_id) || [];
      list.push(b.bidder_id);
      bidsByTender.set(b.tender_id, list);
    }

    const tenders: Tender[] = await Promise.all(
      criteriaList.map(async (c) => {
        const bidderIds = bidsByTender.get(c.tender_id) || [];
        const riskLevels = await Promise.all(
          bidderIds.map(async (bidderId) => {
            try {
              const result = await apiGet<RawComplianceResult>(
                `/compliance/${bidderId}/${c.tender_id}`
              );
              return result.risk_level;
            } catch {
              return null;
            }
          })
        );
        const validLevels = riskLevels.filter((l): l is SeverityLevel => l !== null);
        const verifiedCount = validLevels.filter((l) => l === 'LOW').length;
        const biddersCount = bidderIds.length;
        const pendingCount = biddersCount - verifiedCount;

        let overallStatus: Tender['overallStatus'];
        if (biddersCount === 0) {
          overallStatus = 'Pending Verification';
        } else if (validLevels.some((l) => l === 'CRITICAL')) {
          overallStatus = 'Non-Compliant';
        } else if (validLevels.some((l) => l === 'HIGH' || l === 'MEDIUM')) {
          overallStatus = 'Review Required';
        } else {
          overallStatus = 'Compliant';
        }

        const requirements = buildRequirements(c);
        this.requirementsCache.set(c.tender_id, requirements);

        return {
          id: c.tender_id,
          title: c.tender_title,
          department: NOT_TRACKED,
          deadline: NOT_TRACKED,
          estimatedValue: NOT_TRACKED,
          biddersCount,
          verifiedCount,
          pendingCount,
          overallStatus,
          description: buildDescription(c),
          requirementsCount: requirements.length,
          extractedDate: NOT_TRACKED,
        };
      })
    );

    this.tendersCache = tenders;
    return tenders;
  }

  public getTenderById(id: string): Tender | undefined {
    return this.tendersCache.find((t) => t.id === id);
  }

  public async getRequirements(tenderId: string): Promise<TenderRequirement[]> {
    if (this.requirementsCache.has(tenderId)) {
      return this.requirementsCache.get(tenderId)!;
    }
    const c = await apiGet<RawTenderCriteria>(`/tender/${tenderId}/criteria`);
    const requirements = buildRequirements(c);
    this.requirementsCache.set(tenderId, requirements);
    return requirements;
  }

  public updateRequirement(
    id: string,
    updates: Partial<TenderRequirement>
  ): TenderRequirement | null {
    for (const [tenderId, list] of this.requirementsCache) {
      const index = list.findIndex((r) => r.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates, lastUpdated: nowFormatted() };
        this.requirementsCache.set(tenderId, list);
        return list[index];
      }
    }
    return null;
  }

  public createTender(
    tender: Omit<Tender, 'biddersCount' | 'verifiedCount' | 'pendingCount' | 'overallStatus' | 'extractedDate'>
  ): Tender {
    const newTender: Tender = {
      ...tender,
      biddersCount: 0,
      verifiedCount: 0,
      pendingCount: 0,
      overallStatus: 'Pending Verification',
      extractedDate: nowFormatted(),
    };
    this.tendersCache.unshift(newTender);
    this.requirementsCache.set(newTender.id, []);
    return newTender;
  }

  public async simulateRequirementExtraction(
    tenderId: string,
    fileName: string
  ): Promise<{ extractedCount: number; confirmationNeeded: number }> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      extractedCount: 14,
      confirmationNeeded: 2,
    };
  }
}

export const tenderService = new TenderService();
