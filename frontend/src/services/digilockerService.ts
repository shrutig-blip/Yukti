import { apiPostJson } from './apiClient';

/**
 * Thin wrapper around POST /verify/{bidder_id}/digilocker (see
 * fetch_digilocker_bundle() in backend/data_loader.py).
 *
 * The backend tries a real Sandbox (sandbox.co.in) DigiLocker issuer-pull
 * when SANDBOX_API_KEY is configured server-side, and transparently falls
 * back to a mock bundle assembled from the same GST/PAN/Udyam/MCA21 portal
 * records used elsewhere in this app when it isn't. `source` on the
 * response tells you honestly which one you got — 'sandbox_live' or
 * 'mock' — so the UI can label it correctly instead of implying every pull
 * is a live government call.
 */

export interface DigilockerDocument {
  type: string;
  issuer: string;
  number: string;
  status: string;
}

export interface DigilockerBundle {
  bidder_id: string;
  source: 'sandbox_live' | 'mock';
  fetched_at: string;
  digitally_signed?: boolean;
  issuer_pull_endpoint?: string;
  documents?: DigilockerDocument[];
  raw?: unknown;
}

class DigilockerService {
  public async fetchDocuments(bidderId: string): Promise<DigilockerBundle> {
    return apiPostJson<DigilockerBundle>(`/verify/${bidderId}/digilocker`, {});
  }
}

export const digilockerService = new DigilockerService();
