# SaveDesk — Architecture

One account, many devices, one encrypted workspace. Three tiers, no extra
services:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  CLIENT — React 19 + Vite + Tailwind v4 SPA (browser) / Electron shell        │
│                                                                               │
│  App.tsx                                                                      │
│   └── AuthProvider            session bootstrap + unlock state machine        │
│        └── AuthenticatedApp   gate: boot | auth screen | workspace            │
│             └── AppProvider   workspace state (adopts remote updates)         │
│                  └── AppShell → views (Dashboard, Vault, Notes, …)            │
│                                                                               │
│  src/api/client.ts        the only place that knows the API base URL          │
│      ├─ browser : fetch (same-origin, relative /api/...)                      │
│      └─ Electron: window.desktopAPI.http → IPC → main process (no CORS)       │
│                                                                               │
│  src/storage/storageService.ts   the sync engine                              │
│      ├─ in-memory StorageState (source of truth for the UI)                   │
│      ├─ encrypted localStorage mirror      devdesk_mirror_v1 (AES-GCM)        │
│      ├─ debounced push (1.8 s)        → POST /api/workspace                   │
│      └─ pull scheduler                → GET  /api/workspace?meta=1 (15 s,     │
│                                          focus, visible, online, startup)      │
│                                                                               │
│  src/utils/crypto.ts     PBKDF2(password, vaultSalt, 100k) → AES-256-GCM key  │
│                          key lives in memory only; never stored or sent       │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │ HTTPS — ciphertext + token only
┌───────────────────────────────────▼───────────────────────────────────────────┐
│  API — Vercel serverless functions (same origin as the SPA)                   │
│                                                                               │
│  api/auth.ts        POST /api/auth        register | login                    │
│                     → scrypt verify → HMAC token + vaultSalt + user           │
│  api/me.ts          GET  /api/me          bearer token → user (session check) │
│  api/workspace.ts   GET  /api/workspace   ?meta=1 → version only              │
│                                           otherwise ciphertext + iv           │
│                     POST /api/workspace   upsert ciphertext (last write wins) │
│  api/_lib/http.ts   methods, body caps, CORS, per-IP rate limit, safe errors  │
│  api/_lib/auth.ts   postgres.js client, ensureSchema(), scrypt, HMAC,         │
│                     validation helpers                                        │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │ SQL (postgres.js, sslmode=require)
┌───────────────────────────────────▼───────────────────────────────────────────┐
│  POSTGRES (Neon / Supabase free tier)                                         │
│    users  (id uuid, email unique, password_hash scrypt$…, vault_salt, …)      │
│    blobs  (user_id pk → users, data text = base64 ciphertext, iv, updated_at) │
│                                                                               │
│  The server never receives the key and has no decrypt path.                   │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Unlock / sync lifecycle

1. **Startup** — `sessionStore` returns the stored `{ token, salt, email }`, or the
   app shows the sign-in screen. With a session, `GET /api/me` validates the token
   (`401` → session cleared). A network failure is tolerated: the app goes to the
   *locked* state with an "offline" notice.
2. **Unlock** — the password is combined with the vault salt
   (`PBKDF2`, 100 000 iterations) into an AES-GCM key. The encrypted local mirror
   is decrypted (this also verifies the password offline). Then
   `GET /api/workspace` is fetched: if it holds a blob, a successful decryption
   *proves* the password and the remote state is adopted; a decryption failure is
   reported as "invalid credentials" and nothing is written anywhere.
3. **Running** — mutations update the in-memory state, queue an encrypted mirror
   write and schedule a debounced push. A single scheduler pulls remote changes
   (15 s / focus / visible / online) using the cheap `?meta=1` check first.
4. **Conflict rule** — the server's `updated_at` is authoritative. A remote blob is
   adopted only if it is newer than the pending local write (10 s clock tolerance)
   or if there is nothing pending locally; otherwise the local write wins and is
   pushed. Empty or failed responses never overwrite local state.
5. **Logout** — token, salt and email are cleared and the key is dropped from
   memory; the encrypted mirror remains for offline use.

## Platform abstraction

```
UI → src/api/client.ts → platform.http.sendRequest()
                              ├─ Browser:  fetch()
                              └─ Electron: preload → ipcMain 'http:request' → net.request
```

The renderer never contains Electron-specific checks; the same is true for
clipboard, filesystem and notifications (`src/platform/`).

## Storage keys

| Key | Contents |
| --- | --- |
| `devdesk_mirror_v1` | `{ v, iv, data, savedAtMs }` — AES-256-GCM ciphertext of the workspace |
| `devdesk_session_token_v1` | bearer token (7-day TTL) |
| `devdesk_session_salt_v1` | public vault salt (PBKDF2 input) |
| `devdesk_session_email_v1` | account email, for prefilling the unlock screen |
| `devdesk_ui_lang_v1` | language of the pre-login screen |
| `devdesk_workspace_v1` | legacy plaintext workspace — read once, then deleted |

## Why these choices

- **One blob per user** instead of per-collection rows: the conflict logic stays
  trivial and the server learns nothing about your data's structure.
- **`?meta=1`** keeps polling at ~200 bytes instead of re-downloading megabytes
  every 15 seconds (free-tier friendly).
- **Serverless + `postgres.js` with `max: 1`** connections: no pool to exhaust,
  schema auto-created on first request, no migration tooling to install.
- **Electron over IPC** for API calls: `file://` origins cannot use CORS, and
  routing through the main process avoids weakening the server's CORS policy.
