import { apiGet } from './apiClient';
import { CollusionSignalsResult } from '../types';

/**
 * Raw shape returned by GET /tender/{tender_id}/collusion-signals
 * (backend: data_loader.get_collusion_signals). Field names here are
 * snake_case exactly as FastAPI returns them; reshaped to camelCase below
 * for the rest of the frontend to consume, same convention as
 * tenderService.ts / complianceService.ts.
 */
interface RawCollusionReason {
  signal: string;
  severity: 'MEDIUM' | 'HIGH';
  detail: string;
}

interface RawCollusionEdge {
  bidder_a: string;
  bidder_b: string;
  same_state: boolean;
  reasons: RawCollusionReason[];
  severity: 'MEDIUM' | 'HIGH';
}

interface RawCollusionNode {
  bidder_id: string;
  company_name: string;
  state: string;
}

interface RawCollusionCluster {
  bidder_ids: string[];
  size: number;
}

interface RawCollusionResult {
  tender_id: string;
  bidder_count: number;
  nodes: RawCollusionNode[];
  edges: RawCollusionEdge[];
  flagged_clusters: RawCollusionCluster[];
}

class CollusionService {
  public async getSignals(tenderId: string): Promise<CollusionSignalsResult> {
    const raw = await apiGet<RawCollusionResult>(`/tender/${tenderId}/collusion-signals`);
    return {
      tenderId: raw.tender_id,
      bidderCount: raw.bidder_count,
      nodes: raw.nodes.map((n) => ({
        bidderId: n.bidder_id,
        companyName: n.company_name,
        state: n.state,
      })),
      edges: raw.edges.map((e) => ({
        bidderA: e.bidder_a,
        bidderB: e.bidder_b,
        sameState: e.same_state,
        severity: e.severity,
        reasons: e.reasons.map((r) => ({
          signal: r.signal as 'same_registration_date' | 'similar_company_name',
          severity: r.severity,
          detail: r.detail,
        })),
      })),
      flaggedClusters: raw.flagged_clusters.map((c) => ({
        bidderIds: c.bidder_ids,
        size: c.size,
      })),
    };
  }
}

export const collusionService = new CollusionService();