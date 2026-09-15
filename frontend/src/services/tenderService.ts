import { apiGet, apiPost, apiPostForm } from './apiClient';
import { Tender, TenderRequirement, SeverityLevel } from '../types';

/**
 * DESIGN NOTES — field mapping & modeling decisions
 * ---------------------------------------------------
 * Backend `tender_criteria.csv` fields -> frontend `Tender` fields:
 *   tender_id     -> id
 *   tender_title  -> title (real)
 *   department, deadline, estimatedValue -> real, straight from
 *     tender_criteria.csv.
 *   extractedDate -> real, from tender_criteria.csv's extracted_date column.
 *     This is null until someone actually uploads a NIT PDF for the tender
 *     via extractTenderDocument() below (POST /tender/{id}/extract), which
 *     runs the file through the backend's real PDF text extraction and only
 *     persists a timestamp if that extraction actually succeeds. It is NOT
 *     invented or defaulted to "now" — a tender with no upload yet stays
 *     null, and the UI should render that as "Not yet extracted" rather
 *     than inventing a date.
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
  department: string;
  deadline: string;
  estimated_value_cr: number;
  extracted_date: string | null;
}

interface RawBid {
  tender_id: string;
  bidder_id: string;
  bid_submitted_date: string;
}

interface RawComplianceResult {
  risk_level: SeverityLevel;
}

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
    `Categories allowed: ${(c.category_allowed || 'General').split(';').join(', ')}`,
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
      requirement: `Bidder category must be one of: ${(c.category_allowed || 'General').split(';').join(', ')}`,
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
          department: c.department,
          deadline: c.deadline,
          estimatedValue: `₹${c.estimated_value_cr} Cr`,
          biddersCount,
          verifiedCount,
          pendingCount,
          overallStatus,
          description: buildDescription(c),
          requirementsCount: requirements.length,
          extractedDate: c.extracted_date,
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

  /**
   * Real replacement for the old local-only createTender(): posts to
   * POST /tender on the backend, which persists the row to
   * tender_criteria.csv and auto-assigns a real TND0xx id (previously the
   * UI fabricated a random-looking "CPCL/PROC/2026/NN" id client-side and
   * never sent anything to the backend at all — a page refresh silently
   * lost the "created" tender). Only tender_id, department, deadline, and
   * estimated_value_cr are genuinely new inputs here; the eligibility
   * fields (category/turnover/local-content/MSME/startup) still need real
   * values — sensible defaults are supplied by the caller (TendersView)
   * and can be edited afterwards via PATCH /tender/{id}/requirement.
   */
  public async createTender(
    tender: Omit<Tender, 'biddersCount' | 'verifiedCount' | 'pendingCount' | 'overallStatus' | 'extractedDate' | 'id'> & {
      category_allowed?: string;
      min_turnover_cr?: number;
      min_local_content_percent?: number;
      msme_only?: boolean;
      startup_relaxation?: boolean;
    }
  ): Promise<Tender> {
    const created = await apiPost<{ tender_id: string }>('/tender', {
      tender_title: tender.title,
      category_allowed: tender.category_allowed ?? 'General',
      min_turnover_cr: tender.min_turnover_cr ?? 0,
      min_local_content_percent: tender.min_local_content_percent ?? 0,
      msme_only: tender.msme_only ?? false,
      startup_relaxation: tender.startup_relaxation ?? false,
      department: tender.department,
      deadline: tender.deadline,
      estimated_value_cr: parseFloat(tender.estimatedValue.replace(/[^\d.]/g, '')) || 0,
    });

    const newTender: Tender = {
      id: created.tender_id,
      title: tender.title,
      department: tender.department,
      deadline: tender.deadline,
      estimatedValue: tender.estimatedValue,
      description: tender.description,
      requirementsCount: tender.requirementsCount,
      biddersCount: 0,
      verifiedCount: 0,
      pendingCount: 0,
      overallStatus: 'Pending Verification',
      extractedDate: null,
    };
    this.tendersCache.unshift(newTender);
    this.requirementsCache.set(newTender.id, []);
    return newTender;
  }

  /**
   * Real replacement for the old simulateRequirementExtraction(): uploads an
   * actual NIT PDF to POST /tender/{tenderId}/extract, which runs it through
   * the backend's real PDF text extraction and — only if that succeeds —
   * persists a real extracted_date. Updates the in-memory tender cache so
   * "Extracted: ..." reflects the real value without a full reload.
   *
   * The backend also now runs the extracted text through
   * extract_nit_requirements() and writes back any field it could
   * confidently read (title, turnover, local content %, category, deadline,
   * estimated value, MSME-only, startup relaxation) — see
   * `requirements_extracted` in the response for exactly which fields this
   * particular PDF changed. Fields it couldn't find are left as they were.
   * When `requirement` comes back we rebuild this tender's cached
   * description/requirements list from it so the UI reflects the update
   * without a full reload.
   */
  public async extractTenderDocument(
    tenderId: string,
    file: File
  ): Promise<{
    tender_id: string;
    filename: string;
    extracted_date: string;
    text_length: number;
    requirements_extracted?: Record<string, unknown>;
    requirement?: RawTenderCriteria;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const result = await apiPostForm<{
      tender_id: string;
      filename: string;
      extracted_date: string;
      text_length: number;
      requirements_extracted?: Record<string, unknown>;
      requirement?: RawTenderCriteria;
    }>(`/tender/${tenderId}/extract`, formData);

    const cached = this.tendersCache.find((t) => t.id === tenderId);
    if (cached) {
      cached.extractedDate = result.extracted_date;
      if (result.requirement) {
        cached.title = result.requirement.tender_title;
        cached.deadline = result.requirement.deadline;
        cached.estimatedValue = `₹${result.requirement.estimated_value_cr} Cr`;
        cached.description = buildDescription(result.requirement);
      }
    }
    if (result.requirement) {
      const requirements = buildRequirements(result.requirement);
      this.requirementsCache.set(tenderId, requirements);
    }

    return result;
  }
}

export const tenderService = new TenderService();