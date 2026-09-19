// Captures renderer console errors + lifecycle from the installed app via CDP.
const http = require('http');
const WebSocket = require('ws');

const PORT = 9222;

function listPages() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}/json/list`, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve(JSON.parse(b)));
    }).on('error', reject);
  });
}

(async () => {
  const pages = await listPages();
  const page = pages.find((p) => p.type === 'page');
  if (!page) { console.log('no page'); process.exit(1); }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0;
  const events = [];
  ws.on('open', () => {
    ws.send(JSON.stringify({ id: ++id, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: ++id, method: 'Log.enable' }));
    ws.send(JSON.stringify({ id: ++id, method: 'Page.enable' }));
    ws.send(JSON.stringify({ id: ++id, method: 'Page.reload', params: { ignoreCache: true } }));
  });
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.method === 'Runtime.exceptionThrown') {
      events.push('EXCEPTION: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 500));
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      events.push(m.params.type.toUpperCase() + ': ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      events.push('LOG-ERROR: ' + m.params.entry.text.slice(0, 300));
    }
    if (m.method === 'Page.loadEventFired') events.push('PAGE-LOADED');
  });
  setTimeout(() => {
    console.log('events captured: ' + events.length);
    console.log(events.slice(0, 12).join('\n'));
    ws.close();
    process.exit(0);
  }, 15000);
})();
