/**
 * POST /api/auth
 *   body:  { action: "register" | "login", email, password }
 *   reply: { token, vaultSalt, user: { id, email } }
 *
 * The vaultSalt is public material used by the client to derive the
 * end-to-end encryption key (PBKDF2 + AES-GCM). The derived key never leaves
 * the browser. The password itself is sent over TLS for account verification
 * and is stored only as a scrypt hash.
 *
 * Hardening: POST only, body size cap, per-IP rate limit, strict input
 * validation, generic error responses, no logging of bodies or credentials.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DUMMY_PASSWORD_HASH,
  db,
  ensureSchema,
  hashPassword,
  isConfigured,
  randomVaultSalt,
  signToken,
  validEmail,
  validPassword,
  verifyPassword,
} from './_lib/auth.js';
import {
  applyCors,
  handlePreflight,
  rateLimit,
  readJsonBody,
  requireMethod,
  sendJson,
  serverError,
} from './_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return;
  if (handlePreflight(req, res)) return;
  if (!requireMethod(req, res, ['POST'])) return;

  // Stricter than the read/write endpoints: brute-force surface.
  if (!rateLimit(req, res, { scope: 'auth', limit: 10, windowMs: 5 * 60 * 1000 })) return;

  if (!isConfigured()) {
    // Configuration is an operator problem, not a client one.
    console.error('[auth] not configured: DATABASE_URL and/or AUTH_SECRET missing');
    return sendJson(res, 500, { error: 'Server not configured' });
  }

  const parsed = readJsonBody(req);
  if (!parsed.ok) return sendJson(res, parsed.status, { error: parsed.error });

  const { action, email, password } = parsed.body;
  if (action !== 'register' && action !== 'login') {
    return sendJson(res, 400, { error: 'Unknown action' });
  }
  if (!validEmail(email) || !validPassword(password)) {
    return sendJson(res, 400, { error: 'Invalid email or password (password: 8-128 characters)' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    await ensureSchema();
    const s = db();

    if (action === 'register') {
      const existing = await s`SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1`;
      if (existing.length > 0) {
        // Registration necessarily reveals whether an email is taken; this is a
        // single-user app, so that tradeoff is accepted and documented.
        return sendJson(res, 409, { error: 'An account with this email already exists' });
      }

      const vaultSalt = randomVaultSalt();
      const rows = await s`
        INSERT INTO users (email, password_hash, vault_salt)
        VALUES (${normalizedEmail}, ${hashPassword(password)}, ${vaultSalt})
        RETURNING id, email, vault_salt`;

      const user = rows[0] as { id: string; email: string; vault_salt: string };
      return sendJson(res, 200, {
        token: signToken(user.id),
        vaultSalt: user.vault_salt,
        user: { id: user.id, email: user.email },
      });
    }

    // action === 'login'
    const rows = await s`
      SELECT id, email, password_hash, vault_salt FROM users WHERE email = ${normalizedEmail} LIMIT 1`;
    const user = rows[0] as
      | { id: string; email: string; password_hash: string; vault_salt: string }
      | undefined;

    // Always run one scrypt verification so response timing does not reveal
    // whether the account exists.
    const storedHash = user ? user.password_hash : DUMMY_PASSWORD_HASH;
    const passwordOk = verifyPassword(password, storedHash);

    if (!user || !passwordOk) {
      return sendJson(res, 401, { error: 'Invalid email or password' });
    }

    return sendJson(res, 200, {
      token: signToken(user.id),
      vaultSalt: user.vault_salt,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    // Never surface database/driver messages to the client.
    return serverError(res, 'auth', err);
  }
}
