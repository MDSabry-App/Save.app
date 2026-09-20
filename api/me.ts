/**
 * GET /api/me
 *   headers: Authorization: Bearer <token>
 *   reply:   { user: { id, email }, vaultSalt }
 *
 * Lightweight session check used by the SPA on startup: it validates the stored
 * bearer token against AUTH_SECRET and confirms the account still exists.
 * It returns the public vault salt so a returning device can derive its
 * encryption key without a second round-trip.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, findUserById, getAuthUserId, isConfigured } from './_lib/auth.js';
import {
  applyCors,
  handlePreflight,
  rateLimit,
  requireMethod,
  sendJson,
  serverError,
} from './_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return;
  if (handlePreflight(req, res)) return;
  if (!requireMethod(req, res, ['GET'])) return;

  if (!rateLimit(req, res, { scope: 'me', limit: 120, windowMs: 60 * 1000 })) return;

  if (!isConfigured()) {
    console.error('[me] not configured: DATABASE_URL and/or AUTH_SECRET missing');
    return sendJson(res, 500, { error: 'Server not configured' });
  }

  const userId = getAuthUserId(req);
  if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

  try {
    await ensureSchema();
    const user = await findUserById(userId);
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });

    return sendJson(res, 200, {
      user: { id: user.id, email: user.email },
      vaultSalt: user.vault_salt,
    });
  } catch (err) {
    return serverError(res, 'me', err);
  }
}
