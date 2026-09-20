# DevDesk — Deployment Guide (Vercel + free Postgres)

Target setup: **one Vercel project** serving the SPA *and* the serverless API on
the same origin, with a free Postgres database. No CORS, no second host, no
separate backend process.

You need: a GitHub account, a Vercel account (free Hobby plan), and a free
Postgres (Neon or Supabase). Total time ~15 minutes, cost $0.

---

## Step 1 — Create a free Postgres database (Neon)

1. Go to <https://neon.tech> → **Sign up** (GitHub login works).
2. **Create project**: name `devdesk`, pick the region closest to you.
3. In **Connection Details**, copy the **connection string**. It looks like:
   ```
   postgresql://neondb_owner:AbCdEf123456@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   Keep `sslmode=require`. That whole string is your `DATABASE_URL`.

<details>
<summary>Supabase alternative</summary>

<https://supabase.com> → New project → **Project Settings → Database → Connection
string → URI** (use the **Connection pooling** / port `6543` variant for
serverless), then append `?sslmode=require`.
</details>

No manual schema step is needed: `api/_lib/auth.ts` runs `ensureSchema()` on the
first request and creates the `users` and `blobs` tables if they do not exist.

---

## Step 2 — Generate `AUTH_SECRET`

Run locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the 64-character output. This signs session tokens; changing it later signs
every device out.

---

## Step 3 — Push the repository to GitHub

The current `origin` remote is still a placeholder. Replace it (do **not** commit
`.env`; it is git-ignored):

```bash
git remote set-url origin https://github.com/<your-username>/<your-repo>.git
git add -A
git commit -m "Wire auth, E2EE vault and cross-device sync"
git push -u origin main
```

(If the repository does not exist yet: create an empty one on GitHub first — no
README, no .gitignore, so the push is not rejected.)

---

## Step 4 — Import the project into Vercel

1. <https://vercel.com> → **Add New… → Project**.
2. **Import Git Repository** → pick your repo.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave as is — the repo root, do **not** rename it)
   - **Build Command**: `npm run build` (default from `vercel.json`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install` (default)
4. Expand **Environment Variables** and add these three (all environments:
   Production, Preview, Development):

   | Name | Value | Notes |
   | --- | --- | --- |
   | `DATABASE_URL` | the Neon URI from Step 1 | server-side only |
   | `AUTH_SECRET` | the 64-char string from Step 2 | server-side only |
   | `VITE_API_URL` | *leave empty / do not add* | empty ⇒ relative `/api` on the same origin |

   > `VITE_API_URL` is baked into the public bundle. Only set it if the frontend
   > is served from a different origin than the API, or when building the Electron
   > desktop app (which needs an absolute URL).

5. **Deploy**. The first build takes ~1 minute.

---

## Step 5 — Verify the deployment

1. Open `https://<your-project>.vercel.app` — you should land on the
   **Sign in / Create account** screen (not on an empty dashboard).
2. **Create account** with your email and a password of at least 8 characters.
   You land in the dashboard. Add something (e.g. a Todo).
3. Check the API is alive:
   ```bash
   curl -s -X POST https://<your-project>.vercel.app/api/auth \
     -H 'Content-Type: application/json' \
     -d '{"action":"login","email":"you@example.com","password":"your-password"}'
   ```
   Expected: `{"token":"…","vaultSalt":"…","user":{…}}`.
   A wrong password must return `{"error":"Invalid email or password"}` with HTTP 401.
4. Check the database really holds ciphertext (Neon SQL editor):
   ```sql
   SELECT user_id, length(data), iv, updated_at FROM blobs;
   ```
   The `data` column must be base64 that means nothing, and there must be no
   plaintext anywhere in `users` (`password_hash` starts with `scrypt$`).

### The acceptance test: two devices

1. Open the app in two separate browser profiles (or two phones/one laptop).
2. Sign in with the **same** email and password in both.
3. Add a note on device 1. Wait ~2 s for the debounced push, then either wait up
   to 15 s on device 2 or click on device 2's window / the **Sync now** button in
   the header account menu.
