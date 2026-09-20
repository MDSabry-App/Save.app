/**
 * Session persistence (bearer token + public vault salt + account email).
 *
 * Storage choice and its honest tradeoff:
 * The bearer token is kept in `localStorage`, which means any script running in
 * the page could read it. The alternatives were considered and rejected:
 *
 *  - `sessionStorage`: survives neither a browser restart nor an Electron app
 *    restart, so the "open it on any device and you are already signed in"
 *    workflow breaks on every launch.
 *  - HttpOnly cookie session: strictly better against token theft by XSS, but
 *    the Electron build loads the bundle from `file://` (origin `null`) and
 *    therefore cannot send a SameSite=Strict cookie; adding cookie auth would
 *    also require CSRF protection. It would only fix half the product.
 *
 * What is done to compensate: a strict CSP without third-party scripts, no
 * `eval`, a 7-day token TTL, and the fact that the token alone cannot decrypt
 * anything (the vault key is derived from the password and never persisted).
 * Losing the token lets an attacker read ciphertext, not plaintext.
 *
 * The password and the derived AES key are NEVER written to storage.
 */
import { API_BASE } from '../api/client';

const TOKEN_KEY = 'devdesk_session_token_v1';
const SALT_KEY = 'devdesk_session_salt_v1';
const EMAIL_KEY = 'devdesk_session_email_v1';

// Pre-fix keys, read once so existing logins are not silently dropped.
const LEGACY_TOKEN_KEY = 'auth_token';
const LEGACY_SALT_KEY = 'auth_salt';

export interface Session {
  token: string;
  salt: string;
  email: string;
  /** True when the session belongs to the currently configured API base. */
  sameOrigin: boolean;
}

function read(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the session then simply does
    // not survive a reload instead of breaking the app.
  }
}

export const sessionStore = {
  load(): Session | null {
    let token = read(TOKEN_KEY);
    let salt = read(SALT_KEY);
    let email = read(EMAIL_KEY) || '';

    if (!token || !salt) {
      // One-time migration from the pre-auth-wiring key names.
      const legacyToken = read(LEGACY_TOKEN_KEY);
      const legacySalt = read(LEGACY_SALT_KEY);
      if (!token && legacyToken && legacySalt) {
        token = legacyToken;
        salt = legacySalt;
        write(TOKEN_KEY, token);
        write(SALT_KEY, salt);
      }
      write(LEGACY_TOKEN_KEY, null);
      write(LEGACY_SALT_KEY, null);
    }

    if (!token || !salt) return null;
    return { token, salt, email, sameOrigin: true };
  },

  save(session: { token: string; salt: string; email: string }): void {
    write(TOKEN_KEY, session.token);
    write(SALT_KEY, session.salt);
    write(EMAIL_KEY, session.email);
    write(LEGACY_TOKEN_KEY, null);
    write(LEGACY_SALT_KEY, null);
  },

  updateSalt(salt: string): void {
    write(SALT_KEY, salt);
  },

  updateEmail(email: string): void {
    write(EMAIL_KEY, email);
  },

  clear(): void {
    write(TOKEN_KEY, null);
    write(SALT_KEY, null);
    write(EMAIL_KEY, null);
    write(LEGACY_TOKEN_KEY, null);
    write(LEGACY_SALT_KEY, null);
  },

  /** Exposed for the Settings screen so the user can see where data is sent. */
  apiBaseLabel(): string {
    return API_BASE || 'same origin';
  },
};
