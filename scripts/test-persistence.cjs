// Full persistence + bridge test for the INSTALLED DevDesk app via CDP.
// Phase 1: seed one record in every section + run clipboard/HTTP/notification
//          through the preload bridge, then quit the app.
// Phase 2: relaunch the installed app and verify every record survived.
//
// Usage: node scripts/test-persistence.cjs phase1   (app must be running with --remote-debugging-port=9222)
//        node scripts/test-persistence.cjs phase2
const { evaluate } = require('./cdp-client.cjs');

const MARK = 'PERSIST-TEST';
const KEY = 'devdesk_workspace_v1';

const seedScript = `
(async () => {
  const res = {};
  try {
    const st = JSON.parse(localStorage.getItem('${KEY}') || '{}');
    const now = new Date().toISOString();
    const mk = (arr) => [{ id: '${MARK}-1', isFavorite: true, createdAt: now, updatedAt: now, tags: ['persist'],
      title: '${MARK}', name: '${MARK}', website: '${MARK}.example', text: '${MARK}', code: '${MARK}',
      prompt: '${MARK}', content: '${MARK}', description: '${MARK}', status: 'pending', priority: 'medium' }]
      .concat(arr || []);
    ['apiKeys','prompts','mcpServers','skills','bookmarks','vaultItems','notes','todos','snippets']
      .forEach(k => st[k] = mk(st[k]));
    localStorage.setItem('${KEY}', JSON.stringify(st));
    res.seededSections = 9;

    res.clipboard = await window.desktopAPI.clipboard.writeText('${MARK}-CLIP');
    const r = await window.desktopAPI.http.request({ method: 'GET', endpoint: 'https://api.openai.com/v1/models',
      headers: [{ key: 'Authorization', value: 'Bearer invalid' }], body: '', timeoutMs: 15000 });
    res.httpStatus = r.status; res.httpTime = r.timeMs; res.corsBlocked = !!r.corsBlocked;
    res.notified = await window.desktopAPI.notifications.send('DevDesk', { body: 'persistence check' });
    res.appInfo = await window.desktopAPI.app.getInfo();
    res.platform = window.desktopAPI.platform;
  } catch (e) { res.err = String(e); }
  return JSON.stringify(res);
})()`;

const verifyScript = `
(async () => {
  const res = {};
  try {
    const st = JSON.parse(localStorage.getItem('${KEY}') || '{}');
    res.sections = {};
    ['apiKeys','prompts','mcpServers','skills','bookmarks','vaultItems','notes','todos','snippets']
      .forEach(k => res.sections[k] = (st[k] || []).filter(x => String(x.id || x.name || x.title).includes('${MARK}')).length);
    res.clipboardRead = await window.desktopAPI.clipboard.readText();
    res.bridge = !!window.desktopAPI;
    res.url = location.href;
    res.lang = document.documentElement.lang; res.dir = document.documentElement.dir;
  } catch (e) { res.err = String(e); }
  return JSON.stringify(res);
})()`;

async function phase1() {
  const out = await evaluate(seedScript);
  const r = JSON.parse(out);
  console.log('[phase 1] seeded 1 record in each of ' + r.seededSections + ' sections');
  console.log('[phase 1] clipboard write      : ' + (r.clipboard ? 'PASS' : 'FAIL'));
  console.log('[phase 1] native HTTP (OpenAI) : ' + (r.httpStatus === 401 ? 'PASS (' + r.httpTime + 'ms, corsBlocked=' + r.corsBlocked + ')' : 'FAIL status=' + r.httpStatus));
  console.log('[phase 1] native notification   : ' + (r.notified ? 'PASS' : 'FAIL'));
  console.log('[phase 1] app.getInfo()         : ' + JSON.stringify(r.appInfo));
  console.log('[phase 1] platform              : ' + r.platform);
  if (r.err) console.log('[phase 1] ERROR: ' + r.err);
  const pass = r.clipboard && r.httpStatus === 401 && !r.err;
  console.log('[phase 1] RESULT: ' + (pass ? 'PASS' : 'FAIL'));
  process.exit(pass ? 0 : 1);
}

async function phase2() {
  const out = await evaluate(verifyScript);
  const r = JSON.parse(out);
  console.log('[phase 2] bridge present  : ' + (r.bridge ? 'PASS' : 'FAIL'));
  console.log('[phase 2] loaded from      : ' + r.url);
  console.log('[phase 2] lang/dir         : ' + r.lang + '/' + r.dir);
  console.log('[phase 2] clipboard read   : ' + (r.clipboardRead ? 'PASS' : 'FAIL'));
  console.log('[phase 2] records per section after restart:');
  let allOk = true;
  for (const [k, n] of Object.entries(r.sections)) {
    console.log('    ' + k.padEnd(12) + (n >= 1 ? 'PASS' : 'FAIL') + ' (' + n + ' record)');
    if (n < 1) allOk = false;
  }
  if (r.err) { console.log('[phase 2] ERROR: ' + r.err); allOk = false; }
  console.log('[phase 2] RESULT: ' + (allOk ? 'PASS — data persisted across restart' : 'FAIL'));
  process.exit(allOk ? 0 : 1);
}

const phase = process.argv[2];
if (phase === 'phase1') phase1();
else if (phase === 'phase2') phase2();
else { console.error('usage: node scripts/test-persistence.cjs phase1|phase2'); process.exit(2); }
