#!/usr/bin/env node
/**
 * DevDesk offline self-test — no network, no Postgres, no browser.
 *
 * Part 1 (sync engine): bundles src/storage/storageService.ts with esbuild,
 * aliases src/api/client to an in-memory fake server, and runs the exact
 * cross-device scenarios the app relies on:
 *   device A writes → device B unlocks and sees it → B writes → A pulls it,
 *   plus the safety rules (no wipe on failure, no overwrite by older remote,
 *   wrong password cannot push, 401 raises a sign-out, mirror stays encrypted).
 *
 * Part 2 (API hardening): imports api/_lib/http.ts and api/_lib/auth.ts and
 * checks token signing/verification, constant-time password verification, body
 * size limits, rate limiting and CORS behaviour.
 *
 * Run: npm run test:self
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const results = [];

function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      results.push({ name, ok: true });
      console.log(`  ok   ${name}`);
    })
    .catch((err) => {
      results.push({ name, ok: false, error: err });
      console.log(`  FAIL ${name}\n       ${err && err.message}`);
    });
}

// ---------------------------------------------------------------- environment

function installBrowserGlobals() {
  const stores = new Map();
  let current = 'default';
  const storeFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  };

  const localStorage = {
    getItem: (key) => {
      const store = storeFor(current);
      return store.has(key) ? store.get(key) : null;
    },
    setItem: (key, value) => storeFor(current).set(String(key), String(value)),
    removeItem: (key) => storeFor(current).delete(String(key)),
    clear: () => storeFor(current).clear(),
    key: (index) => [...storeFor(current).keys()][index] ?? null,
    get length() {
      return storeFor(current).size;
    },
  };

  globalThis.localStorage = localStorage;
  if (!globalThis.crypto?.subtle) {
    // Node 18 fallback; Node 19+ exposes globalThis.crypto already.
    globalThis.crypto = require('node:crypto').webcrypto;
  }
  return {
    useDevice: (name) => {
      current = name;
    },
    raw: (device, key) => storeFor(device).get(key) ?? null,
    keys: (device) => [...storeFor(device).keys()],
  };
}

/**
 * Minimal in-memory stand-in for the Vercel API (/api/workspace).
 * `fail` and `unauthorized` simulate transport and token failures.
 */
function installFakeServer() {
  const blobs = new Map(); // token → { data, iv, updatedAtMs }
  const server = {
    tokens: new Set(),
    putCount: 0,
    getCount: 0,
    fail: false,
    unauthorized: false,
    clockOffsetMs: 0,
    now: () => Date.now() + server.clockOffsetMs,
    seed(token, blob) {
      server.tokens.add(token);
      blobs.set(token, blob);
    },
    raw(token) {
      return blobs.get(token) ?? null;
    },
    out(result) {
      if (server.unauthorized) {
        return Promise.resolve({ ok: false, status: 401, unauthorized: true, error: 'Unauthorized', data: null });
      }
      if (server.fail) {
        return Promise.resolve({ ok: false, status: 0, network: true, error: 'Network error', data: null });
      }
      return Promise.resolve(result);
    },
    async blob(token) {
      server.getCount += 1;
      if (!server.tokens.has(token)) {
        return server.out({ ok: false, status: 401, unauthorized: true, error: 'Unauthorized', data: null });
      }
      const row = blobs.get(token) ?? null;
      if (!row) {
        return server.out({ ok: true, status: 200, data: { data: null, iv: null, updatedAt: null, updatedAtMs: null } });
      }
      return server.out({
        ok: true,
        status: 200,
        data: {
          data: row.data,
          iv: row.iv,
          updatedAt: new Date(row.updatedAtMs).toISOString(),
          updatedAtMs: row.updatedAtMs,
        },
      });
    },
    async meta(token) {
      if (!server.tokens.has(token)) {
        return server.out({ ok: false, status: 401, unauthorized: true, error: 'Unauthorized', data: null });
      }
      const row = blobs.get(token) ?? null;
      return server.out({
        ok: true,
        status: 200,
        data: {
          updatedAt: row ? new Date(row.updatedAtMs).toISOString() : null,
          updatedAtMs: row ? row.updatedAtMs : null,
        },
      });
    },
    async put(token, payload) {
      server.putCount += 1;
      if (!server.tokens.has(token)) {
        return server.out({ ok: false, status: 401, unauthorized: true, error: 'Unauthorized', data: null });
      }
      const updatedAtMs = server.now();
      blobs.set(token, { data: payload.data, iv: payload.iv, updatedAtMs });
      return server.out({
        ok: true,
        status: 200,
        data: { ok: true, updatedAt: new Date(updatedAtMs).toISOString(), updatedAtMs },
      });
    },
  };
  globalThis.__fakeServer = server;
  return server;
}

