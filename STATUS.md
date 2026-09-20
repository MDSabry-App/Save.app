# DevDesk — Status

What is implemented, what has been verified in this repository, and what still
needs a live deployment to confirm. No claims beyond that.

## Implemented and verified offline

Verified by `npm run lint` (exit 0), `npm run build` (exit 0),
`npm run test:self` (32 checks, no database required) and a DOM-level UI run of
the real React app against a local mock of the API contract (details in
"Verification" below).

| Area | Status | Evidence |
| --- | --- | --- |
| Auth is actually mounted | `AuthProvider` wraps the app; unauthenticated users get the sign-in screen, authenticated users get the dashboard | `src/App.tsx`, `src/components/AuthScreen.tsx` |
| Register **and** login from the UI | Both paths call the real contract `POST /api/auth { action, email, password }` | `src/context/AuthContext.tsx`, `api/auth.ts` |
| Session validation | Stored token is checked with `GET /api/me`; `401` clears the session and returns to sign-in | `src/context/AuthContext.tsx`, `api/me.ts` |
| No fabricated user | The email/id come from the server response, never a hardcoded object | `api/auth.ts`, `api/me.ts` |
| Key derivation is awaited | `await deriveKey(...)` before any remote load; the wrong-password path is refused | `src/storage/storageService.ts` (`unlockLocal`/`unlockRemote`) |
| Cross-device pull | Startup pull, 15 s interval, window focus, tab visible, `online`; cheap `?meta=1` version check first | `src/storage/storageService.ts` |
| Debounced push | 1.8 s after the last local mutation, plus an immediate push when the server has no blob yet | `src/storage/storageService.ts` |
| Lost-update guard | Remote is adopted only when newer than the pending local write (server `updatedAtMs`, 10 s clock tolerance); the reverse is enforced by the push path | `src/storage/storageService.ts` |
| Never wipe local data | Failed requests, empty blobs and malformed replies leave local state untouched | self-test checks |
| Offline mirror | `localStorage` mirror **encrypted** with the vault key; legacy plaintext key migrated once, then deleted | `src/storage/storageService.ts` |
| One backend for Vercel | `api/auth.ts`, `api/me.ts`, `api/workspace.ts`, `api/_lib/*` only; the Express/Prisma duplicates were deleted | `api/` tree |
| No missing imports under `api/` | Imports are `@vercel/node` (types) and `postgres`; both declared in `package.json` | `npm run lint` |
| Server hardening | Method allow-lists, 4 MB body cap, validation on every field, generic errors, constant-time secret compare, blob cap, per-IP limiter, opt-in CORS | `api/_lib/http.ts`, `api/_lib/auth.ts` |
| `vercel.json` routing | `/api/*` reaches the functions; all other paths fall back to `index.html`; `no-store` on API; CSP + security headers elsewhere | `vercel.json` |
| Same-origin API base | Single `import.meta.env.VITE_API_URL || ''` in `src/api/client.ts`; no hardcoded `localhost:3001` | `src/api/client.ts`, `.env.example` |
| Electron build intact | `base: './'` unchanged; desktop requests go through the native HTTP layer (no CORS); request/response caps raised for blob sync | `vite.config.ts`, `electron/modules/http.cjs` |
| i18n and RTL intact | New auth/sync strings added in English and Arabic; auth screen has its own language toggle and `dir` | `src/constants/translations.ts`, `src/components/AuthScreen.tsx` |
| Secret masking intact | Vault UI unchanged (values masked by default) | `src/components/views/VaultView.tsx` |
| UI gate + unlock flow | Real React app rendered in a DOM environment: unauthenticated → sign-in screen (no dashboard); register through the form → dashboard; restart → "Unlock vault" for the stored account; unlock → dashboard | temporary harness run, see below |
| Cross-device sync through the UI | Two independent runs with separate `localStorage`: run A registered and created a note through the UI (encrypted blob POSTed, plaintext absent from storage); run B logged in fresh and displayed note A's title | temporary harness run, see below |

## Requires a live deployment to confirm (not verified here)

- Real sign-up/login against Neon/Supabase Postgres (no database is reachable
  from this environment; the handler tests use an intentionally unreachable
  `DATABASE_URL`, so they cover rejection paths, not the happy path).
- The actual two-browser acceptance walkthrough on Vercel.
- Vercel's build of the functions, and its rewrite/header behaviour at the edge.
- Electron installer packaging (`npm run dist:win` was not executed).

## Known behaviours worth knowing

- **First unlock on a new device needs the network** to prove the password against
  the stored blob if this device has no encrypted mirror yet. Offline unlocks work
  on any device that has been unlocked before.
- **A one-time migration** reads the old plaintext `devdesk_workspace_v1` key. If
  that local data exists *and* the account already has a blob from another device,
  the server copy wins (export a backup first if the local copy is the one you
  want).
- **Clipboard history syncs** as part of the encrypted workspace.
- **`VITE_API_URL` is baked into the bundle**; changing the API origin requires a
  redeploy, and the Electron app must be built with it set.
- The version string in Settings → About is still `1.0.0`; it is not tied to the
  feature set.

## Legacy

`server/` (Express + Prisma) is **not** deployed and not imported anywhere; see
`server/LEGACY.md`. It is excluded from typechecking. Deleting it is safe.

## Verification

```bash
npm run lint       # tsc --noEmit over src/ + api/ → exit 0
npm run build      # vite build → dist/ (relative ./assets URLs preserved for file://)
npm run test:self  # 32 offline checks: sync engine, API hardening, handlers
```

Additionally verified with a throwaway harness (not committed): the real app was
rendered in a DOM environment with a local mock of the `/api` contract, and two
separate runs with independent `localStorage` exchanged data through the mock
server — a note created on "device A" appeared on "device B" after login, and no
plaintext appeared in either device's storage. What that harness does **not**
cover: a real browser, real Postgres, and Vercel's own build/routing.
