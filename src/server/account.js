// /api/account/* — optional player accounts (email + password). Answers carry
// short codes (`error: 'bad-login'` etc.); the account page turns them into
// text in the visitor's language. Every write must come from this site's own
// pages (Origin check, on top of the SameSite=Lax cookie).
import {
  cleanEmail, cleanNickname, passwordOk, cleanLang, hashPassword, verifyPassword, burnPasswordCheck,
  newToken, sha256Hex, createUserSession, userCookie, clearedUserCookie, sessionUser,
  overLimit, bump, statsFor, STAT_GAMES,
} from './users.js';
import { canSendMail, sendMail } from './mail.js';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const iso = () => new Date().toISOString();
const nowSec = () => Math.floor(Date.now() / 1000);

const VERIFY_SECONDS = 24 * 60 * 60;
const RESET_SECONDS = 60 * 60;
const UNVERIFIED_KEEP_DAYS = 7;
const LOGIN_FAILS = { limit: 10, window: 15 * 60 };
const MAILS_PER_ADDRESS = { limit: 3, window: 60 * 60 };
const MAILS_PER_IP = { limit: 10, window: 60 * 60 };
const IMPORT_MAX = 100000;

function publicUser(user, stats) {
  return { email: user.email, nickname: user.nickname, lang: user.lang, createdAt: user.created_at, canImport: !user.local_imported, stats };
}

async function issueToken(env, uid, kind, seconds) {
  const token = newToken();
  await env.DB.prepare('DELETE FROM user_tokens WHERE user_id = ? AND kind = ?').bind(uid, kind).run();
  await env.DB.prepare('INSERT INTO user_tokens (token_hash, user_id, kind, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), uid, kind, nowSec() + seconds).run();
  return token;
}

// Looks up and burns a one-time token; returns its user id or null.
async function takeToken(env, token, kind) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  const hash = await sha256Hex(token);
  const row = await env.DB.prepare('SELECT user_id, expires_at FROM user_tokens WHERE token_hash = ? AND kind = ?').bind(hash, kind).first();
  if (!row) return null;
  await env.DB.prepare('DELETE FROM user_tokens WHERE token_hash = ?').bind(hash).run();
  return row.expires_at >= nowSec() ? row.user_id : null;
}

const accountLink = (url, param, token, lang) => `${url.origin}/account/?${param}=${encodeURIComponent(token)}&lang=${lang}`;

// Rate limits sending to one address and from one network.
async function mayMail(env, email, ip) {
  if (await overLimit(env, `mail:${email}`, MAILS_PER_ADDRESS.limit, MAILS_PER_ADDRESS.window)) return false;
  if (await overLimit(env, `mail-ip:${ip}`, MAILS_PER_IP.limit, MAILS_PER_IP.window)) return false;
  await bump(env, `mail:${email}`, MAILS_PER_ADDRESS.window);
  await bump(env, `mail-ip:${ip}`, MAILS_PER_IP.window);
  return true;
}

async function signIn(env, user, secure, extra = {}) {
  const token = await createUserSession(user.id, user.session_ver, env.SESSION_SECRET);
  return json({ ok: true, user: publicUser(user, await statsFor(env, user.id)), ...extra }, 200, { 'Set-Cookie': userCookie(token, secure) });
}

