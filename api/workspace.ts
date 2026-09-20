/**
 * Workspace sync endpoint — stores ONE client-encrypted blob per user.
 *
 *   GET  /api/workspace            → { data, iv, updatedAt, updatedAtMs }
 *                                    or { data: null, updatedAtMs: null }
 *   GET  /api/workspace?meta=1     → { updatedAtMs, updatedAt }   (no blob!)
 *   POST /api/workspace { data, iv } → { ok: true, updatedAt, updatedAtMs }
 *
 * The cheap `?meta=1` form exists so clients can poll for changes every few
 * seconds (a few hundred bytes) and only download the full blob when the
 * version actually changed.
 *
 * `data` is an AES-256-GCM ciphertext produced in the browser; the server never
 * holds the key and never decrypts. Sync is last-write-wins: the client compares
 * `updatedAtMs` (server clock) before overwriting or pushing.
 *
 * Hardening: GET/POST only, body size cap, strict base64/IV validation,
 * generic errors, no logging of ciphertext.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  db,
  ensureSchema,
  getAuthUserId,
  isConfigured,
  toEpochMs,
  validCiphertext,
  validIv,
} from './_lib/auth';
import {
  MAX_BLOB_CHARS,
  applyCors,
  handlePreflight,
  rateLimit,
  readJsonBody,
  requireMethod,
  sendJson,
  serverError,
} from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return;
  if (handlePreflight(req, res)) return;
  if (!requireMethod(req, res, ['GET', 'POST'])) return;

  // Generous enough for a 15s change poll plus debounced writes, still bounded.
  if (!rateLimit(req, res, { scope: 'workspace', limit: 120, windowMs: 60 * 1000 })) return;

  if (!isConfigured()) {
    console.error('[workspace] not configured: DATABASE_URL and/or AUTH_SECRET missing');
    return sendJson(res, 500, { error: 'Server not configured' });
  }

  const userId = getAuthUserId(req);
  if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

  try {
    await ensureSchema();
    const s = db();

    if (req.method === 'GET') {
      const rows = await s`
        SELECT data, iv, updated_at FROM blobs WHERE user_id = ${userId} LIMIT 1`;

      if (rows.length === 0) {
        return sendJson(res, 200, { data: null, iv: null, updatedAt: null, updatedAtMs: null });
      }

      const row = rows[0];
      const updatedAtMs = toEpochMs(row.updated_at);
      const updatedAt = updatedAtMs === null ? null : new Date(updatedAtMs).toISOString();

      // Metadata-only poll: no blob transfer.
      const metaOnly = req.query.meta === '1' || req.query.meta === 'true';
      if (metaOnly) {
        return sendJson(res, 200, { updatedAt, updatedAtMs });
      }

      return sendJson(res, 200, {
        data: row.data,
        iv: row.iv,
        updatedAt,
        updatedAtMs,
      });
    }

    // POST
    const parsed = readJsonBody(req, MAX_BLOB_CHARS + 64_000);
    if (!parsed.ok) return sendJson(res, parsed.status, { error: parsed.error });

    const { data, iv } = parsed.body;
    if (!validCiphertext(data, MAX_BLOB_CHARS) || !validIv(iv)) {
      return sendJson(res, 400, { error: 'Missing or malformed encrypted payload' });
    }

    const rows = await s`
      INSERT INTO blobs (user_id, data, iv, updated_at)
      VALUES (${userId}, ${data}, ${iv}, now())
      ON CONFLICT (user_id) DO UPDATE
      SET data = EXCLUDED.data, iv = EXCLUDED.iv, updated_at = now()
      RETURNING updated_at`;

    const updatedAtMs = toEpochMs(rows[0]?.updated_at);
    return sendJson(res, 200, {
      ok: true,
      updatedAt: updatedAtMs === null ? null : new Date(updatedAtMs).toISOString(),
      updatedAtMs,
    });
  } catch (err) {
    return serverError(res, 'workspace', err);
  }
}
