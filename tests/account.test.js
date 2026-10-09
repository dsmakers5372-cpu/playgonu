import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { handleAccount } from '../src/server/account.js';
import { hashPassword, verifyPassword, createUserSession, readUserSession, cleanEmail, cleanNickname, addResult } from '../src/server/users.js';
import { buildMail } from '../src/server/mail.js';
import fs from 'node:fs';

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
  const migration = fs.readFileSync(new URL('../migrations/0002_accounts.sql', import.meta.url), 'utf8');
  db.exec(migration);
  return { prepare: (sql) => stmt(sql), batch: async (list) => { for (const s of list) await s.run(); }, raw: db };
}

const ORIGIN = 'http://localhost:8787';

function setup(extraEnv = {}, origin = ORIGIN) {
  const env = { DB: fakeD1(), SESSION_SECRET: 'test-session-secret', ...extraEnv };
  const mails = [];
  const call = async (path, body, { cookie, method = 'POST', from = origin } = {}) => {
    const headers = { 'Content-Type': 'application/json', Origin: from };
    if (cookie) headers.Cookie = cookie;
    const req = new Request(`${origin}/api/account${path}`, { method, headers, body: method === 'POST' ? JSON.stringify(body || {}) : undefined });
    const log = console.log;
    console.log = (line) => { const m = String(line).match(/^\[dev mail\] (\w+) → (\S+)/); if (m) mails.push({ kind: m[1], link: m[2] }); else log(line); };
    try {
      const res = await handleAccount(req, env, new URL(req.url));
      const setCookie = res.headers.get('Set-Cookie');
      return { status: res.status, data: await res.json(), cookie: setCookie ? setCookie.split(';')[0] : null, setCookie };
    } finally {
      console.log = log;
    }
  };
  return { env, mails, call };
}

const tokenOf = (link, param) => new URL(link).searchParams.get(param);
const SIGNUP = { email: 'Player@Example.com', password: 'correct horse', nickname: '고누왕', lang: 'ko', age14: true };

async function signedUp(ctx) {
  await ctx.call('/signup', SIGNUP);
  const r = await ctx.call('/verify', { token: tokenOf(ctx.mails.at(-1).link, 'verify') });
  return r.cookie;
}

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

test('email and nickname rules', () => {
  assert.equal(cleanEmail('  A@B.co '), 'a@b.co');
  assert.equal(cleanEmail('nope'), null);
  assert.equal(cleanNickname(' 고누  왕 '), '고누 왕');
  assert.equal(cleanNickname('a'), null);
  assert.equal(cleanNickname('<script>'), null);
});

test('account emails are escaped and in the right language', () => {
  const m = buildMail('verify', 'ko', 'https://playgonu.com/account/?verify=abc&lang=ko');
  assert.equal(m.subject, '플레이고누 가입 확인');
  assert.match(m.html, /verify=abc&amp;lang=ko/);
  assert.equal(buildMail('reset', 'xx', 'https://x').subject, 'Reset your PlayGonu password');
});

test('sign-up checks its fields', async () => {
  const { call } = setup();
  assert.equal((await call('/signup', { ...SIGNUP, email: 'bad' })).data.error, 'bad-email');
  assert.equal((await call('/signup', { ...SIGNUP, nickname: 'x' })).data.error, 'bad-nickname');
  assert.equal((await call('/signup', { ...SIGNUP, password: 'short' })).data.error, 'bad-password');
  assert.equal((await call('/signup', { ...SIGNUP, age14: false })).data.error, 'age');
});

test('sign up → confirm email → signed in, with an empty record', async () => {
  const ctx = setup();
  const r = await ctx.call('/signup', SIGNUP);
  assert.deepEqual(r.data, { ok: true, sent: true });
  assert.equal(ctx.mails.length, 1);
  assert.equal(ctx.mails[0].kind, 'verify');

  // Not confirmed yet: right password still can't sign in (and the link is re-sent).
  const early = await ctx.call('/login', { email: SIGNUP.email, password: SIGNUP.password });
  assert.equal(early.status, 403);
  assert.equal(early.data.error, 'unverified');
  assert.equal(ctx.mails.length, 2);

  const v = await ctx.call('/verify', { token: tokenOf(ctx.mails.at(-1).link, 'verify') });
  assert.equal(v.status, 200);
  assert.match(v.setCookie, /^pg_user=.+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/);
  assert.equal(v.data.user.email, 'player@example.com');
  assert.equal(v.data.user.nickname, '고누왕');
  assert.deepEqual(v.data.user.stats.cham, { wins: 0, draws: 0, losses: 0 });

  // The link works once.
  assert.equal((await ctx.call('/verify', { token: tokenOf(ctx.mails.at(-1).link, 'verify') })).data.error, 'bad-link');

  const me = await ctx.call('/me', null, { method: 'GET', cookie: v.cookie });
  assert.equal(me.data.user.email, 'player@example.com');
  assert.equal((await ctx.call('/me', null, { method: 'GET' })).data.user, null);
});

test('signing up again with a taken address looks the same and mails the owner', async () => {
  const ctx = setup();
  await signedUp(ctx);
  const again = await ctx.call('/signup', { ...SIGNUP, password: 'another pass' });
  assert.deepEqual(again.data, { ok: true, sent: true });
  assert.equal(ctx.mails.at(-1).kind, 'exists');
  // The original password still works; the new one doesn't.
  assert.equal((await ctx.call('/login', { email: SIGNUP.email, password: 'another pass' })).status, 401);
  assert.equal((await ctx.call('/login', { email: SIGNUP.email, password: SIGNUP.password })).status, 200);
});

