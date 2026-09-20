/**
 * Shared HTTP plumbing for the SaveDesk serverless API.
 *
 * Everything in here is deliberately dependency-free (only @vercel/node types,
 * which are compile-time only) so the Vercel build never has to resolve a
 * package that is missing from package.json.
 *
 * Contains:
 *  - method allow-lists
 *  - JSON body reading with a hard size limit
 *  - generic error responses (no internal messages / stack traces leak)
 *  - best-effort per-IP rate limiting (in-memory, per serverless instance)
 *  - opt-in CORS (same-origin deployments need none)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Hard cap for any JSON request body we are willing to parse (~4 MB, under Vercel's 4.5 MB limit). */
export const MAX_JSON_BODY_BYTES = 4_000_000;

/** Cap for the encrypted workspace blob (base64 characters), ~3 MB of ciphertext. */
export const MAX_BLOB_CHARS = 4_000_000;

// ---------------------------------------------------------------- responses

/** JSON response helper. Every API response is explicitly non-cacheable. */
export function sendJson(res: VercelResponse, status: number, payload: unknown): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(status).json(payload);
}

/**
 * Method allow-list. Returns false when the request was already rejected.
 * Always sends an `Allow` header so clients get a usable answer.
 */
export function requireMethod(req: VercelRequest, res: VercelResponse, allowed: string[]): boolean {
  const method = (req.method || 'GET').toUpperCase();
  if (allowed.includes(method)) return true;
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: 'Method not allowed' });
  return false;
}

/**
 * Generic server error. The real reason is logged server-side only, and never
 * includes request bodies, passwords, tokens or ciphertext.
 */
export function serverError(res: VercelResponse, scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${scope}] ${message}`);
  sendJson(res, 500, { error: 'Internal error' });
}

// ---------------------------------------------------------------- CORS

/**
 * CORS is disabled by default: the intended deployment serves the SPA and the
 * API from the same Vercel origin, where no CORS headers are needed at all.
 *
 * Set `ALLOWED_ORIGINS` (comma-separated) only if you really serve the frontend
 * from a different origin — e.g. the Electron desktop shell, whose origin is
 * `null` when it loads the bundled build from `file://`.
 */
function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Applies CORS headers when the caller's Origin is explicitly allowed.
 * Returns false when a preflight request must be rejected.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  const originValue = Array.isArray(origin) ? origin[0] : origin;
  if (!originValue) return true; // same-origin / non-browser caller

  const list = allowedOrigins();
  const allowed = list.includes(originValue) || (list.includes('null') && originValue === 'null');

  res.setHeader('Vary', 'Origin');
  if (!allowed) {
    // A browser enforces CORS for us on simple requests; preflights must fail
    // loudly so a misconfiguration is obvious instead of silent.
    if ((req.method || '').toUpperCase() === 'OPTIONS') {
      sendJson(res, 403, { error: 'Origin not allowed' });
      return false;
    }
    return true;
  }

  res.setHeader('Access-Control-Allow-Origin', originValue);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
}

/** Handles `OPTIONS` preflight. Returns true when the request was fully handled. */
export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
  if ((req.method || '').toUpperCase() !== 'OPTIONS') return false;
  res.setHeader('Cache-Control', 'no-store');
  res.status(204).end();
  return true;
}

// ---------------------------------------------------------------- body

export type BodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; error: string };

/**
 * Reads a JSON body with a hard size limit.
 * Never echoes body content back to the caller.
 */
export function readJsonBody(req: VercelRequest, maxBytes = MAX_JSON_BODY_BYTES): BodyResult {
  const declared = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, error: 'Payload too large' };
  }

  const raw = req.body as unknown;

  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, status: 400, error: 'Missing JSON body' };
  }

  if (typeof raw === 'string') {
    if (raw.length > maxBytes) return { ok: false, status: 413, error: 'Payload too large' };
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, status: 400, error: 'Body must be a JSON object' };
      }
      return { ok: true, body: parsed as Record<string, unknown> };
    } catch {
      return { ok: false, status: 400, error: 'Malformed JSON body' };
    }
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, status: 400, error: 'Body must be a JSON object' };
  }

  // Vercel already parsed the body for us; enforce the cap on the re-serialized size.
  const body = raw as Record<string, unknown>;
  try {
    if (JSON.stringify(body).length > maxBytes) {
      return { ok: false, status: 413, error: 'Payload too large' };
    }
  } catch {
    return { ok: false, status: 400, error: 'Malformed JSON body' };
  }
  return { ok: true, body };
}

// ---------------------------------------------------------------- rate limiting

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

/**
 * Best-effort, in-memory, per-instance rate limiter.
 *
 * LIMITATION (documented, not a guarantee): serverless instances are created
 * and destroyed at will, and several instances can serve the same IP in
 * parallel. This limiter therefore only blunts naive brute-force / hammering
 * from a single client; it is NOT a durable quota. Use Vercel's own
 * firewall/rate-limit rules or an external store (Upstash, Redis) if you need
 * a hard guarantee.
 */
export function rateLimit(
  req: VercelRequest,
  res: VercelResponse,
  options: { scope: string; limit: number; windowMs: number; cost?: number },
): boolean {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    lastSweep = now;
  }

  const key = `${options.scope}:${clientIp(req)}`;
  const cost = options.cost ?? 1;
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + options.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += cost;
  if (bucket.count > options.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    sendJson(res, 429, { error: 'Too many requests, try again later' });
    return false;
  }
  return true;
}

/**
 * Client IP as reported by the Vercel platform. `x-forwarded-for` is set by the
 * platform edge; when this app is self-hosted behind a proxy that does not
 * sanitize the header, the value is client-controlled and the limiter can be
 * evaded by spoofing it.
 */
export function clientIp(req: VercelRequest): string {
  const header = req.headers['x-forwarded-for'];
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value === 'string' && value.length > 0) {
    return value.split(',')[0].trim().slice(0, 64);
  }
  const realIp = req.headers['x-real-ip'];
  const realIpValue = Array.isArray(realIp) ? realIp[0] : realIp;
  return typeof realIpValue === 'string' && realIpValue ? realIpValue.slice(0, 64) : 'unknown';
}
