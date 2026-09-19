/**
 * GET  /api/workspace → { data, iv, updatedAt } | { data: null }
 * POST /api/workspace { data, iv }   (both are ENCRYPTED client-side blobs)
 *
 * The server only ever sees AES-256-GCM ciphertext. Last-write-wins sync.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, db, getAuthUserId } from './_lib/auth';

const MAX_BLOB = 2_000_000; // ~2MB ciphertext cap

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await ensureSchema();
    const s = db();

    if (req.method === 'GET') {
      const rows = await s`SELECT data, iv, updated_at FROM blobs WHERE user_id = ${userId}`;
      if (rows.length === 0) return res.status(200).json({ data: null });
      return res.status(200).json({
        data: rows[0].data,
        iv: rows[0].iv,
        updatedAt: rows[0].updated_at,
      });
    }

    if (req.method === 'POST') {
      const { data, iv } = req.body ?? {};
      if (typeof data !== 'string' || typeof iv !== 'string' || !data || !iv) {
        return res.status(400).json({ error: 'Missing encrypted payload' });
      }
      if (data.length > MAX_BLOB) {
        return res.status(413).json({ error: 'Payload too large' });
      }
      if (!/^[A-Za-z0-9+/=]+$/.test(iv)) {
        return res.status(400).json({ error: 'Malformed IV' });
      }
      await s`
        INSERT INTO blobs (user_id, data, iv, updated_at)
        VALUES (${userId}, ${data}, ${iv}, now())
        ON CONFLICT (user_id) DO UPDATE
        SET data = EXCLUDED.data, iv = EXCLUDED.iv, updated_at = now()`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[workspace]', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