test('wrong passwords are counted and then blocked', async () => {
  const ctx = setup();
  await signedUp(ctx);
  for (let i = 0; i < 10; i++) assert.equal((await ctx.call('/login', { email: SIGNUP.email, password: 'wrong wrong' })).data.error, 'bad-login');
  assert.equal((await ctx.call('/login', { email: SIGNUP.email, password: SIGNUP.password })).status, 429);
  // An unknown address gives the same answer as a wrong password.
  const other = setup();
  assert.equal((await other.call('/login', { email: 'nobody@example.com', password: 'whatever1' })).data.error, 'bad-login');
});

test('finished online games add up; the local record can be added once', async () => {
  const ctx = setup();
  const cookie = await signedUp(ctx);
  const uid = ctx.env.DB.raw.prepare('SELECT id FROM users').get().id;
  await addResult(ctx.env, uid, 'cham', 'win');
  await addResult(ctx.env, uid, 'cham', 'win');
  await addResult(ctx.env, uid, 'gomoku', 'draw');
  await addResult(ctx.env, uid, 'jul', 'win'); // not an online game: ignored
  let me = (await ctx.call('/me', null, { method: 'GET', cookie })).data.user;
  assert.deepEqual(me.stats, { cham: { wins: 2, draws: 0, losses: 0 }, gomoku: { wins: 0, draws: 1, losses: 0 } });
  assert.equal(me.canImport, true);

  const imp = await ctx.call('/import', { stats: { cham: { wins: 3, losses: 1 }, gomoku: { wins: -5, losses: 1e9 } } }, { cookie });
  assert.deepEqual(imp.data.user.stats, { cham: { wins: 5, draws: 0, losses: 1 }, gomoku: { wins: 0, draws: 1, losses: 100000 } });
  assert.equal(imp.data.user.canImport, false);
  assert.equal((await ctx.call('/import', { stats: { cham: { wins: 1 } } }, { cookie })).data.error, 'already-imported');
  me = (await ctx.call('/me', null, { method: 'GET', cookie })).data.user;
  assert.equal(me.stats.cham.wins, 5);
});

test('changing the password signs out other sessions', async () => {
  const ctx = setup();
  const oldCookie = await signedUp(ctx);
  assert.equal((await ctx.call('/password', { current: 'wrong wrong', password: 'new password 1' }, { cookie: oldCookie })).data.error, 'bad-current');
  const ch = await ctx.call('/password', { current: SIGNUP.password, password: 'new password 1' }, { cookie: oldCookie });
  assert.equal(ch.status, 200);
  assert.equal((await ctx.call('/me', null, { method: 'GET', cookie: oldCookie })).data.user, null);
  assert.equal((await ctx.call('/me', null, { method: 'GET', cookie: ch.cookie })).data.user.nickname, '고누왕');
  assert.equal((await ctx.call('/login', { email: SIGNUP.email, password: 'new password 1' })).status, 200);
});

test('forgot password → reset link → new password, old sessions out', async () => {
  const ctx = setup();
  const oldCookie = await signedUp(ctx);
  assert.deepEqual((await ctx.call('/forgot', { email: 'nobody@example.com' })).data, { ok: true, sent: true });
  const before = ctx.mails.length;
  await ctx.call('/forgot', { email: SIGNUP.email, lang: 'en' });
  assert.equal(ctx.mails.length, before + 1);
  const link = ctx.mails.at(-1).link;
  assert.equal(ctx.mails.at(-1).kind, 'reset');
  assert.equal((await ctx.call('/reset', { token: tokenOf(link, 'reset'), password: 'short' })).data.error, 'bad-password');
  const r = await ctx.call('/reset', { token: tokenOf(link, 'reset'), password: 'brand new pass' });
  assert.equal(r.status, 200);
  assert.equal((await ctx.call('/me', null, { method: 'GET', cookie: oldCookie })).data.user, null);
  assert.equal((await ctx.call('/login', { email: SIGNUP.email, password: 'brand new pass' })).status, 200);
  assert.equal((await ctx.call('/reset', { token: tokenOf(link, 'reset'), password: 'again again' })).data.error, 'bad-link');
});

test('nickname change and account deletion', async () => {
  const ctx = setup();
  const cookie = await signedUp(ctx);
  assert.equal((await ctx.call('/profile', { nickname: '!' }, { cookie })).data.error, 'bad-nickname');
  assert.equal((await ctx.call('/profile', { nickname: 'Gonu Master' }, { cookie })).data.user.nickname, 'Gonu Master');
  assert.equal((await ctx.call('/delete', { password: 'wrong wrong' }, { cookie })).data.error, 'bad-current');
  const del = await ctx.call('/delete', { password: SIGNUP.password }, { cookie });
  assert.equal(del.status, 200);
  assert.match(del.setCookie, /Max-Age=0/);
  assert.equal(ctx.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
  assert.equal((await ctx.call('/me', null, { method: 'GET', cookie })).data.user, null);
});

test('writes from another site and missing setup are refused', async () => {
  const ctx = setup();
  assert.equal((await ctx.call('/signup', SIGNUP, { from: 'https://evil.example' })).status, 403);
  // A live host without the email key can't take sign-ups.
  const live = setup({}, 'https://playgonu.com');
  assert.equal((await live.call('/signup', SIGNUP)).data.error, 'mail-off');
  const noSecret = setup({ SESSION_SECRET: '' });
  assert.equal((await noSecret.call('/me', null, { method: 'GET' })).status, 503);
});

test('the account schema in schema.js matches the migration', async () => {
  const src = fs.readFileSync(new URL('../src/server/schema.js', import.meta.url), 'utf8');
  for (const table of ['users', 'user_tokens', 'user_stats', 'rate_limits']) assert.match(src, new RegExp(`CREATE TABLE IF NOT EXISTS ${table} `));
});
