# server/ — LEGACY, NOT DEPLOYED, NOT WIRED TO THE APP

This folder is a leftover Express + Prisma backend from an earlier iteration. It
is **not** part of the running system:

- nothing in `src/`, `electron/`, `api/` or `vercel.json` imports or calls it;
- it expects a separate host on port 3001, while the app now uses the Vercel
  serverless functions in `/api` (`api/auth.ts`, `api/me.ts`, `api/workspace.ts`);
- it is excluded from `tsconfig.json`, so `npm run lint` ignores it;
- `server/src/validation.ts` is not even TypeScript (it contains Python source),
  so this code cannot build as-is.

Kept only for reference. If you want a single, working backend, use `/api`
(see `DEPLOYMENT.md`). Deleting this folder is safe and will not affect the web
app, the desktop app, or the deployment.
