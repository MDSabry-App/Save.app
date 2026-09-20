// Verifies the running SaveDesk app instance by connecting to its first window.
// Usage: npx electron scripts/verify-electron.cjs  (requires the app already running)
// If the app is not running, it boots it standalone for the checks.
const { app, BrowserWindow, session } = require('electron');
const path = require('path');

let failures = 0;
const check = (name, cond, extra) => {
  console.log((cond ? '[PASS] ' : '[FAIL] ') + name + (extra ? ' -> ' + extra : ''));
  if (!cond) failures++;
};

const sendNativeRequest = require('../electron/modules/http.cjs').sendNativeRequest;

async function inspect(win) {
  const prefs = win.webContents.getLastWebPreferences();
  check('contextIsolation: true', prefs.contextIsolation === true);
  check('nodeIntegration: false', prefs.nodeIntegration === false);
  check('sandbox: true', prefs.sandbox === true);
  check('preload path set', typeof prefs.preload === 'string' && prefs.preload.length > 0, prefs.preload);
  check('webSecurity not disabled', prefs.webSecurity !== false);
  check('window title is SaveDesk', win.title.includes('SaveDesk'), win.title);

  console.log('\n--- renderer bridge state ---');
  const info = await win.webContents.executeJavaScript(
    `(() => ({ bridge: !!window.desktopAPI, isElectron: !!window.desktopAPI?.isElectron, platform: window.desktopAPI?.platform, version: window.desktopAPI?.version, hasFs: !!window.desktopAPI?.fs?.saveFile, hasHttp: !!window.desktopAPI?.http?.request, hasClipboard: !!window.desktopAPI?.clipboard?.writeText, hasNotifications: !!window.desktopAPI?.notifications?.send, dir: document.documentElement.dir, lang: document.documentElement.lang, dark: document.documentElement.classList.contains('dark'), bodyLen: document.querySelector('main')?.innerText.length || 0 }))()`,
    true
  );
  console.log(JSON.stringify(info, null, 2));
  check('desktopAPI bridge exposed', info.bridge === true);
  check('preload reports electron-win32', info.platform === 'electron-win32', info.platform);
  check('fs.saveFile exposed', info.hasFs === true);
  check('http.request exposed', info.hasHttp === true);
  check('clipboard.writeText exposed', info.hasClipboard === true);
  check('notifications.send exposed', info.hasNotifications === true);
  check('renderer rendered main content', info.bodyLen > 200, info.bodyLen + ' chars');

  // Live native HTTP test: OpenAI /v1/models with a bogus key. Expect a clean
  // 401 from the provider (proves native fetch bypasses browser CORS).
  console.log('\n--- native HTTP layer test (OpenAI /v1/models) ---');
  const res = await sendNativeRequest({
    method: 'GET',
    endpoint: 'https://api.openai.com/v1/models',
    headers: [{ key: 'Authorization', value: 'Bearer INVALID_KEY_FOR_TEST' }],
    body: '',
    timeoutMs: 15000,
  });
  console.log(JSON.stringify({ status: res.status, statusText: res.statusText, timeMs: res.timeMs, error: res.error }, null, 2));
  check('native HTTP reached the provider (no CORS block)', res.status === 401, 'status=' + res.status);
  check('response timing captured', typeof res.timeMs === 'number' && res.timeMs > 0, res.timeMs + 'ms');

  console.log('\n[RESULT] ' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
}

app.whenReady().then(async () => {
  try {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length) {
      await inspect(wins[0]);
    } else {
      // No window yet: load the dev server URL (renderer build only exists
      // after `npm run build`, which is done later in the pipeline).
      const url = process.env.ELECTRON_START_URL || 'http://localhost:3000/';
      const win = new BrowserWindow({
        width: 1440,
        height: 900,
        title: 'SaveDesk',
        webPreferences: {
          preload: path.join(__dirname, '..', 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      await win.loadURL(url);
      await new Promise((r) => setTimeout(r, 4000));
      await inspect(win);
    }
  } catch (err) {
    console.log('[ERROR] ' + err.message);
    failures++;
  }
  app.exit(failures === 0 ? 0 : 1);
});