/** Build caches live inside the repo so `postgres` resolves from node_modules. */
function bundleOutDir() {
  const dir = path.join(ROOT, 'node_modules', '.cache', 'devdesk-selftest');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Lets the queued (async) mirror write settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 75));

async function bundleSyncEngine() {
  const outfile = path.join(bundleOutDir(), 'storageService.mjs');
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src', 'storage', 'storageService.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    logLevel: 'warning',
    plugins: [
      {
        // Replace the real API client with the in-memory fake.
        name: 'fake-api-client',
        setup(build) {
          build.onResolve({ filter: /^\.\.\/api\/client$/ }, () => ({
            path: path.join(ROOT, 'scripts', 'self-test', 'fake-api-client.ts'),
          }));
        },
      },
    ],
  });
  return outfile;
}

/** Each import gets its own module instance → an independent "device". */
async function makeDevice(outfile, tag) {
  const mod = await import(`${pathToFileURL(outfile).href}?device=${tag}`);
  return mod.storageService;
}

const PASSWORD = 'correct horse battery staple';
const SALT = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

// ---------------------------------------------------------------- part 1

async function runSyncTests() {
  console.log('\nSync engine (in-memory fake API)');

  const env = installBrowserGlobals();
  const server = installFakeServer();
  const outfile = await bundleSyncEngine();

  const deviceA = await makeDevice(outfile, 'A');
  const deviceB = await makeDevice(outfile, 'B');
  const deviceC = await makeDevice(outfile, 'C');

  const token = 'token-session-1';
  server.seed(token, null);
  server.tokens.clear();
  server.tokens.add(token);

  let authErrorA = 0;
  deviceA.onAuthError(() => {
    authErrorA += 1;
  });
  let remoteUpdatesA = 0;
  deviceA.onRemoteUpdate(() => {
    remoteUpdatesA += 1;
  });

  await check('device A unlocks an empty account', async () => {
    env.useDevice('A');
    deviceA.setSession(token);
    const local = await deviceA.unlockLocal(PASSWORD, SALT, true);
    assert.equal(local.ok, true);
    const remote = await deviceA.unlockRemote();
    assert.equal(remote.ok, true);
    assert.equal(deviceA.getState().notes.length, 0);
  });

  await check('device A writes → server stores ciphertext only', async () => {
    env.useDevice('A');
    deviceA.saveState({
      notes: [
        {
          id: 'nt-1',
          title: 'PLAINTEXT-MARKER-NOTE',
          content: 'PLAINTEXT-MARKER-BODY',
          tags: [],
          isPinned: false,
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
    await deviceA.pushNow();
    const row = server.raw(token);
    assert.ok(row, 'server should hold a blob');
    assert.ok(!row.data.includes('PLAINTEXT-MARKER'), 'blob must not contain plaintext');
    assert.ok(!row.iv.includes('PLAINTEXT-MARKER'), 'iv must not contain plaintext');
  });

  await check('local mirror on device A is encrypted', async () => {
    await settle();
    const mirror = env.raw('A', 'devdesk_mirror_v1');
    assert.ok(mirror, 'mirror should exist');
    assert.ok(!mirror.includes('PLAINTEXT-MARKER'), 'mirror must not contain plaintext');
    assert.equal(mirror.includes('correct horse'), false, 'mirror must not contain the password');
  });

  await check('device B (fresh) unlocks and sees A\'s note', async () => {
    env.useDevice('B');
    deviceB.setSession(token);
    const local = await deviceB.unlockLocal(PASSWORD, SALT);
    assert.equal(local.ok, true);
    const remote = await deviceB.unlockRemote();
    assert.equal(remote.ok, true);
    const notes = deviceB.getState().notes;
    assert.equal(notes.length, 1);
    assert.equal(notes[0].title, 'PLAINTEXT-MARKER-NOTE');
  });

  await check('device B writes a todo → device A pulls it', async () => {
    env.useDevice('B');
    deviceB.saveState({
      todos: [
        {
          id: 'td-1',
          title: 'TODO-FROM-B',
          status: 'pending',
          priority: 'medium',
          subtasks: [],
          tags: [],
          isFavorite: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await deviceB.pushNow();

    env.useDevice('A');
    await deviceA.pullNow(true);
    assert.equal(deviceA.getState().todos.length, 1);
    assert.equal(deviceA.getState().todos[0].title, 'TODO-FROM-B');
    assert.ok(remoteUpdatesA >= 1, 'remote update listener should fire');
  });

  await check('a failed pull never wipes local state', async () => {
    env.useDevice('A');
    const before = deviceA.getState().todos.length;
    server.fail = true;
    await deviceA.pullNow(true);
    server.fail = false;
    assert.equal(deviceA.getState().todos.length, before);
    assert.equal(deviceA.getSyncStatus().state, 'offline');
  });

  await check('an empty remote blob never wipes local state', async () => {
    env.useDevice('A');
    const notes = deviceA.getState().notes.length;
    server.seed(token, { data: null, iv: null, updatedAtMs: null });
    await deviceA.pullNow(true);
    assert.equal(deviceA.getState().notes.length, notes);
    // restore the real blob
    server.seed(token, JSON.parse(JSON.stringify(server.raw(token) || { data: null })));
  });

  await check('a 401 raises the auth-error signal (sign out)', async () => {
    env.useDevice('A');
    server.unauthorized = true;
    await deviceA.pullNow(true);
    server.unauthorized = false;
    assert.ok(authErrorA >= 1, 'onAuthError should fire on 401');
  });

  await check('an older remote blob does not overwrite a pending local write', async () => {
    env.useDevice('B');
    const row = server.raw(token);
    assert.ok(row);
    // Pretend the stored blob is a minute old, then edit locally on B.
    row.updatedAtMs = Date.now() - 60_000;
    deviceB.saveState({
      bookmarks: [
        {
          id: 'bm-1',
          title: 'BOOKMARK-FROM-B',
          url: 'https://example.com',
          tags: [],
          isFavorite: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    const pending = deviceB.getSyncStatus().pendingPush;
    await deviceB.pullNow(true);
    assert.equal(deviceB.getState().bookmarks.length, 1, 'pending local write must survive the pull');
    assert.equal(pending, true, 'status should report a pending push');
    await deviceB.pushNow();
    assert.equal(deviceB.getSyncStatus().pendingPush, false);
  });

  await check('a newer remote blob is adopted', async () => {
    env.useDevice('C');
    deviceC.setSession(token);
    const local = await deviceC.unlockLocal(PASSWORD, SALT);
    assert.equal(local.ok, true);
    const remote = await deviceC.unlockRemote();
    assert.equal(remote.ok, true);
    // C edits, pushes; A must then pick it up on the next forced pull.
    deviceC.saveState({
      prompts: [
        {
          id: 'pr-1',
          title: 'PROMPT-FROM-C',
          content: 'x',
          category: 'general',
          tags: [],
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
    await deviceC.pushNow();

    env.useDevice('A');
    await deviceA.pullNow(true);
    assert.equal(deviceA.getState().prompts.length, 1);
    assert.equal(deviceA.getState().prompts[0].title, 'PROMPT-FROM-C');
  });

  await check('a wrong password cannot unlock, push, or destroy the blob', async () => {
    env.useDevice('C');
    const beforeBlob = server.raw(token).data;
    const deviceD = await makeDevice(outfile, 'D');
    deviceD.setSession(token);
    const local = await deviceD.unlockLocal('wrong password here', SALT);
    const remote = await deviceD.unlockRemote();
    assert.equal(remote.ok, false);
    assert.equal(remote.reason, 'incorrect-password');
    assert.equal(local.ok, false, 'unreadable local state must not be treated as success');
    await deviceD.pushNow();
    assert.equal(server.raw(token).data, beforeBlob, 'stored blob must be unchanged');
    assert.equal(deviceD.getSyncStatus().state, 'unverified');
  });

  await check('unverified session refuses to write the local mirror', async () => {
    const mirror = env.raw('D', 'devdesk_mirror_v1');
    assert.equal(mirror, null, 'no mirror should be written with an unverified password');
  });

  await check('mirror persists the "unsynced changes" flag for the next launch', async () => {
    env.useDevice('A');
    deviceA.saveState({
      settings: { ...deviceA.getState().settings, language: 'ar' },
    });
    await settle();
    const dirtyMirror = JSON.parse(env.raw('A', 'devdesk_mirror_v1'));
    assert.equal(dirtyMirror.dirty, true, 'pending local change must be recorded');
    assert.ok(typeof dirtyMirror.mutationAtMs === 'number');

    await deviceA.pushNow();
    await settle();
    const cleanMirror = JSON.parse(env.raw('A', 'devdesk_mirror_v1'));
    assert.equal(cleanMirror.dirty, false, 'flag must clear after a successful push');
  });
}

// ---------------------------------------------------------------- part 2

async function bundleApiLib(entry) {
  const outfile = path.join(bundleOutDir(), `${path.basename(entry, '.ts')}.mjs`);
  await esbuild.build({
    entryPoints: [path.join(ROOT, entry)],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    logLevel: 'warning',
    external: ['postgres'],
  });
  return outfile;
}

function fakeReq(overrides = {}) {
  return {
    method: 'POST',
    headers: {},
    query: {},
    body: undefined,
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

function fakeRes() {
  const res = {
    statusCode: 0,
    headers: {},
    payload: undefined,
    ended: false,
    setHeader(key, value) {
      res.headers[key.toLowerCase()] = value;
      return res;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.payload = payload;
      return res;
    },
    end() {
      res.ended = true;
      return res;
    },
  };
  return res;
}

async function runApiTests() {
  console.log('\nAPI hardening (api/_lib)');

  process.env.AUTH_SECRET = 'test-secret-value-that-is-long-enough';
  const auth = await import(pathToFileURL(await bundleApiLib('api/_lib/auth.ts')).href);
  const http = await import(pathToFileURL(await bundleApiLib('api/_lib/http.ts')).href);

  await check('scrypt password hash verifies and rejects', () => {
    const stored = auth.hashPassword('hunter2hunter2');
    assert.equal(auth.verifyPassword('hunter2hunter2', stored), true);
    assert.equal(auth.verifyPassword('hunter2hunter3', stored), false);
    assert.equal(auth.verifyPassword('hunter2hunter2', 'garbage'), false);
  });

  await check('token signature round-trip, tamper, and wrong secret', () => {
    const uid = '11111111-2222-3333-4444-555555555555';
    const token = auth.signToken(uid);
    assert.equal(auth.verifyToken(token), uid);
    assert.equal(auth.verifyToken(token.replace(/.$/, 'x')), null);
    assert.equal(auth.verifyToken('not-a-token'), null);
    const oldSecret = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = 'a-different-secret-value-long-enough';
    assert.equal(auth.verifyToken(token), null);
    process.env.AUTH_SECRET = oldSecret;
  });

  await check('bearer extraction only accepts well-formed headers', () => {
    const uid = '11111111-2222-3333-4444-555555555555';
    const token = auth.signToken(uid);
    assert.equal(auth.getAuthUserId({ headers: { authorization: `Bearer ${token}` } }), uid);
    assert.equal(auth.getAuthUserId({ headers: { authorization: token } }), null);
    assert.equal(auth.getAuthUserId({ headers: {} }), null);
  });

  await check('IV and ciphertext validation rejects junk', () => {
    assert.equal(auth.validIv('AAAAAAAAAAAAAAAA'), true);
    assert.equal(auth.validIv('short'), false);
    assert.equal(auth.validIv('<script>alert(1)</script>'), false);
    assert.equal(auth.validIv(null), false);
    assert.equal(auth.validCiphertext('AAAA', 10), true);
    assert.equal(auth.validCiphertext('AAAA', 2), false);
    assert.equal(auth.validCiphertext('not base64 !!!', 100), false);
    assert.equal(auth.validCiphertext('', 100), false);
  });

  await check('email and password validation boundaries', () => {
    assert.equal(auth.validEmail('a@b.co'), true);
    assert.equal(auth.validEmail('nope'), false);
    assert.equal(auth.validEmail(`${'a'.repeat(250)}@b.co`), false);
    assert.equal(auth.validPassword('12345678'), true);
    assert.equal(auth.validPassword('1234567'), false);
    assert.equal(auth.validPassword('x'.repeat(129)), false);
  });

  await check('JSON body limits: valid, oversized, malformed', () => {
    const ok = http.readJsonBody(fakeReq({ body: { action: 'login' } }));
    assert.equal(ok.ok, true);
    const big = http.readJsonBody(fakeReq({ body: 'x'.repeat(50) }), 10);
    assert.equal(big.ok, false);
    assert.equal(big.status, 413);
    const bad = http.readJsonBody(fakeReq({ body: '{not json' }));
    assert.equal(bad.ok, false);
    assert.equal(bad.status, 400);
    const declared = http.readJsonBody(
      fakeReq({ body: {}, headers: { 'content-length': '99999999' } }),
      1000,
    );
    assert.equal(declared.status, 413);
  });

  await check('method allow-list answers 405 with Allow', () => {
    const res = fakeRes();
    const allowed = http.requireMethod(fakeReq({ method: 'DELETE' }), res, ['GET', 'POST']);
    assert.equal(allowed, false);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'GET, POST');
  });

  await check('rate limiter blocks past the limit and sets Retry-After', () => {
    const options = { scope: 'unit-test-' + Date.now(), limit: 3, windowMs: 60_000 };
    let blocked = null;
    for (let i = 0; i < 4; i += 1) {
      const res = fakeRes();
      const ok = http.rateLimit(fakeReq({ headers: { 'x-forwarded-for': '10.0.0.9' } }), res, options);
      if (!ok) blocked = res;
    }
    assert.ok(blocked, 'the 4th request must be blocked');
    assert.equal(blocked.statusCode, 429);
    assert.ok(Number(blocked.headers['retry-after']) >= 1);
    // A different IP is unaffected.
    const otherRes = fakeRes();
    assert.equal(
      http.rateLimit(fakeReq({ headers: { 'x-forwarded-for': '10.0.0.10' } }), otherRes, options),
      true,
    );
  });

  await check('CORS is off by default and opt-in via ALLOWED_ORIGINS', () => {
    delete process.env.ALLOWED_ORIGINS;
    const resSameOrigin = fakeRes();
    assert.equal(http.applyCors(fakeReq({ headers: { origin: 'https://evil.test' } }), resSameOrigin), true);
    assert.equal(resSameOrigin.headers['access-control-allow-origin'], undefined);

    // Preflight from a disallowed origin is rejected loudly.
    const resPreflight = fakeRes();
    const okPreflight = http.applyCors(
      fakeReq({ method: 'OPTIONS', headers: { origin: 'https://evil.test' } }),
      resPreflight,
    );
    assert.equal(okPreflight, false);
    assert.equal(resPreflight.statusCode, 403);

    process.env.ALLOWED_ORIGINS = 'https://app.test';
    const resAllowed = fakeRes();
    assert.equal(http.applyCors(fakeReq({ headers: { origin: 'https://app.test' } }), resAllowed), true);
    assert.equal(resAllowed.headers['access-control-allow-origin'], 'https://app.test');
    delete process.env.ALLOWED_ORIGINS;
  });

  await check('responses are non-cacheable and JSON-shaped', () => {
    const res = fakeRes();
    http.sendJson(res, 200, { ok: true });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['cache-control'], /no-store/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.deepEqual(res.payload, { ok: true });
  });
}

// ---------------------------------------------------------------- part 3

async function bundleHandler(entry) {
  const outfile = path.join(bundleOutDir(), `handler-${path.basename(entry, '.ts')}.mjs`);
  await esbuild.build({
    entryPoints: [path.join(ROOT, entry)],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    logLevel: 'warning',
    external: ['postgres'],
  });
  return outfile;
}

/**
 * Handler-level checks. A dummy DATABASE_URL is set so the configuration guard
 * passes; every request below is rejected (or fails) before any real query, so
 * no Postgres server is required.
 */
async function runHandlerTests() {
  console.log('\nServerless handlers (no database reachable)');

  process.env.AUTH_SECRET = 'test-secret-value-that-is-long-enough';
  process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:1/devdesk';

  const auth = await import(pathToFileURL(await bundleHandler('api/auth.ts')).href);
  const me = await import(pathToFileURL(await bundleHandler('api/me.ts')).href);
  const workspace = await import(pathToFileURL(await bundleHandler('api/workspace.ts')).href);

  await check('api/auth: rejects non-POST with 405 + Allow', async () => {
    const res = fakeRes();
    await auth.default(fakeReq({ method: 'GET' }), res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'POST');
  });

  await check('api/auth: invalid action / email / password → 400', async () => {
    const badAction = fakeRes();
    await auth.default(fakeReq({ body: { action: 'delete', email: 'a@b.co', password: 'abcdefgh' } }), badAction);
    assert.equal(badAction.statusCode, 400);

    const badEmail = fakeRes();
    await auth.default(fakeReq({ body: { action: 'login', email: 'not-an-email', password: 'abcdefgh' } }), badEmail);
    assert.equal(badEmail.statusCode, 400);

    const badPassword = fakeRes();
    await auth.default(fakeReq({ body: { action: 'login', email: 'a@b.co', password: 'short' } }), badPassword);
    assert.equal(badPassword.statusCode, 400);
  });

  await check('api/auth: oversized body → 413', async () => {
    const res = fakeRes();
    await auth.default(
      fakeReq({ body: { action: 'login', email: 'a@b.co', password: 'a'.repeat(200) } }),
      res,
    );
    assert.equal(res.statusCode, 400, 'password length is rejected as invalid input first');

    const res2 = fakeRes();
    await auth.default(fakeReq({ body: { action: 'login', blob: 'x'.repeat(5_000_000) } }), res2);
    assert.equal(res2.statusCode, 413);
  });

  await check('api/auth: database failure returns a generic error', async () => {
    const res = fakeRes();
    await auth.default(fakeReq({ body: { action: 'login', email: 'a@b.co', password: 'abcdefgh' } }), res);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(Object.keys(res.payload), ['error']);
    assert.equal(res.payload.error, 'Internal error');
  });

  await check('api/me: 401 without a token, 405 for POST', async () => {
    const noToken = fakeRes();
    await me.default(fakeReq({ method: 'GET' }), noToken);
    assert.equal(noToken.statusCode, 401);

    const wrongMethod = fakeRes();
    await me.default(fakeReq({ method: 'POST', body: {} }), wrongMethod);
    assert.equal(wrongMethod.statusCode, 405);
    assert.equal(wrongMethod.headers.allow, 'GET');
  });

  await check('api/me: a forged token is rejected (401)', async () => {
    const res = fakeRes();
    await me.default(
      fakeReq({ method: 'GET', headers: { authorization: 'Bearer aaa.bbb' } }),
      res,
    );
    assert.equal(res.statusCode, 401);
  });

  await check('api/workspace: auth required for GET and POST', async () => {
    const get = fakeRes();
    await workspace.default(fakeReq({ method: 'GET' }), get);
    assert.equal(get.statusCode, 401);

    const post = fakeRes();
    await workspace.default(fakeReq({ method: 'POST', body: { data: 'AAAA', iv: 'AAAAAAAAAAAAAAAA' } }), post);
    assert.equal(post.statusCode, 401);
  });

  await check('api/workspace: PUT is rejected with 405', async () => {
    const res = fakeRes();
    await workspace.default(fakeReq({ method: 'PUT' }), res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'GET, POST');
  });

  await check('handlers answer same-origin OPTIONS with 204 and reject foreign ones', async () => {
    for (const handler of [auth, me, workspace]) {
      // Same-origin / non-browser caller: no CORS needed, preflight succeeds.
      const sameOrigin = fakeRes();
      await handler.default(fakeReq({ method: 'OPTIONS' }), sameOrigin);
      assert.equal(sameOrigin.statusCode, 204);
      assert.equal(sameOrigin.ended, true);

      // Foreign origin with CORS unconfigured: rejected loudly (403).
      const foreign = fakeRes();
      await handler.default(
        fakeReq({ method: 'OPTIONS', headers: { origin: 'https://app.test' } }),
        foreign,
      );
      assert.equal(foreign.statusCode, 403);
    }
  });
}

// ---------------------------------------------------------------- main

(async () => {
  console.log('DevDesk self-test (offline)\n');
  try {
    await runSyncTests();
    await runApiTests();
    await runHandlerTests();
  } catch (err) {
    console.error('\nUnexpected failure:', err);
    process.exitCode = 1;
    return;
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const f of failed) console.log(` - ${f.name}: ${f.error && f.error.message}`);
    process.exitCode = 1;
  }
})();