4. The note must appear on device 2. Repeat in the opposite direction.
5. Optional: open the app on device 2 in airplane mode, edit, come back online —
   the change is pushed automatically on the `online` event.

If nothing syncs, check on device 1: header account menu → **Sync status**
(`Synced` / `Syncing…` / `Offline — will retry` / `Sync error`), and Settings →
**API Endpoint** / **Sync Status**.

---

## Step 6 — Deploying the Electron desktop app

The desktop build loads from `file://`, so it needs an absolute API URL at build
time:

```bash
VITE_API_URL="https://<your-project>.vercel.app" npm run build
npm run dist:win        # → NSIS installer + unpacked build
```

Desktop requests go through Electron's native HTTP layer (main process), so no
CORS configuration is required. Sign in with the same account to see the same
workspace.

---

## Local development

```bash
npm install
npm i -g vercel
vercel link                 # connect this folder to the Vercel project
vercel env pull .env.local  # pulls DATABASE_URL / AUTH_SECRET for local use
vercel dev                  # SPA + /api on http://localhost:3000
```

`npm run dev` (plain Vite) serves only the frontend: with no `VITE_API_URL` the
login screen reports that the server is unreachable. Either use `vercel dev`, or
set `VITE_API_URL` in `.env` to a deployed instance.

---

## Optional: allow a different frontend origin

Not needed for the setup above. If you ever split the frontend onto another
origin, set on the API project:

```env
ALLOWED_ORIGINS="https://app.example.com"
```

Comma-separated. CORS is disabled by default and foreign preflights are rejected
with `403`.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Login returns `500 {"error":"Server not configured"}` | `DATABASE_URL` and/or `AUTH_SECRET` missing (or `AUTH_SECRET` shorter than 16 chars) in Vercel env vars; redeploy after adding them. |
| Login returns `500 {"error":"Internal error"}` | Usually the database is unreachable or rejects DDL. Check the Neon URL, `sslmode=require`, and that the function logs show a connection error. |
| `405` on `/api/...` | Wrong method: `auth` = POST, `me` = GET, `workspace` = GET/POST. |
| `429` | Rate limit: `auth` allows 10 attempts / 5 min per IP. Wait, or check for a retry loop. |
| Changes never appear on the other device | Look at Sync Status. `Offline — will retry` ⇒ network/URL problem; `Sync error` ⇒ the log-blob request was rejected (often a wrong `VITE_API_URL` or a non-2xx from `/api/workspace`). |
| Dashboard is empty on a new device | The account has no blob yet (nothing was ever pushed from the first device). Add an item there and wait for the push, then pull on the new device. |
| `413` on sync | The encrypted workspace exceeded 4 MB; trim clipboard history / old activity. |
| Forgot the password | Unrecoverable by design. Restore from a JSON export (Settings → Export) after creating a new account. |
| Vercel build fails at install with `npm error enoent spawn C:\Program Files\Git\bin\bash.exe` | A Windows-only `script-shell` line reached the Linux builder. Committed npm config must stay platform-neutral: `.npmrc` is git-ignored and `.vercelignore`d for exactly this reason. Remove the file from the repo (`git rm --cached .npmrc`), keep it local-only, and redeploy. |
| `npm run build` fails locally on Windows with `'-personal-utility-dashboard\node_modules\.bin\' is not recognized` | Recreate the machine-local `.npmrc` with `script-shell=C:\Program Files\Git\bin\bash.exe` (see README → "Windows note"). Do **not** commit it. |

---

## Deployment model in one paragraph

`vercel.json` builds the Vite SPA into `dist/` and rewrites every **non-`/api`**
path to `index.html`, while `/api/*` is served by the serverless functions in
`api/`. `VITE_API_URL` is empty, so the SPA calls `/api/...` on its own origin and
no CORS headers are needed. Postgres stores the account row plus one AES-GCM
ciphertext blob per user; the client owns the key.
