# DevDesk — Security Model

This document describes what the code **actually does**. It deliberately does not
claim protections that are not implemented.

---

## 1. What is protected, and against whom

### Encryption at rest and in transit (implemented)

- The whole workspace (API keys, vault entries, notes, todos, snippets, prompts,
  bookmarks, MCP configs, clipboard history, settings) is serialized to one JSON
  document and encrypted with **AES-256-GCM** in the browser
  (`src/utils/crypto.ts`).
- Key derivation: **PBKDF2-SHA256, 100 000 iterations, 256-bit key**, using the
  per-account `vaultSalt` returned by the server at login/registration.
- The key exists only in memory inside `storageService`; it is never persisted and
  never transmitted. `sessionStore` stores the token, the public salt and the
  account email — never the password or the key.
- The local `localStorage` mirror is encrypted with the same key
  (`devdesk_mirror_v1`, format `{ v, iv, data }`). The pre-sync plaintext key
  `devdesk_workspace_v1` is migrated on first unlock and then deleted.
- The server stores `blobs.data` (base64 ciphertext) and `blobs.iv` only. There is
  no server code path that decrypts a workspace.

**Covered by this threat model:** database dump theft, backup leakage, a hosting
provider reading the database, network interception (TLS on top), plaintext at
rest on a device that has been locked or logged out.

### NOT covered (be aware)

1. **The password is sent to the server** over TLS at sign-in/sign-up to
   authenticate the account. A malicious or compromised server (or an operator
   with access to a live login) can capture the password, derive the vault key and
   decrypt everything. True zero-knowledge against the server would require a
   separate vault passphrase or a PAKE such as SRP/OPAQUE — **not implemented**.
2. **XSS / malicious script in the page** can read the token from `localStorage`
   and the decrypted workspace from memory. Mitigations: strict CSP
   (`vercel.json`), no third-party scripts, no `eval`, 7-day token TTL. Note that
   the API-tester feature needs `connect-src https:`, so a hypothetical XSS could
   exfiltrate the token to an arbitrary HTTPS host — a deliberate tradeoff for a
   working developer tool.
3. **Compromised device / unlocked app**: while unlocked, the plaintext workspace
   lives in memory and any process with the same user privileges can read it.
4. **Password loss is unrecoverable.** There is no reset path; the server cannot
   derive your key. Keep a JSON export somewhere safe.
5. **Metadata**: the server sees your account email, the blob size and the time of
   each write.
6. **Clipboard history is part of the workspace.** Copying a value (including a
   vault password) records it in Clipboard History, which is encrypted but *is*
   synced. Clear it if you do not want that.

### Token storage tradeoff (documented, not overclaimed)

The bearer token lives in `localStorage`. Alternatives were rejected:
`sessionStorage` would sign you out on every launch, and an HttpOnly cookie cannot
be used by the Electron build (origin `null`, loaded from `file://`) without
weakening `SameSite` and adding CSRF handling. Consequence: a script running in the
page can read the token. It cannot, however, decrypt your vault.

---

## 2. Server-side controls (`api/`)

| Control | Implementation |
| --- | --- |
| Method allow-lists | `requireMethod()` — `auth`: POST, `me`: GET, `workspace`: GET/POST; otherwise `405` + `Allow` |
| Body size limits | `readJsonBody()` rejects > 4 MB (`413`), checks `Content-Length` before parsing, rejects non-object JSON |
| Ciphertext cap | `MAX_BLOB_CHARS` (4 MB of base64) plus strict base64/IV regexes — anything else is `400` |
| Input validation | Email format/length, password length 8–128, uuid check on the token subject, `?meta` flag, IV shape |
| Password hashing | scrypt `N=16384, r=8, p=1`, 64-byte key, per-user 16-byte salt, constant-time compare (`timingSafeEqual`) |
| Session tokens | HMAC-SHA256 over `{uid, exp}`, 7-day TTL, constant-time signature compare, uuid + expiry checks |
| Login timing | Always performs exactly one scrypt verification (dummy hash for unknown accounts) so response time does not reveal whether an email exists |
| Error responses | Generic `{ error: 'Internal error' }`; driver messages, stack traces and SQL never reach the client (logged server-side without bodies/credentials) |
| Rate limiting | In-memory per-IP limiter: `auth` 10 requests / 5 min, `me` 120/min, `workspace` 120/min |
| CORS | **Off by default** (a same-origin deployment needs none). Opt in with `ALLOWED_ORIGINS`; foreign preflights get `403` |
| No caching | Every API response carries `Cache-Control: no-store` (also set in `vercel.json`) |

### Honest limitations of the server-side controls

- **The rate limiter is best-effort.** Serverless instances are ephemeral and can
  run in parallel, so counters are per instance and reset on cold start. It blunts
  naive brute force; it is not a durable quota. Use Vercel's firewall rules or an
  external store (e.g. Upstash) if you need a hard guarantee.
- **`x-forwarded-for` is trusted** for client identification. That is correct on
  Vercel (the platform sets it) but spoofable behind a proxy that does not
  sanitize the header.
- **Registration reveals whether an email is taken** (`409`). Accepted for a
  single-user tool.
- **Rotating `AUTH_SECRET` signs everyone out**, by design.
- The schema is created by `ensureSchema()` on the first request
  (`CREATE TABLE IF NOT EXISTS`), which needs a database role with DDL rights.

---

## 3. Client-side controls

- The vault masks secret values by default (unchanged UI behaviour).
- The password field is `type="password"` with a show/hide toggle; passwords are
  never written to storage or logs.
- Sync failures are surfaced as a status ("Offline — will retry", "Sync error") in
  the header account menu and Settings → Sync Status; nothing secret is logged.
- Pushing is blocked until the password has been cryptographically verified against
  real ciphertext, so a mistyped password cannot overwrite the stored blob or the
  local mirror.
- Logging out clears the token/salt/email and drops the key from memory. The
  encrypted mirror stays on disk (unreadable without the password) so the app still
  opens offline.

## 4. Operator checklist

- [ ] Generate `AUTH_SECRET`:
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
      and keep it only in Vercel environment variables.
- [ ] Use a Postgres URL with `sslmode=require` and a non-superuser role.
- [ ] Deploy the SPA and `/api` in the same Vercel project (no CORS needed).
- [ ] Keep `VITE_API_URL` empty unless the API is on another origin — it is baked
      into the public bundle.
- [ ] Never commit `.env` (git-ignored).
- [ ] Remember the password and keep an exported JSON backup: there is no reset.
