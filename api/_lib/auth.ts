/**
 * Shared server-side helpers for the SaveDesk serverless API.
 *
 * - Password hashing: scrypt (node:crypto, no external dependency)
 * - Tokens: HMAC-SHA256 signed, 7-day expiry, constant-time verification
 * - DB: PostgreSQL (Neon / Supabase / any Postgres) via postgres.js;
 *   the schema is created on first request by `ensureSchema()`
 * - Vault salt: public, per-user random value used by the client for PBKDF2
 *
 * What the server can and cannot see: it stores the scrypt password hash, the
 * public vault salt and one AES-GCM ciphertext blob per user. It never receives
 * the derived vault key and never decrypts the blob. It DOES receive the
 * password over TLS at login/registration time (that is how the account is
 * authenticated), so this is not protection against a malicious or compromised
 * server during login — see SECURITY.md.
 */
import crypto from 'node:crypto';
import postgres from 'postgres';

const SCRYPT_COST = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SCRYPT_KEYLEN = 64;
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

// ---------------------------------------------------------------- database

let sql: ReturnType<typeof postgres> | null = null;

export function db() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not configured');
    sql = postgres(url, {
      ssl: 'prefer',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}

let migrated = false;

/** Idempotent, cheap schema bootstrap. Runs once per warm instance. */
export async function ensureSchema(): Promise<void> {
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

export interface UserRow {
  id: string;
  email: string;
  vault_salt: string;
}

/** Looks up a user by id. Returns null when the id is not a valid uuid or unknown. */
export async function findUserById(userId: string): Promise<UserRow | null> {
  if (!isUuid(userId)) return null;
  const s = db();
  const rows = await s<UserRow[]>`
    SELECT id, email, vault_salt FROM users WHERE id = ${userId} LIMIT 1`;
  return rows.length > 0 ? rows[0] : null;
}

/** Epoch milliseconds of a blob row timestamp (server clock, authoritative for sync). */
export function toEpochMs(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// ---------------------------------------------------------------- passwords

/** scrypt hash in the form `scrypt$<salt-hex>$<hash-hex>`. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_COST);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

/** Constant-time verification; returns false for anything malformed. */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'hex');
    if (expected.length !== SCRYPT_KEYLEN) return false;
    const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_COST);
    return crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/**
 * A valid-format dummy hash used to keep the "unknown account" login path as
 * slow as the "wrong password" path, so response timing does not reveal whether
 * an email is registered.
 */
export const DUMMY_PASSWORD_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(SCRYPT_KEYLEN * 2)}`;

export function randomVaultSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// ---------------------------------------------------------------- tokens

export function authSecret(): string {
  return process.env.AUTH_SECRET || process.env.JWT_SECRET || '';
}

export function isConfigured(): boolean {
  return authSecret().length >= 16 && Boolean(process.env.DATABASE_URL);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signToken(userId: string): string {
  const payload = b64url(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }),
  );
  const sig = crypto.createHmac('sha256', authSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** Verifies signature (constant-time) and expiry; returns the user id or null. */
export function verifyToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = crypto.createHmac('sha256', authSecret()).update(payload).digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.uid !== 'string' || typeof parsed.exp !== 'number') return null;
    if (!isUuid(parsed.uid)) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

/** Extracts the bearer token from an Authorization header (single value only). */
export function bearerToken(req: {
  headers: Record<string, string | string[] | undefined>;
}): string | null {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) return null;
  const token = value.slice(7).trim();
  if (!token || token.length > 4096) return null;
  return token;
}

export function getAuthUserId(req: {
  headers: Record<string, string | string[] | undefined>;
}): string | null {
  const token = bearerToken(req);
  return token ? verifyToken(token) : null;
}

// ---------------------------------------------------------------- validation

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export function validEmail(email: unknown): email is string {
  return (
    typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

/** Minimum 8 characters (the UI states this limit); maximum 128. */
export function validPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

/** AES-GCM IV: base64 of exactly 12 bytes (16 chars, optional padding). */
export function validIv(iv: unknown): iv is string {
  return typeof iv === 'string' && /^[A-Za-z0-9+/]{16}={0,2}$/.test(iv);
}

/** Ciphertext blob: base64 only, bounded size. */
export function validCiphertext(data: unknown, maxChars: number): data is string {
  return (
    typeof data === 'string' &&
    data.length > 0 &&
    data.length <= maxChars &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(data)
  );
}
