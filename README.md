# DevDesk — Developer & Personal Utility Dashboard

A modern, practical, **desktop-ready** workspace for developers and power users featuring API management, prompts, MCP, skills, password vault, bookmarks, notes, and developer utilities with full RTL/LTR support.

## 🔒 SECURITY FEATURES (v1.1.0+)

**End-to-End Encryption (E2EE)**: All data (API Keys, passwords) is encrypted using AES-256-GCM in your browser BEFORE it leaves your device. The server stores **only encrypted blobs** - even the database administrator cannot read your data.

**Authentication**: Secure JWT-based login system with protected API endpoints.

**Security Headers & Rate Limiting**: Protected against common web attacks (XSS, clickjacking, brute-force).

Runs both as a **web application** with secure cloud hosting, and as a **native Windows desktop application** (Electron) from a single codebase.

---

## Run as a web application

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Run as a desktop application (development)

Launches the Vite dev server and the Electron shell together:

```bash
npm run dev:desktop
```

The window loads the dev server in development and the packaged production
build in release builds — the renderer never needs to know which.

## Production build & Windows installer

```bash
npm run dist:win
```

Outputs (in `release/` unless overridden by `build.directories.output`):

```
DevDesk-Setup-1.0.0.exe   # NSIS installer (per-user, desktop + Start Menu shortcuts)
win-unpacked/DevDesk.exe  # unpacked app for quick testing
```

The installed application is fully self-contained — it does not require
Node.js, npm, Vite, or a development server.

Other scripts:

```bash
npm run build      # renderer production build (dist/)
npm run pack:win   # package without installer
npm run lint       # TypeScript typecheck (tsc --noEmit)
```

---

## Architecture

```
DevDesk
├── Renderer (existing React application, untouched)
│   └── src/platform/           ← platform adapters
│       ├── browserAdapter.ts   ← fetch / Web Clipboard / Blob download
│       ├── electronAdapter.ts  ← window.desktopAPI bridge
│       └── index.ts            ← detectPlatform() + createPlatform()
├── Preload (preload.cjs)       ← contextBridge, narrowly scoped API
├── IPC                         ← validated channels
└── Main (electron/)
    ├── main.cjs                ← lifecycle, single-instance, IPC wiring
    ├── modules/window.cjs      ← BrowserWindow, 1440×900 (min 1100×700)
    ├── modules/windowState.cjs ← persisted bounds + on-screen validation
    ├── modules/http.cjs        ← native net.request (CORS-free API testing)
    ├── modules/files.cjs       ← native dialogs (import/export, SKILL.md)
    ├── modules/clipboard.cjs   ← native clipboard
    ├── modules/notifications.cjs ← native toasts
    └── modules/menu.cjs        ← application menu
```

### Platform abstraction (browser ⇄ desktop)

The renderer talks only to `IPlatform` (`src/platform/types.ts`). `createPlatform()`
picks the browser or Electron implementation at runtime, so no component contains
Electron-specific checks:

```
UI → platform.http / platform.clipboard / platform.fileSystem
        ├─ Browser:  fetch(), navigator.clipboard, Blob download
        └─ Electron: window.desktopAPI → preload → IPC → main process
```

### Security posture

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- `preload.cjs` exposes a scoped `desktopAPI` only — `require`, `ipcRenderer`,
  `fs`, `child_process`, and `shell` are never reachable from the renderer
- Every IPC handler validates its arguments (URL scheme, method, sizes, timeouts)
- External links open in the default browser; navigation away from the app URL
  is blocked
- API keys/passwords are never logged; error messages exclude secret values

### Storage

- Workspace data: `localStorage` under `devdesk_workspace_v1` (schema v1),
  transparently persisted in the desktop app's own `%APPDATA%\DevDesk`
  partition — the same import/export, seeding, and reset flows work identically
  in both modes
- Window geometry: `%APPDATA%\DevDesk\window-state.json`
- Sensitive data is masked in the UI; the vault is prepared for a secure
  OS-storage backend (see Settings → About)

### Native capabilities (desktop only)

- **API testing** — requests run through the main process via `net.request`,
  so provider endpoints (OpenAI, Gemini, …) are reachable without browser CORS
  restrictions; status, timing, headers, and body return to the console
- **Filesystem** — native save/open dialogs for JSON backups, prompt JSON, and
  `SKILL.md` exports, with remembered last-used directory
- **Clipboard** — native read/write, works without a focused window
- **Notifications** — native Windows toasts (opt-in via Settings)

---

## Features

API Key Manager (test, mask, tag) · Prompts · MCP Servers · Skills (Markdown /
SKILL.md export) · Password Vault + Generator · Bookmarks · Notes (Markdown) ·
Todos (subtasks, priorities) · Snippets (syntax highlight) · Developer Toolbox
(JSON, Base64, JWT, URL, Hash, Regex, Colors, Timestamp) · Clipboard History ·
Favorites · Recent Activity · Global Search (Ctrl+K) · Command Palette
(Ctrl+Shift+P) · Import/Export (all or per-section) · Light/Dark/System themes ·
English & Arabic with full LTR/RTL mirroring.

## Version

1.0.0 — visible in Settings → About.
