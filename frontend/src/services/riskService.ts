import { mockRiskFactors, mockExpiries, mockRedFlagTimeline } from '../data/mockData';
import { RiskFactor, ExpiryItem, RedFlagHistoryItem, SeverityLevel } from '../types';

export interface SimulationParams {
  oemMandatory: boolean;
  msmeExempt: boolean;
  minorExpiryTolerated: boolean;
  financialDiscrepancyCritical: boolean;
  turnoverRelaxation: boolean;
}

class RiskService {
  private riskFactors: RiskFactor[] = [...mockRiskFactors];
  private expiries: ExpiryItem[] = [...mockExpiries];
  private timeline: RedFlagHistoryItem[] = [...mockRedFlagTimeline];

  public getRiskFactors(bidderId: string): RiskFactor[] {
    return this.riskFactors;
  }

  public getExpiries(bidderId: string): ExpiryItem[] {
    return this.expiries;
  }

  public getTimeline(bidderId: string): RedFlagHistoryItem[] {
    return this.timeline;
  }

  /**
   * Adaptive Risk Engine:
   * Decoupled from linear 100 - Compliance score.
   * If even one CRITICAL risk factor exists (e.g. debarment or severe turnover inflation),
   * risk escalates immediately to HIGH or CRITICAL regardless of compliance score.
   */
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
      overallLevel = 'HIGH'; // In our demo showcase, turnover mismatch makes it HIGH/MEDIUM requiring review
      rationale = `${criticalCount} critical discrepancy detected (turnover declaration mismatch). High integrity risk requiring officer reconciliation.`;
    } else if (highCount > 0) {
      overallLevel = 'MEDIUM';
      rationale = `${highCount} high-severity condition active (OEM authorization validity expires before tender deadline).`;
    } else if (mediumCount > 0) {
      overallLevel = 'MEDIUM';
      rationale = `${mediumCount} pending statutory submissions requiring confirmation.`;
    }

    return {
      overallLevel,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      rationale,
    };
  }

  /**
   * Interactive What-If Scenario Simulator:
   * Allows the Procurement Officer to toggle regulatory and tender stipulations
   * and view projected score & risk profile without altering official records.
   */
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
      // OEM expiry remains high risk
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

    // Determine projected risk
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
