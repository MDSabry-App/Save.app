// Seeds one COMPLETE, schema-valid record in every SaveDesk section, then
// verifies each one renders in its own view. Records are shaped exactly like
// the app's own CRUD layer creates them (see src/context/AppContext.tsx).
const { evaluate } = require('./cdp-client.cjs');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MARK = 'PERSIST-TEST';
const KEY = 'devdesk_workspace_v1';
const NOW = new Date().toISOString();

const seedScript = `
(async () => {
  const res = {};
  try {
    const st = JSON.parse(localStorage.getItem('${KEY}') || '{}');
    const now = '${NOW}';
    const base = { id: '${MARK}-1', isFavorite: true, createdAt: now, updatedAt: now, tags: ['persist'], notes: 'seeded by automated persistence test' };
    const notMine = (arr) => (arr || []).filter(x => !String(x.id || '').startsWith('${MARK}'));

    st.apiKeys = [{ ...base, provider: 'OpenRouter', name: '${MARK} API Key', apiKey: 'sk-or-persist-test-1234567890abcdef', baseURL: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o', environment: 'Development', status: 'active' }, ...notMine(st.apiKeys)];
    st.prompts = [{ ...base, title: '${MARK} Prompt', description: 'persistence probe', prompt: 'Act as a code reviewer.', category: 'Engineering', variables: ['language'] }, ...notMine(st.prompts)];
    st.mcpServers = [{ ...base, name: '${MARK} MCP', description: 'persistence probe', type: 'http', url: 'https://persist.example.com/mcp', status: 'active' }, ...notMine(st.mcpServers)];
    st.skills = [{ ...base, name: '${MARK} Skill', description: 'persistence probe', category: 'Frontend', content: '# ${MARK}\\n\\nA skill markdown body.', version: '1.0.0', author: 'test', tools: ['read'] }, ...notMine(st.skills)];
    st.bookmarks = [{ ...base, title: '${MARK} Bookmark', url: 'https://persist.example.com', description: 'persistence probe', category: 'Tools' }, ...notMine(st.bookmarks)];
    st.vaultItems = [{ ...base, website: 'persist.example.com', username: 'test-user', password: 'test-pass-123', email: 'test@persist.example.com', url: 'https://persist.example.com' }, ...notMine(st.vaultItems)];
    st.notes = [{ ...base, title: '${MARK} Note', content: 'persistence probe note body', category: 'Testing', isPinned: false }, ...notMine(st.notes)];
    st.todos = [{ ...base, title: '${MARK} Todo', description: 'persistence probe', priority: 'medium', status: 'pending', subtasks: [] }, ...notMine(st.todos)];
    st.snippets = [{ ...base, title: '${MARK} Snippet', language: 'typescript', description: 'persistence probe', code: 'const x: number = 42;' }, ...notMine(st.snippets)];

    localStorage.setItem('${KEY}', JSON.stringify(st));
    res.seeded = 9;
    res.counts = {};
    ['apiKeys','prompts','mcpServers','skills','bookmarks','vaultItems','notes','todos','snippets']
      .forEach(k => res.counts[k] = st[k].length);
  } catch (e) { res.err = String(e); }
  return JSON.stringify(res);
})()`;

const viewCheck = (label, startsWith) => `
(async () => {
  const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.trim().startsWith('${startsWith}'));
  if (!b) return 'MISSING';
  b.click();
  await new Promise(r => setTimeout(r, 500));
  const main = document.querySelector('main');
  return JSON.stringify({ h1: (document.querySelector('main h1') || {}).innerText, chars: main ? main.innerText.length : 0, hasMine: !!(main && main.innerText.includes('${MARK}')) });
})()`;

(async () => {
  const r = await evaluate(seedScript);
  console.log('[seed] ' + r);
  const s = JSON.parse(r);
  if (s.err) { console.log('[seed] FAILED'); process.exit(1); }

  // reload so the app re-renders from the repaired storage
  await evaluate('location.reload()', { awaitPromise: false });
  for (let i = 0; i < 30; i++) {
    const ok = await evaluate('!!(document.getElementById("root") && document.getElementById("root").childElementCount && document.querySelector("main h1"))', { awaitPromise: false });
    if (ok) break;
    await sleep(600);
  }

  const cases = [
    ['api-keys', 'API Keys'],
    ['prompts', 'Prompts Library'],
    ['mcp', 'MCP Servers'],
    ['skills', 'Skills Library'],
    ['passwords', 'Password Vault'],
    ['bookmarks', 'Bookmarks'],
    ['notes', 'Notes'],
    ['todos', 'Tasks & Todos'],
    ['snippets', 'Code Snippets'],
  ];
  let failures = 0;
  for (const [, label] of cases) {
    const out = await evaluate(viewCheck(label, label), { awaitPromise: true });
    const o = JSON.parse(out);
    const pass = o.hasMine === true;
    if (!pass) failures++;
    console.log('[' + (pass ? 'PASS' : 'FAIL') + '] ' + label.padEnd(18) + ' h1=' + o.h1 + ' chars=' + o.chars + ' mine=' + o.hasMine);
  }

  console.log('\\n[seeded views] ' + (failures === 0 ? 'ALL 9 SECTIONS RENDER WITH PERSISTED RECORD' : failures + ' FAILED'));
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
