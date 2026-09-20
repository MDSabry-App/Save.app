# DevDesk — Developer & Personal Utility Dashboard

A modern, practical, **desktop-ready** workspace for developers and power users:
API key manager, prompt library, MCP servers, skills, password vault, bookmarks,
notes, todos, snippets, developer toolbox, clipboard history, favorites and
recent activity — with full English/Arabic RTL/LTR support.

Runs as a **web app on Vercel** (SPA + serverless API + Postgres) and as a
**native Windows desktop app** (Electron) from the same codebase, sharing one
account and one encrypted workspace across all of your devices.

---

## How data is stored and synced

Be precise about what this does:

| Layer | What happens |
| --- | --- |
| In the browser / desktop app | The workspace is a single JSON document held in memory. |
| At rest locally | It is mirrored to `localStorage` **encrypted** (AES-256-GCM, `devdesk_mirror_v1`). Nothing plaintext is written once you have unlocked the app. |
| In transit | Only the ciphertext blob and its IV are uploaded to `POST /api/workspace`. |
| On the server | Postgres stores `users(id, email, password_hash, vault_salt)` and `blobs(user_id, data, iv, updated_at)`. `data` is ciphertext. |
| Key material | `PBKDF2(password, vaultSalt, 100000, SHA-256)` → AES-256-GCM key. Derived in the browser on every unlock; **never stored, never sent**. |

Cross-device behaviour:

- On unlock the app pulls the stored blob (`GET /api/workspace`) and adopts it
  when it is newer than any pending local edit.
- Every local change schedules an encrypted push ~1.8 s later (debounced).
- A scheduler pulls changes from other devices: every 15 s, on window focus, when
  the tab becomes visible, when the browser comes back online, and at startup.
  Polling uses the cheap `?meta=1` version check, so the full blob is only
  transferred when it actually changed.
- Local edits are never overwritten by an older or failed remote response, and a
  failed/empty reply never wipes local data.
- One account is expected (single user). Conflicts are resolved last-write-wins
  using the server's `updated_at`.

Honest limits of the encryption (see `SECURITY.md` for the full list): the
password itself is sent over TLS to authenticate the account, so this protects
your data against database theft and network snooping, **not** against a
malicious or compromised server operator who captures your password at login.
There is no password reset by design: losing the password loses the vault.

---

## Run as a web application

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev          # http://localhost:3000
```

> **Windows note (local only).** This folder's name contains an em dash and an
> `&`. On Windows npm executes package scripts through `cmd.exe`, which splits
> the command at `&`, so `npm run build` / `npm run lint` fail with
> `'-personal-utility-dashboard\node_modules\.bin\' is not recognized...`.
> Fix it with a **machine-local** `.npmrc` in this folder (Git Bash ships with
> Git for Windows):
>
> ```ini
> script-shell=C:\Program Files\Git\bin\bash.exe
> ```
>
> That file is in `.gitignore` and `.vercelignore`, so it is never committed and
> never uploaded to Vercel — Linux/macOS installs and Vercel's builders use the
> default shell and need no override. Cloning this repo on a new Windows machine
> means adding that one line once.

With an empty `VITE_API_URL` the app calls `/api/...` on its own origin. For a
full local stack (frontend + serverless API + database) use the Vercel CLI:

```bash
npm i -g vercel
vercel env pull .env.local   # or set DATABASE_URL / AUTH_SECRET in .env
vercel dev                   # serves the SPA and /api on one origin
```

`npm run dev` alone has no API, so the login screen will report that the server
is unreachable — that is expected, not a bug. Point `VITE_API_URL` at a deployed
instance to develop the UI against a real backend.

See **`DEPLOYMENT.md`** for the step-by-step Vercel + free Postgres setup.

## Run as a desktop application (Electron)

```bash
npm run dev:desktop          # Vite dev server + Electron shell
```

The desktop app loads the packaged bundle from `file://`, so it needs an
absolute API URL at build time:

```bash
VITE_API_URL="https://your-app.vercel.app" npm run build
npm run dist:win             # NSIS installer + unpacked build
```

Desktop requests go through the Electron main process (Chromium network stack)
instead of `fetch`, so no CORS configuration is required for the `file://`
origin.

Other scripts:

```bash
npm run build      # renderer production build (dist/) — works with base: './' for file://
npm run lint       # TypeScript typecheck (src + api)
npm run test:self  # offline self-test: sync engine + API hardening (no DB needed)
npm run pack:win   # package without installer
```

---

## Architecture

```
DevDesk
├── src/                      React 19 + Vite + Tailwind v4 SPA
│   ├── App.tsx               AuthProvider → gate → AppProvider + AppShell
│   ├── components/AuthScreen.tsx   sign in / create account / unlock (EN + AR)
│   ├── context/AuthContext.tsx     session bootstrap, /api/me check, unlock flow
│   ├── context/AppContext.tsx      workspace state; adopts remote updates
│   ├── api/client.ts               single place for the API base URL + transport
│   ├── session/sessionStore.ts     token/salt/email persistence
│   ├── storage/storageService.ts   sync engine (mirror, debounce push, pull loop)
│   ├── utils/crypto.ts             PBKDF2 + AES-256-GCM (Web Crypto)
│   └── platform/                   browser ⇄ Electron adapters
├── api/                      Vercel serverless functions (the ONLY backend)
│   ├── auth.ts               POST /api/auth   register | login → { token, vaultSalt, user }
│   ├── me.ts                 GET  /api/me     session check → { user, vaultSalt }
│   ├── workspace.ts          GET/POST /api/workspace   encrypted blob + ?meta=1
│   └── _lib/{auth,http}.ts   scrypt, HMAC tokens, validation, CORS, rate limit
├── electron/                 desktop shell (main process + preload bridge)
└── server/                   LEGACY Express/Prisma leftover — not deployed (see server/LEGACY.md)
```

The renderer talks to `IPlatform` (`src/platform/types.ts`); `createPlatform()`
picks the browser or Electron implementation, and `src/api/client.ts` routes
every API call through it.

---

## Features

API Key Manager (test, mask, tag) · Prompts · MCP Servers · Skills (Markdown /
SKILL.md export) · Password Vault + Generator · Bookmarks · Notes (Markdown) ·
Todos (subtasks, priorities) · Snippets (syntax highlight) · Developer Toolbox
(JSON, Base64, JWT, URL, Hash, Regex, Colors, Timestamp) · Clipboard History ·
Favorites · Recent Activity · Global Search (Ctrl+K) · Command Palette
(Ctrl+Shift+P) · Import/Export (all or per-section) · Light/Dark/System themes ·
English & Arabic with full LTR/RTL mirroring · Multi-device sync with an
encrypted vault.

## Version

1.0.0 — visible in Settings → About. The version string is independent of the
feature set; see `STATUS.md` for what is actually implemented and verified.
