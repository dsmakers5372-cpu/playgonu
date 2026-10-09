import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { handleAccount } from '../src/server/account.js';
import { hashPassword, verifyPassword, createUserSession, readUserSession, cleanUsername, addResult } from '../src/server/users.js';

// A D1-shaped wrapper over an in-memory SQLite database, enough for the
// account API: prepare().bind().first()/all()/run() and batch().
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
  });
  db.exec(fs.readFileSync(new URL('../migrations/0002_accounts.sql', import.meta.url), 'utf8'));
  return { prepare: (sql) => stmt(sql), batch: async (list) => { for (const s of list) await s.run(); }, raw: db };
}

const ORIGIN = 'https://playgonu.com';

function setup(extraEnv = {}) {
  const env = { DB: fakeD1(), SESSION_SECRET: 'test-session-secret', ...extraEnv };
  const call = async (path, body, { cookie, method = 'POST', from = ORIGIN, ip = '1.2.3.4' } = {}) => {
    const headers = { 'Content-Type': 'application/json', Origin: from, 'CF-Connecting-IP': ip };
    if (cookie) headers.Cookie = cookie;
    const req = new Request(`${ORIGIN}/api/account${path}`, { method, headers, body: method === 'POST' ? JSON.stringify(body || {}) : undefined });
    const res = await handleAccount(req, env, new URL(req.url));
    const setCookie = res.headers.get('Set-Cookie');
    return { status: res.status, data: await res.json(), cookie: setCookie ? setCookie.split(';')[0] : null, setCookie };
  };
  const me = async (cookie) => (await call('/me', null, { method: 'GET', cookie })).data.user;
  return { env, call, me };
}

const SIGNUP = { username: '고누왕', password: 'correct horse', lang: 'ko', age14: true };

test('passwords hash with a salt and verify', async () => {
  const a = await hashPassword('secret-one');
  const b = await hashPassword('secret-one');
  assert.notEqual(a, b);
  assert.match(a, /^pbkdf2-sha256\$100000\$/);
  assert.equal(await verifyPassword('secret-one', a), true);
  assert.equal(await verifyPassword('secret-two', a), false);
  assert.equal(await verifyPassword('x', 'garbage'), false);
});

test('session tokens: valid, tampered, expired, other secret', async () => {
  const tok = await createUserSession(7, 2, 's1');
  assert.deepEqual(await readUserSession(tok, 's1'), { uid: 7, ver: 2 });
  assert.equal(await readUserSession(tok, 's2'), null);
  assert.equal(await readUserSession(tok.replace(/^7\./, '8.'), 's1'), null);
  assert.equal(await readUserSession(tok, 's1', Date.now() + 31 * 86400000), null);
});

test('ID rules', () => {
  assert.equal(cleanUsername('  Gonu_King '), 'Gonu_King');
  assert.equal(cleanUsername('고누'), '고누');
  assert.equal(cleanUsername('a'), null);
  assert.equal(cleanUsername('two words'), null);
  assert.equal(cleanUsername('<script>'), null);
  assert.equal(cleanUsername('x'.repeat(21)), null);
});

test('sign-up checks its fields', async () => {
  const { call } = setup();
  assert.equal((await call('/signup', { ...SIGNUP, username: 'a b' })).data.error, 'bad-username');
  assert.equal((await call('/signup', { ...SIGNUP, password: 'short' })).data.error, 'bad-password');
  assert.equal((await call('/signup', { ...SIGNUP, age14: false })).data.error, 'age');
});

test('sign up signs you in at once, with an empty record; IDs are unique ignoring case', async () => {
  const { call, me } = setup();
  const r = await call('/signup', { ...SIGNUP, username: 'GonuKing' });
  assert.equal(r.status, 200);
  assert.match(r.setCookie, /^pg_user=.+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure$/);
  assert.equal(r.data.user.username, 'GonuKing');
  assert.deepEqual(r.data.user.stats.cham, { wins: 0, draws: 0, losses: 0 });
  assert.equal((await me(r.cookie)).username, 'GonuKing');
  assert.equal(await me(null), null);

  assert.equal((await call('/signup', { ...SIGNUP, username: 'gonuking' })).data.error, 'taken');
  // Sign-in takes the ID in any case.
  assert.equal((await call('/login', { username: 'GONUKING', password: SIGNUP.password })).status, 200);
});

