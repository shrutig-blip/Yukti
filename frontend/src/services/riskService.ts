import { apiGet } from './apiClient';
import { mockRedFlagTimeline } from '../data/mockData';
import { RiskFactor, ExpiryItem, RedFlagHistoryItem, SeverityLevel } from '../types';

export interface SimulationParams {
  oemMandatory: boolean;
  msmeExempt: boolean;
  minorExpiryTolerated: boolean;
  financialDiscrepancyCritical: boolean;
  turnoverRelaxation: boolean;
}

class RiskService {
  private riskFactorsCache = new Map<string, RiskFactor[]>();
  private expiriesCache = new Map<string, ExpiryItem[]>();

  /**
   * Real, per-bidder risk factors from GET /bidder/{id}/risk-factors.
   * Pass tenderId when you have one in context (Bidder Profile, Report) —
   * without it, tender-specific eligibility failures are omitted (the
   * backend can't check eligibility against a tender it wasn't told about).
   */
  public async getRiskFactors(bidderId: string, tenderId?: string): Promise<RiskFactor[]> {
    const key = `${bidderId}::${tenderId ?? ''}`;
    if (this.riskFactorsCache.has(key)) return this.riskFactorsCache.get(key)!;
    const query = tenderId ? `?tender_id=${encodeURIComponent(tenderId)}` : '';
    const factors = await apiGet<RiskFactor[]>(`/bidder/${bidderId}/risk-factors${query}`);
    this.riskFactorsCache.set(key, factors);
    return factors;
  }

  /** Real, per-bidder expiries from GET /bidder/{id}/expiries. Only OEM
   * authorization currently has a trackable expiry date in the dataset —
   * non-OEM bidders will genuinely get an empty array, not an error. */
  public async getExpiries(bidderId: string): Promise<ExpiryItem[]> {
    if (this.expiriesCache.has(bidderId)) return this.expiriesCache.get(bidderId)!;
    const items = await apiGet<ExpiryItem[]>(`/bidder/${bidderId}/expiries`);
    this.expiriesCache.set(bidderId, items);
    return items;
  }

  /**
   * STILL MOCK — same array for every bidder, unlike the two methods above.
   * There is no persisted historical-event table in the backend (no record
   * of "what happened on what date" beyond current-state facts), so there
   * is nothing real to itemize a chronological timeline from. Fixing this
   * properly needs an events table (e.g. logged the first time a check
   * flips from pass to fail), not a client-side derivation — flagged
   * instead of quietly faking dates.
   */
  public async getTimeline(bidderId: string): Promise<RedFlagHistoryItem[]> {
  return apiGet<RedFlagHistoryItem[]>(`/bidder/${bidderId}/timeline`);
}

  /** Unchanged — pure aggregator, works the same whether factors[] is real or mock. */
  public evaluateRisk(factors: RiskFactor[]): {
    overallLevel: SeverityLevel;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    rationale: string;
  } {
    const criticalCount = factors.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = factors.filter((f) => f.severity === 'HIGH').length;
    const mediumCount = factors.filter((f) => f.severity === 'MEDIUM').length;
    const lowCount = factors.filter((f) => f.severity === 'LOW').length;

    let overallLevel: SeverityLevel = 'LOW';
    let rationale = 'All evaluated statutory and technical parameters align with CPCL procurement benchmarks.';

    if (criticalCount > 0) {
      overallLevel = 'HIGH';
      rationale = `${criticalCount} critical discrepancy detected (turnover declaration mismatch). High integrity risk requiring officer reconciliation.`;
    } else if (highCount > 0) {
      overallLevel = 'MEDIUM';
      rationale = `${highCount} high-severity condition active (OEM authorization validity expires before tender deadline).`;
    } else if (mediumCount > 0) {
      overallLevel = 'MEDIUM';
      rationale = `${mediumCount} pending statutory submissions requiring confirmation.`;
    }

    return { overallLevel, criticalCount, highCount, mediumCount, lowCount, rationale };
  }

  /** Unchanged — deliberately a synthetic what-if calculator, not a real-data feature. */
  public simulateScenario(baseCompliance: number, params: SimulationParams): {
    projectedCompliance: number;
    projectedRisk: SeverityLevel;
    explanation: string;
    delinquenciesChanged: string[];
  } {
    let score = baseCompliance;
    let risk: SeverityLevel = 'MEDIUM';
    const changes: string[] = [];

    if (!params.financialDiscrepancyCritical) {
      score += 6;
      changes.push('Financial turnover discrepancy treated as non-critical clarification (+6 pts)');
    } else {
      changes.push('Financial turnover discrepancy weighted as high negative penalty (-8 pts)');
    }

    if (params.oemMandatory) {
      changes.push('OEM Authorization strictly mandatory; early expiry caps maximum qualification rating');
    } else {
      score += 5;
      changes.push('OEM direct authorization waived for Tier-1 engineering integrators (+5 pts)');
    }

    if (params.minorExpiryTolerated) {
      score += 3;
      changes.push('Document validity buffer extended by 30 days (+3 pts)');
    }

    if (params.turnoverRelaxation) {
      score += 4;
      changes.push('Turnover threshold scaled to average of 3 years instead of single year (+4 pts)');
    }

    if (params.msmeExempt) {
      changes.push('MSME purchase preference & EMD exemption active');
    }

    score = Math.min(99, Math.max(45, score));

    if (params.financialDiscrepancyCritical && params.oemMandatory) {
      risk = 'HIGH';
    } else if (!params.financialDiscrepancyCritical && !params.oemMandatory) {
      risk = 'LOW';
    } else {
      risk = 'MEDIUM';
    }

    return {
      projectedCompliance: score,
      projectedRisk: risk,
      explanation: `Simulation computes projected score of ${score}/100 and ${risk} risk profile based on selected regulatory clauses.`,
      delinquenciesChanged: changes,
    };
  }
}

export const riskService = new RiskService();