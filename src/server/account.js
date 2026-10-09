// /api/account/* — optional player accounts: an ID and a password, nothing
// else (no email, so a forgotten password can't be recovered). Answers carry
// short codes (`error: 'bad-login'` etc.); the account page turns them into
// text in the visitor's language. Every write must come from this site's own
// pages (Origin check, on top of the SameSite=Lax cookie).
import {
  cleanUsername, usernameKey, passwordOk, cleanLang, hashPassword, verifyPassword, burnPasswordCheck,
  createUserSession, userCookie, clearedUserCookie, sessionUser, overLimit, bump, statsFor, STAT_GAMES,
} from './users.js';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const iso = () => new Date().toISOString();

const LOGIN_FAILS = { limit: 10, window: 15 * 60 };
const SIGNUPS_PER_IP = { limit: 10, window: 60 * 60 };
const IMPORT_MAX = 100000;

function publicUser(user, stats) {
  return { username: user.username, lang: user.lang, createdAt: user.created_at, canImport: !user.local_imported, stats };
}

async function signIn(env, user, secure) {
  const token = await createUserSession(user.id, user.session_ver, env.SESSION_SECRET);
  return json({ ok: true, user: publicUser(user, await statsFor(env, user.id)) }, 200, { 'Set-Cookie': userCookie(token, secure) });
}

export async function handleAccount(request, env, url) {
  const path = url.pathname.slice('/api/account'.length) || '/';
  const method = request.method;
  const secure = url.protocol === 'https:';
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  if (!env.DB || !env.SESSION_SECRET) return json({ error: 'not-configured' }, 503);
  if (method !== 'GET' && request.headers.get('Origin') !== url.origin) return json({ error: 'forbidden' }, 403);
  const body = method === 'POST' ? await request.json().catch(() => ({})) : {};

  if (path === '/me' && method === 'GET') {
    const user = await sessionUser(request, env);
    return json({ user: user ? publicUser(user, await statsFor(env, user.id)) : null });
  }

  if (path === '/signup' && method === 'POST') {
    const username = cleanUsername(body.username);
    if (!username) return json({ error: 'bad-username' }, 400);
    if (!passwordOk(body.password)) return json({ error: 'bad-password' }, 400);
    if (body.age14 !== true) return json({ error: 'age' }, 400);
    if (await overLimit(env, `signup-ip:${ip}`, SIGNUPS_PER_IP.limit, SIGNUPS_PER_IP.window)) return json({ error: 'too-many' }, 429);
    const t = iso();
    let row;
    try {
      row = await env.DB.prepare('INSERT INTO users (username, username_key, password_hash, lang, session_ver, local_imported, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 0, ?, ?) RETURNING *')
        .bind(username, usernameKey(username), await hashPassword(body.password), cleanLang(body.lang), t, t).first();
    } catch (e) {
      if (/UNIQUE/.test(String(e))) return json({ error: 'taken' }, 409);
      throw e;
    }
    await bump(env, `signup-ip:${ip}`, SIGNUPS_PER_IP.window);
    return signIn(env, row, secure);
  }

  if (path === '/login' && method === 'POST') {
    const username = cleanUsername(body.username);
    const key = username ? usernameKey(username) : null;
    if (await overLimit(env, `login-ip:${ip}`, LOGIN_FAILS.limit, LOGIN_FAILS.window)) return json({ error: 'too-many' }, 429);
    if (key && await overLimit(env, `login:${key}`, LOGIN_FAILS.limit, LOGIN_FAILS.window)) return json({ error: 'too-many' }, 429);
    const user = key ? await env.DB.prepare('SELECT * FROM users WHERE username_key = ?').bind(key).first() : null;
    const ok = user ? await verifyPassword(String(body.password || ''), user.password_hash) : await burnPasswordCheck(String(body.password || ''));
    if (!ok) {
      await bump(env, `login-ip:${ip}`, LOGIN_FAILS.window);
      if (key) await bump(env, `login:${key}`, LOGIN_FAILS.window);
      return json({ error: 'bad-login' }, 401);
    }
    return signIn(env, user, secure);
  }

  if (path === '/logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': clearedUserCookie(secure) });

  // ---- signed-in only ----
  const user = await sessionUser(request, env);
  if (!user) return json({ error: 'signed-out' }, 401);

  if (path === '/password' && method === 'POST') {
    if (!passwordOk(body.password)) return json({ error: 'bad-password' }, 400);
    if (!(await verifyPassword(String(body.current || ''), user.password_hash))) return json({ error: 'bad-current' }, 401);
    await env.DB.prepare('UPDATE users SET password_hash = ?, session_ver = session_ver + 1, updated_at = ? WHERE id = ?')
      .bind(await hashPassword(body.password), iso(), user.id).run();
    return signIn(env, { ...user, session_ver: user.session_ver + 1 }, secure);
  }

  // One-time: add the win/draw/loss counts this browser kept before signing up.
  if (path === '/import' && method === 'POST') {
    if (user.local_imported) return json({ error: 'already-imported' }, 409);
    const n = (v) => Math.max(0, Math.min(IMPORT_MAX, Math.floor(Number(v) || 0)));
    const t = iso();
    const stmts = [env.DB.prepare('UPDATE users SET local_imported = 1, updated_at = ? WHERE id = ?').bind(t, user.id)];
    for (const game of STAT_GAMES) {
      const s = body.stats?.[game];
      if (!s) continue;
      stmts.push(env.DB.prepare(
        `INSERT INTO user_stats (user_id, game, wins, draws, losses, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(user_id, game) DO UPDATE SET wins = wins + ?3, draws = draws + ?4, losses = losses + ?5, updated_at = ?6`,
      ).bind(user.id, game, n(s.wins), n(s.draws), n(s.losses), t));
    }
    await env.DB.batch(stmts);
    return json({ ok: true, user: publicUser({ ...user, local_imported: 1 }, await statsFor(env, user.id)) });
  }

  if (path === '/delete' && method === 'POST') {
    if (!(await verifyPassword(String(body.password || ''), user.password_hash))) return json({ error: 'bad-current' }, 401);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM user_stats WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);
    return json({ ok: true }, 200, { 'Set-Cookie': clearedUserCookie(secure) });
  }

  return json({ error: 'not-found' }, 404);
}
