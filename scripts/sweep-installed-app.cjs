// Installed-app functional sweep: LTR restore, light theme, then walk every
// sidebar view and confirm it renders. Driven through the app's own UI.
const { evaluate } = require('./cdp-client.cjs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // back to English
  let r = await evaluate(`(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.trim() === 'EN');
    if (b) { b.click(); return 'EN clicked'; } return 'no EN btn';
  })()`, { awaitPromise: true });
  await sleep(800);
  const afterEn = await evaluate('JSON.stringify({dir: document.documentElement.dir, lang: document.documentElement.lang})', { awaitPromise: false });
  console.log('[ltr] ' + r + ' -> ' + afterEn);

  // theme toggle
  r = await evaluate(`(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => /Switch to (Light|Dark) Mode/i.test(x.getAttribute('title') || '') || /Switch to (Light|Dark) Mode/i.test(x.innerText || ''));
    if (b) { const t = x => b.getAttribute('title') || b.innerText; const before = t(); b.click(); return 'theme toggled from: ' + before; }
    return 'no theme btn';
  })()`, { awaitPromise: true });
  await sleep(800);
  const theme = await evaluate('JSON.stringify({dark: document.documentElement.classList.contains("dark"), scheme: document.documentElement.style.colorScheme})', { awaitPromise: false });
  console.log('[theme] ' + r + ' -> ' + theme);

  // walk all views
  const views = ['API Keys','Prompts Library','MCP Servers','Skills Library','Password Vault','Bookmarks','Notes','Tasks & Todos','Code Snippets','Developer Toolbox','Settings'];
  for (const v of views) {
    const rr = await evaluate(`(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.trim().startsWith('${v}'));
      if (!b) return 'MISSING ${v}';
      b.click();
      return (document.querySelector('main h1') || {}).innerText || 'none';
    })()`, { awaitPromise: true });
    await sleep(450);
    const chars = await evaluate('(document.querySelector("main")||{}).innerText ? document.querySelector("main").innerText.length : 0', { awaitPromise: false });
    console.log('[view] ' + v.padEnd(20) + ' -> ' + rr + ' (' + chars + ' chars)');
  }

  // back to dashboard + dark (restore default look)
  await evaluate(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.trim() === 'Overview'); if (b) b.click(); })()`, { awaitPromise: true });
  await sleep(400);
  await evaluate(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Switch to (Light|Dark) Mode/i.test(x.getAttribute('title')||'')); if (b && /Dark/i.test(b.getAttribute('title')||'')) b.click(); })()`, { awaitPromise: true });
  await sleep(500);
  const final = await evaluate('JSON.stringify({h1: (document.querySelector("main h1")||{}).innerText, dark: document.documentElement.classList.contains("dark")})', { awaitPromise: false });
  console.log('[final] ' + final);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
