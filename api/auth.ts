/**
 * POST /api/auth  { action: "register" | "login", email, password }
 * Returns: { token, vaultSalt }
 * The vaultSalt is public material used by the client to derive the
 * end-to-end encryption key (PBKDF2). The password itself never leaves
 * the browser in plaintext except over TLS for auth verification.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ensureSchema, db, hashPassword, verifyPassword,
  randomVaultSalt, signToken, validEmail, validPassword,
} from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    if (!process.env.AUTH_SECRET && !process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server not configured (AUTH_SECRET missing)' });
    }
    const { action, email, password } = req.body ?? {};
    if (!validEmail(email) || !validPassword(password)) {
      return res.status(400).json({ error: 'Invalid email or password (min 8 chars)' });
    }
    await ensureSchema();
    const s = db();
    const normEmail = (email as string).trim().toLowerCase();

    if (action === 'register') {
      const existing = await s`SELECT id FROM users WHERE email = ${normEmail}`;
      if (existing.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      const vaultSalt = randomVaultSalt();
      const rows = await s`
        INSERT INTO users (email, password_hash, vault_salt)
        VALUES (${normEmail}, ${hashPassword(password as string)}, ${vaultSalt})
        RETURNING id, vault_salt`;
      const user = rows[0];
      return res.status(200).json({ token: signToken(user.id as string), vaultSalt: user.vault_salt });
    }

    if (action === 'login') {
      const rows = await s`SELECT id, password_hash, vault_salt FROM users WHERE email = ${normEmail}`;
      const user = rows[0];
      if (!user || !verifyPassword(password as string, user.password_hash as string)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      return res.status(200).json({ token: signToken(user.id as string), vaultSalt: user.vault_salt });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[auth]', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