test('wrong passwords are counted and then blocked; unknown IDs look the same', async () => {
  const { call } = setup();
  await call('/signup', SIGNUP);
  for (let i = 0; i < 10; i++) assert.equal((await call('/login', { username: SIGNUP.username, password: 'wrong wrong' }, { ip: `9.9.9.${i}` })).data.error, 'bad-login');
  // The ID itself is locked for a while, from any network.
  assert.equal((await call('/login', { username: SIGNUP.username, password: SIGNUP.password }, { ip: '5.5.5.5' })).status, 429);
  assert.equal((await call('/login', { username: 'nobody', password: 'whatever1' })).data.error, 'bad-login');
});

test('one network can only make so many accounts an hour', async () => {
  const { call } = setup();
  for (let i = 0; i < 10; i++) assert.equal((await call('/signup', { ...SIGNUP, username: `player_${i}` })).status, 200);
  assert.equal((await call('/signup', { ...SIGNUP, username: 'player_x' })).data.error, 'too-many');
  assert.equal((await call('/signup', { ...SIGNUP, username: 'player_y' }, { ip: '8.8.8.8' })).status, 200);
});

test('finished online games add up; the local record can be added once', async () => {
  const ctx = setup();
  const { cookie } = await ctx.call('/signup', SIGNUP);
  const uid = ctx.env.DB.raw.prepare('SELECT id FROM users').get().id;
  await addResult(ctx.env, uid, 'cham', 'win');
  await addResult(ctx.env, uid, 'cham', 'win');
  await addResult(ctx.env, uid, 'gomoku', 'draw');
  await addResult(ctx.env, uid, 'jul', 'win'); // not an online game: ignored
  let user = await ctx.me(cookie);
  assert.deepEqual(user.stats, { cham: { wins: 2, draws: 0, losses: 0 }, gomoku: { wins: 0, draws: 1, losses: 0 } });
  assert.equal(user.canImport, true);

  const imp = await ctx.call('/import', { stats: { cham: { wins: 3, losses: 1 }, gomoku: { wins: -5, losses: 1e9 } } }, { cookie });
  assert.deepEqual(imp.data.user.stats, { cham: { wins: 5, draws: 0, losses: 1 }, gomoku: { wins: 0, draws: 1, losses: 100000 } });
  assert.equal(imp.data.user.canImport, false);
  assert.equal((await ctx.call('/import', { stats: { cham: { wins: 1 } } }, { cookie })).data.error, 'already-imported');
  user = await ctx.me(cookie);
  assert.equal(user.stats.cham.wins, 5);
});

test('changing the password signs out other sessions', async () => {
  const { call, me } = setup();
  const { cookie: oldCookie } = await call('/signup', SIGNUP);
  assert.equal((await call('/password', { current: 'wrong wrong', password: 'new password 1' }, { cookie: oldCookie })).data.error, 'bad-current');
  const ch = await call('/password', { current: SIGNUP.password, password: 'new password 1' }, { cookie: oldCookie });
  assert.equal(ch.status, 200);
  assert.equal(await me(oldCookie), null);
  assert.equal((await me(ch.cookie)).username, SIGNUP.username);
  assert.equal((await call('/login', { username: SIGNUP.username, password: 'new password 1' })).status, 200);
});

test('deleting the account removes it and its record', async () => {
  const ctx = setup();
  const { cookie } = await ctx.call('/signup', SIGNUP);
  await addResult(ctx.env, 1, 'cham', 'loss');
  assert.equal((await ctx.call('/delete', { password: 'wrong wrong' }, { cookie })).data.error, 'bad-current');
  const del = await ctx.call('/delete', { password: SIGNUP.password }, { cookie });
  assert.equal(del.status, 200);
  assert.match(del.setCookie, /Max-Age=0/);
  assert.equal(ctx.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
  assert.equal(ctx.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM user_stats').get().n, 0);
  assert.equal(await ctx.me(cookie), null);
  // The ID is free again.
  assert.equal((await ctx.call('/signup', SIGNUP)).status, 200);
});

test('writes from another site and missing setup are refused', async () => {
  const { call } = setup();
  assert.equal((await call('/signup', SIGNUP, { from: 'https://evil.example' })).status, 403);
  const noSecret = setup({ SESSION_SECRET: '' });
  assert.equal((await noSecret.call('/me', null, { method: 'GET' })).status, 503);
});

test('the account schema in schema.js matches the migration', () => {
  const src = fs.readFileSync(new URL('../src/server/schema.js', import.meta.url), 'utf8');
  for (const table of ['users', 'user_stats', 'rate_limits']) assert.match(src, new RegExp(`CREATE TABLE IF NOT EXISTS ${table} `));
  assert.match(src, /username_key TEXT NOT NULL UNIQUE/);
});
