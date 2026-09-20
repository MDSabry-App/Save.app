/**
 * Test double for `src/api/client` used by scripts/self-test.cjs.
 *
 * The self-test bundles src/storage/storageService.ts with esbuild and aliases
 * `../api/client` to this file, so the sync engine can be exercised against an
 * in-memory fake server (see the `__fakeServer` global) with no network and no
 * Postgres. Only the four members storageService imports are needed.
 */

interface FakeResult<T> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
  network?: boolean;
  unauthorized?: boolean;
}

interface FakeServer {
  meta(token: string): Promise<FakeResult<{ updatedAt: string | null; updatedAtMs: number | null }>>;
  blob(token: string): Promise<
    FakeResult<{ data: string | null; iv: string | null; updatedAt: string | null; updatedAtMs: number | null }>
  >;
  put(
    token: string,
    payload: { data: string; iv: string },
  ): Promise<FakeResult<{ ok: boolean; updatedAt: string | null; updatedAtMs: number | null }>>;
}

function fake(): FakeServer {
  return (globalThis as unknown as { __fakeServer: FakeServer }).__fakeServer;
}

export const API_BASE = 'https://fake.test';
export const API_AVAILABLE = true;

export function getWorkspaceMeta(token: string) {
  return fake().meta(token);
}

export function getWorkspaceBlob(token: string) {
  return fake().blob(token);
}

export function putWorkspaceBlob(token: string, payload: { data: string; iv: string }) {
  return fake().put(token, payload);
}

export function apiRequest(): never {
  throw new Error('apiRequest is not used by the sync engine');
}
