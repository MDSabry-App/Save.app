/**
 * Shared server-side helpers for DevDesk serverless API.
 * - Password hashing: scrypt (node:crypto)
 * - Tokens: HMAC-SHA256 signed, 7-day expiry
 * - DB: PostgreSQL (Neon) via postgres.js — schema auto-created on first use
 */
import crypto from 'node:crypto';
import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;

export function db() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not configured');
    sql = postgres(url, { ssl: 'prefer', max: 1, idle_timeout: 20 });
  }
  return sql;
}

let migrated = false;
export async function ensureSchema() {
  if (migrated) return;
  const s = db();
  await s`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      vault_salt text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
  await s`
    CREATE TABLE IF NOT EXISTS blobs (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data text NOT NULL,
      iv text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
  migrated = true;
}

// ---------- Password hashing (scrypt) ----------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const candidate = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

export function randomVaultSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// ---------- HMAC-signed tokens ----------
const DAY = 60 * 60 * 24;
const TOKEN_TTL = 7 * DAY; // seconds

function secret(): string {
  return process.env.AUTH_SECRET || process.env.JWT_SECRET || '';
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signToken(userId: string): string {
  const payload = b64url(JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL }));
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): string | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { uid: string; exp: number };
    if (!data.uid || typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export function getAuthUserId(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const header = req.headers.authorization;
  const token = Array.isArray(header) ? header[0] : header;
  if (!token?.startsWith('Bearer ')) return null;
  return verifyToken(token.slice(7));
}

// ---------- Minimal validation ----------
export function validEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}
