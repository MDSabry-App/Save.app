// Development launcher: starts the Vite dev server, waits for it to answer,
// then starts Electron pointed at it. Ctrl+C tears both down.
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const PORT = Number(process.env.DEVDESK_DEV_PORT || 3000);
const DEV_URL = `http://localhost:${PORT}`;

let viteProc = null;
let electronProc = null;
let shuttingDown = false;

function waitForServer(url, timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const req = require('http').get(url, { timeout: 2000 }, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.on('timeout', () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Dev server did not become ready at ${url}`));
      } else {
        setTimeout(tryConnect, 500);
      }
    };
    tryConnect();
  });
}

function killProc(proc) {
  if (!proc || proc.killed) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch {
    // Process may already be gone.
  }
}

async function main() {
  // The project path contains an ampersand and em-dash; on Windows, spawning
  // without a shell then fails with EINVAL, so go through cmd and quote.
  const root = path.join(__dirname, '..');
  const cmdQuote = (s) => `"${s}"`;

  console.log('[savedesk] starting Vite dev server on port ' + PORT + '...');
  const viteCommand =
    process.platform === 'win32'
      ? `npx vite --port=${PORT} --strictPort`
      : null;
  if (viteCommand) {
    viteProc = spawn('cmd.exe', ['/d', '/s', '/c', viteCommand], {
      stdio: 'inherit',
      cwd: root,
      windowsVerbatimArguments: false,
    });
  } else {
    viteProc = spawn('npx', ['vite', `--port=${PORT}`, '--strictPort'], {
      stdio: 'inherit',
      cwd: root,
    });
  }
  viteProc.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[savedesk] Vite exited unexpectedly (code ${code}).`);
      shutdown(code ?? 1);
    }
  });

  try {
    await waitForServer(DEV_URL);
  } catch (err) {
    console.error('[savedesk] ' + err.message);
    shutdown(1);
    return;
  }

  console.log('[savedesk] dev server ready — launching Electron...');
  if (process.platform === 'win32') {
    electronProc = spawn(
      'cmd.exe',
      ['/d', '/s', '/c', 'npx electron .'],
      {
        stdio: 'inherit',
        cwd: root,
        windowsVerbatimArguments: false,
        env: { ...process.env, ELECTRON_START_URL: DEV_URL, DEVDESK_VERSION: '1.0.0' },
      }
    );
  } else {
    electronProc = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      cwd: root,
      env: { ...process.env, ELECTRON_START_URL: DEV_URL, DEVDESK_VERSION: '1.0.0' },
    });
  }
  electronProc.on('exit', (code) => {
    // Closing the app window ends the dev session.
    shutdown(code ?? 0);
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  killProc(electronProc);
  killProc(viteProc);
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
  killProc(electronProc);
  killProc(viteProc);
});

main();