async function deleteUser(env, uid) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM user_stats WHERE user_id = ?').bind(uid),
    env.DB.prepare('DELETE FROM user_tokens WHERE user_id = ?').bind(uid),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(uid),
  ]);
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
    const email = cleanEmail(body.email);
    const nickname = cleanNickname(body.nickname);
    const lang = cleanLang(body.lang);
    if (!email) return json({ error: 'bad-email' }, 400);
    if (!nickname) return json({ error: 'bad-nickname' }, 400);
    if (!passwordOk(body.password)) return json({ error: 'bad-password' }, 400);
    if (body.age14 !== true) return json({ error: 'age' }, 400);
    if (!canSendMail(env, url)) return json({ error: 'mail-off' }, 503);
    if (!(await mayMail(env, email, ip))) return json({ error: 'too-many' }, 429);
    // Sign-ups never confirmed within a week are dropped.
    const stale = new Date(Date.now() - UNVERIFIED_KEEP_DAYS * 86400000).toISOString();
    await env.DB.prepare('DELETE FROM user_tokens WHERE expires_at < ?').bind(nowSec()).run();
    await env.DB.prepare('DELETE FROM users WHERE verified = 0 AND created_at < ?').bind(stale).run();

    const existing = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    // The answer is the same whether or not the address is taken, so the
    // form can't be used to find out who has an account. An unconfirmed
    // sign-up keeps its first password (the owner can reset it by email).
    if (existing && existing.verified) {
      await sendMail(env, url, email, 'exists', lang, `${url.origin}/account/?lang=${lang}`);
    } else if (existing) {
      await sendMail(env, url, email, 'verify', existing.lang, accountLink(url, 'verify', await issueToken(env, existing.id, 'verify', VERIFY_SECONDS), existing.lang));
    } else {
      const t = iso();
      const row = await env.DB.prepare('INSERT INTO users (email, password_hash, nickname, lang, verified, session_ver, local_imported, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 1, 0, ?, ?) RETURNING id')
        .bind(email, await hashPassword(body.password), nickname, lang, t, t).first();
      await sendMail(env, url, email, 'verify', lang, accountLink(url, 'verify', await issueToken(env, row.id, 'verify', VERIFY_SECONDS), lang));
    }
    return json({ ok: true, sent: true });
  }

  if (path === '/verify' && method === 'POST') {
    const uid = await takeToken(env, body.token, 'verify');
    if (!uid) return json({ error: 'bad-link' }, 400);
    await env.DB.prepare('UPDATE users SET verified = 1, updated_at = ? WHERE id = ?').bind(iso(), uid).run();
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first();
    return user ? signIn(env, user, secure) : json({ error: 'bad-link' }, 400);
  }

  if (path === '/login' && method === 'POST') {
    const email = cleanEmail(body.email);
    if (await overLimit(env, `login-ip:${ip}`, LOGIN_FAILS.limit, LOGIN_FAILS.window)) return json({ error: 'too-many' }, 429);
    if (email && await overLimit(env, `login:${email}`, LOGIN_FAILS.limit, LOGIN_FAILS.window)) return json({ error: 'too-many' }, 429);
    const user = email ? await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() : null;
    const ok = user ? await verifyPassword(String(body.password || ''), user.password_hash) : await burnPasswordCheck(String(body.password || ''));
    if (!ok) {
      await bump(env, `login-ip:${ip}`, LOGIN_FAILS.window);
      if (email) await bump(env, `login:${email}`, LOGIN_FAILS.window);
      return json({ error: 'bad-login' }, 401);
    }
    if (!user.verified) {
      // Right password, address not confirmed yet: send the link again.
      if (canSendMail(env, url) && await mayMail(env, email, ip)) {
        await sendMail(env, url, email, 'verify', user.lang, accountLink(url, 'verify', await issueToken(env, user.id, 'verify', VERIFY_SECONDS), user.lang));
      }
      return json({ error: 'unverified' }, 403);
    }
    return signIn(env, user, secure);
  }

  if (path === '/logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': clearedUserCookie(secure) });

  if (path === '/forgot' && method === 'POST') {
    const email = cleanEmail(body.email);
    if (!email) return json({ error: 'bad-email' }, 400);
    if (!canSendMail(env, url)) return json({ error: 'mail-off' }, 503);
    if (!(await mayMail(env, email, ip))) return json({ error: 'too-many' }, 429);
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (user) {
      const lang = cleanLang(body.lang || user.lang);
      await sendMail(env, url, email, 'reset', lang, accountLink(url, 'reset', await issueToken(env, user.id, 'reset', RESET_SECONDS), lang));
    }
    return json({ ok: true, sent: true });
  }

  if (path === '/reset' && method === 'POST') {
    if (!passwordOk(body.password)) return json({ error: 'bad-password' }, 400);
    const uid = await takeToken(env, body.token, 'reset');
    if (!uid) return json({ error: 'bad-link' }, 400);
    // The link proves the address, so it also confirms an unconfirmed sign-up.
    await env.DB.prepare('UPDATE users SET password_hash = ?, verified = 1, session_ver = session_ver + 1, updated_at = ? WHERE id = ?')
      .bind(await hashPassword(body.password), iso(), uid).run();
    await env.DB.prepare('DELETE FROM user_tokens WHERE user_id = ?').bind(uid).run();
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first();
    return signIn(env, user, secure);
  }

  // ---- signed-in only ----
  const user = await sessionUser(request, env);
  if (!user) return json({ error: 'signed-out' }, 401);

  if (path === '/profile' && method === 'POST') {
    const nickname = body.nickname === undefined ? user.nickname : cleanNickname(body.nickname);
    if (!nickname) return json({ error: 'bad-nickname' }, 400);
    const lang = body.lang === undefined ? user.lang : cleanLang(body.lang);
    await env.DB.prepare('UPDATE users SET nickname = ?, lang = ?, updated_at = ? WHERE id = ?').bind(nickname, lang, iso(), user.id).run();
    return json({ ok: true, user: publicUser({ ...user, nickname, lang }, await statsFor(env, user.id)) });
  }

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
    await deleteUser(env, user.id);
    return json({ ok: true }, 200, { 'Set-Cookie': clearedUserCookie(secure) });
  }

  return json({ error: 'not-found' }, 404);
}
