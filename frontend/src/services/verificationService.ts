import { apiGet } from './apiClient';
import { VerificationSource, MatchStatus } from '../types';

/**
 * DESIGN NOTES — field mapping & modeling decisions
 * ---------------------------------------------------
 * getSources(bidderId) now pulls REAL data for GST / PAN / Udyam /
 * Blacklist / EPFO-ESIC from GET /verify/{bidder_id} (see
 * data_loader.verify_bidder_credentials on the backend — EPFO/ESIC is a
 * new check added there, grounded in the EPF & MP Act 1952 / ESI Act 1948,
 * using real data from epfo_esic_portal.csv that existed but was never
 * wired into any check before now).
 *
 * Two of the ten "official portals" the UI originally implied — MCA-21
 * (company/turnover cross-check) and OEM Authorization — had NO backend
 * data source at all. MCA-21 now does (mca21_portal.csv + the "mca21"
 * check inside verify_bidder_credentials on the backend), so it's included
 * in the real loop below like GST/PAN/Udyam/blacklist/EPFO-ESIC. OEM
 * Authorization still has no dataset — there is still no OEM-authorization
 * dataset among the provided CSVs — so it remains an explicit
 * UNAVAILABLE/simulated placeholder (isSimulated: true) rather than an
 * invented result.
 *
 * The per-field simulators below (verifyGST, verifyUdyam, verifyPAN,
 * verifyMCA, verifyBlacklisting, verifyOEMAuthorization, verifyEPFO) and
 * runFullVerificationBatch() are UNCHANGED mock — confirmed by a repo-wide
 * search that nothing in the actual UI calls them for real data (only
 * getSources() was ever used to populate a screen). Rewiring only some of
 * them to partial real data while the rest keep returning invented
 * fields (legalName, tradeName, paidUpCapital, etc. — none of which the
 * real backend returns) would create a worse, half-honest state than
 * leaving them as clearly-fictional per-field simulators tied to the
 * "Run Verification" button's re-check animation, which is what they are.
 */

interface RawVerifyCheck {
  check: string;
  passed: boolean;
  status?: string;
  filing_status?: string;
  it_compliance_status?: string;
  detail?: string;
  reason?: string | null;
  name_match?: boolean;
  cin?: string;
  company_status?: string;
  director_kyc_status?: string;
}

interface RawVerifyResult {
  bidder_id: string;
  overall_eligible: boolean;
  checks: RawVerifyCheck[];
}

const REAL_CHECK_META: Record<string, { name: string; category: string }> = {
  gst: { name: 'GSTN — Goods & Services Tax Portal', category: 'Statutory / Tax' },
  pan: { name: 'Income Tax Department — PAN Database', category: 'Statutory / Tax' },
  mca21: { name: 'Ministry of Corporate Affairs (MCA-21 Portal)', category: 'Corporate / Financial' },
  udyam: { name: 'Ministry of MSME — Udyam Registration Portal', category: 'MSME / Registration' },
  blacklist: { name: 'CVC & GeM Debarred-Vendor Registry', category: 'Integrity / Debarment' },
  epfo_esic: { name: 'EPFO / ESIC — Labour Law Compliance', category: 'Statutory / Labour' },
};

class VerificationService {
  public async getSources(bidderId: string): Promise<VerificationSource[]> {
    let real: RawVerifyResult | null = null;
    try {
      real = await apiGet<RawVerifyResult>(`/verify/${bidderId}`);
    } catch {
      // Backend unreachable — fall through and still return the one
      // remaining simulated placeholder below rather than throwing and
      // blanking the whole tab.
    }

    const sources: VerificationSource[] = [];

    if (real) {
      for (const check of real.checks) {
        const meta = REAL_CHECK_META[check.check] || { name: check.check, category: 'Statutory' };
        const detailParts = [
          check.status ? `Status: ${check.status}` : null,
          check.company_status ? `Company status: ${check.company_status}` : null,
          check.filing_status ? `Filing: ${check.filing_status}` : null,
          check.it_compliance_status ? `IT compliance: ${check.it_compliance_status}` : null,
          check.director_kyc_status ? `Director KYC: ${check.director_kyc_status}` : null,
          check.cin ? `CIN: ${check.cin}` : null,
          check.detail || null,
          check.reason ? `Reason: ${check.reason}` : null,
          check.name_match === false ? 'Registered name does not match bidder company name' : null,
        ].filter(Boolean);

        sources.push({
          id: `${bidderId}-${check.check}`,
          name: meta.name,
          category: meta.category,
          verificationStatus: check.passed ? 'VERIFIED' : 'WARNING',
          lastChecked: new Date().toLocaleDateString('en-GB'),
          evidenceSummary: detailParts.join('; ') || (check.passed ? 'Check passed.' : 'Check failed.'),
          matchStatus: check.passed ? 'MATCH' : check.check === 'blacklist' ? 'DISCREPANCY' : 'REVIEW',
          endpointNote: `GET /verify/${bidderId} — real backend data`,
          isSimulated: false,
        });
      }
    }

    // MCA21 used to have NO backend data source (see git history) and was
    // returned as an explicit UNAVAILABLE placeholder here. It's now backed
    // by mca21_portal.csv and included automatically in the loop above (the
    // "mca21" check key), so that placeholder was removed. OEM Authorization
    // still has no dataset, so it remains the one honestly-simulated source.
    sources.push({
      id: `${bidderId}-oem`,
      name: 'OEM Authorization Verification',
      category: 'Authorization',
      verificationStatus: 'UNAVAILABLE',
      lastChecked: '—',
      evidenceSummary:
        'No OEM-authorization dataset exists in the current backend. This check cannot be performed against real data yet.',
      matchStatus: 'REVIEW',
      endpointNote: 'Not tracked by backend — simulated placeholder only',
      isSimulated: true,
    });

    return sources;
  }

  // NOTE: the individual per-field simulators that used to live here
  // (verifyGST, verifyUdyam, verifyPAN, verifyMCA, verifyBlacklisting,
  // verifyOEMAuthorization, verifyEPFO) and runFullVerificationBatch()
  // were removed — a repo-wide search confirmed nothing in the UI called
  // them; only getSources() above was ever used to populate a screen.
  // Every one of them always returned identical hardcoded data regardless
  // of the bidder or field passed in (e.g. verifyGST always returned
  // "ABC Engineering Private Limited" no matter whose GSTIN was passed),
  // so keeping them around as unused dead code risked someone wiring a
  // future screen to them and presenting fabricated data as if it were a
  // real check. The "Run Verification" button now re-calls getSources()
  // (BidderProfileView.tsx's handleRunVerification) instead.
}

export const verificationService = new VerificationService();