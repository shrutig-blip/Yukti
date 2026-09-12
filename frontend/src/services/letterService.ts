import { apiPostJson } from './apiClient';
import { Bidder, ContradictionItem } from '../types';

interface LetterResponse {
  letter: string;
}

class LetterService {
  /**
   * Calls the backend's /generate-clarification-letter endpoint, which
   * uses an LLM to draft the letter from the REAL contradictions passed
   * in (already computed by complianceService from real backend data).
   * Throws on failure — caller is responsible for a fallback.
   */
  public async generateClarificationLetter(
    bidder: Bidder,
    tender: { id: string; title: string },
    contradictions: ContradictionItem[]
  ): Promise<string> {
    const payload = {
      bidder_id: bidder.id,
      bidder_name: bidder.name,
      bidder_address: bidder.registeredAddress,
      tender_id: tender.id,
      tender_title: tender.title,
      contradictions: contradictions.map((c) => ({
        field: c.field,
        assessment: c.assessment,
        sources: c.sources,
        recommendation: c.recommendation,
        severity: c.severity,
      })),
    };
    const result = await apiPostJson<LetterResponse>('/generate-clarification-letter', payload);
    return result.letter;
  }
}

export const letterService = new LetterService();
