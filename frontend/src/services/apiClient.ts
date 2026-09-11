/**
 * Thin fetch wrapper around the FastAPI backend (backend/main.py).
 *
 * Base URL: defaults to http://localhost:8000 (FastAPI/uvicorn's default).
 * Override by setting VITE_API_BASE_URL in a .env file — see .env.example.
 */

const DEFAULT_BASE_URL = 'http://localhost:8000';

const BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || DEFAULT_BASE_URL;

export class ApiError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, options);
  } catch (err) {
    throw new ApiError(
      `Could not reach the backend at ${BASE_URL}${path}. Is the FastAPI server running (uvicorn main:app --reload)?`,
      0
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body && typeof body.detail === 'string') detail = body.detail;
    } catch {
      // Response body wasn't JSON — fall back to statusText.
    }
    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: formData });
}
