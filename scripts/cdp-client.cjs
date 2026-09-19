// Minimal CDP client: evaluates expressions inside the installed DevDesk
// renderer over the DevTools protocol (no Electron internals needed).
const http = require('http');
const WebSocket = (() => {
  try { return require('ws'); } catch { return null; }
})();

const PORT = Number(process.env.CDP_PORT || 9222);

function listPages() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}/json/list`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

async function evaluate(expr, { awaitPromise = true } = {}) {
  const pages = await listPages();
  const page = pages.find((p) => p.type === 'page' && p.url.includes('index.html'));
  if (!page) throw new Error('no DevDesk page found via CDP');
  if (!WebSocket) throw new Error('ws module unavailable');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
    let id = 1;
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: id++, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({
        id: id++,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true, awaitPromise, userGesture: true },
      }));
    });
    const pending = new Map();
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      } else if (msg.id) {
        pending.set(msg.id, () => {});
        if (msg.id === 2) {
          const result = msg.result && msg.result.result;
          if (msg.result && msg.result.exceptionDetails) {
            reject(new Error('page exception: ' + JSON.stringify(msg.result.exceptionDetails).slice(0, 400)));
            ws.close();
            return;
          }
          resolve(result ? result.value : undefined);
          ws.close();
        }
      }
    });
    ws.on('error', reject);
    setTimeout(() => { ws.close(); reject(new Error('CDP evaluate timeout')); }, 30000);
  });
}

module.exports = { evaluate, listPages };
