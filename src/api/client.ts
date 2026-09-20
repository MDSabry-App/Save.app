/**
 * Single place where the app talks to its serverless API.
 *
 * Base URL resolution (in order):
 *   1. `import.meta.env.VITE_API_URL` when set — required for the Electron
 *      desktop build, which loads from `file://` and can only reach an absolute
 *      URL.
 *   2. `''` (empty) — relative `/api/...` requests against the current origin.
 *      This is the intended production setup: frontend and API live in the same
 *      Vercel project, so no CORS is involved at all.
 *
 * Transport: `platform.http` rather than `fetch` directly. In the browser it is
 * a plain fetch; in the Electron desktop shell the request runs through the main
 * process (Chromium network stack), so the `file://` origin never triggers a
 * CORS failure.
 *
 * Requests never log tokens, passwords or ciphertext.
 */
import { platform } from '../platform';

export const API_BASE: string = ((import.meta.env.VITE_API_URL as string | undefined) || '')
  .trim()
  .replace(/\/+$/, '');

/** Relative requests only work when the page itself is served by the API origin. */
export const API_AVAILABLE: boolean = Boolean(API_BASE) || !platform.info.isElectron;

export interface ApiSuccess<T> {
  ok: true;
  status: number;
  data: T;
}

export interface ApiFailure {
  ok: false;
  status: number;
  error: string;
  /** Transport-level failure (offline, DNS, CORS) rather than an HTTP status. */
  network: boolean;
  /** The session token was rejected or expired. */
  unauthorized: boolean;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

interface RequestOptions {
  method: 'GET' | 'POST';
  token?: string | null;
  body?: unknown;
  timeoutMs?: number;
}

function failure(status: number, error: string): ApiFailure {
  return {
    ok: false,
    status,
    error,
    network: status === 0 || status === 408,
    unauthorized: status === 401,
  };
}

/**
 * Performs one JSON request. Never throws: every outcome is an ApiResult so
 * callers can keep working offline instead of dealing with exceptions.
 */
export async function apiRequest<T>(path: string, options: RequestOptions): Promise<ApiResult<T>> {
  if (!API_AVAILABLE) {
    return failure(0, 'No API URL configured for the desktop build (set VITE_API_URL).');
  }

  const headers: { key: string; value: string }[] = [];
  if (options.body !== undefined) headers.push({ key: 'Content-Type', value: 'application/json' });
  if (options.token) headers.push({ key: 'Authorization', value: `Bearer ${options.token}` });

  const response = await platform.http.sendRequest({
    method: options.method,
    endpoint: `${API_BASE}${path}`,
    headers,
    body: options.body === undefined ? '' : JSON.stringify(options.body),
    timeoutMs: options.timeoutMs ?? 15000,
  });

  const status = response.status || 0;

  if (status === 0 || status === 408) {
    return failure(status, response.error || response.statusText || 'Network error');
  }

  let parsed: unknown = null;
  if (response.body && response.body.trim().length > 0) {
    try {
      parsed = JSON.parse(response.body);
    } catch {
      parsed = null;
    }
  }

  if (status < 200 || status >= 300) {
    const message =
      parsed && typeof parsed === 'object' && typeof (parsed as { error?: unknown }).error === 'string'
        ? ((parsed as { error: string }).error)
        : `Request failed (${status})`;
    return failure(status, message);
  }

  if (parsed === null || typeof parsed !== 'object') {
    return failure(status, 'Malformed server response');
  }

  return { ok: true, status, data: parsed as T };
}

// ---------------------------------------------------------------- endpoints

export interface AuthResponse {
  token: string;
  vaultSalt: string;
  user: { id: string; email: string };
}

export function postAuth(
  action: 'register' | 'login',
  email: string,
  password: string,
): Promise<ApiResult<AuthResponse>> {
  return apiRequest<AuthResponse>('/api/auth', {
    method: 'POST',
    body: { action, email, password },
    timeoutMs: 20000,
  });
}

export interface MeResponse {
  user: { id: string; email: string };
  vaultSalt: string;
}

export function getMe(token: string): Promise<ApiResult<MeResponse>> {
  return apiRequest<MeResponse>('/api/me', { method: 'GET', token, timeoutMs: 10000 });
}

export interface WorkspaceMeta {
  updatedAt: string | null;
  updatedAtMs: number | null;
}

export function getWorkspaceMeta(token: string): Promise<ApiResult<WorkspaceMeta>> {
  return apiRequest<WorkspaceMeta>('/api/workspace?meta=1', {
    method: 'GET',
    token,
    timeoutMs: 10000,
  });
}

export interface WorkspaceBlob {
  data: string | null;
  iv: string | null;
  updatedAt: string | null;
  updatedAtMs: number | null;
}

export function getWorkspaceBlob(token: string): Promise<ApiResult<WorkspaceBlob>> {
  return apiRequest<WorkspaceBlob>('/api/workspace', { method: 'GET', token, timeoutMs: 30000 });
}

export function putWorkspaceBlob(
  token: string,
  payload: { data: string; iv: string },
): Promise<ApiResult<WorkspaceMeta & { ok: boolean }>> {
  return apiRequest<WorkspaceMeta & { ok: boolean }>('/api/workspace', {
    method: 'POST',
    token,
    body: payload,
    timeoutMs: 30000,
  });
}
