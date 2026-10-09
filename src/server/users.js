// Player accounts (optional): email + password. Playing never needs one —
// an account only keeps the online win/draw/loss record on the server.
//
// Passwords are stored as PBKDF2-SHA256 hashes (Workers' Web Crypto allows at
// most 100,000 iterations). A signed-in player carries a signed, HttpOnly
// cookie `pg_user` = "uid.ver.exp.sig"; the HMAC key comes from the Worker
// secret SESSION_SECRET, and `ver` must match users.session_ver, so changing
// or resetting a password signs out every other device.

export const LANGS = ['en', 'ko', 'es', 'ja', 'zh'];
export const STAT_GAMES = ['cham', 'gomoku'];
const COOKIE = 'pg_user';
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const PBKDF2_ITERATIONS = 100000;

const enc = new TextEncoder();
export const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function sha256Hex(text) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));
  return [...d].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// ---- input checks ---------------------------------------------------------------
export function cleanEmail(v) {
  const email = String(v || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function cleanNickname(v) {
  const name = String(v || '').trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 20 && /^[\p{L}\p{N} _.-]+$/u.test(name) ? name : null;
}

export const passwordOk = (v) => typeof v === 'string' && v.length >= 8 && v.length <= 128;
export const cleanLang = (v) => (LANGS.includes(v) ? v : 'en');

// ---- password hashing -----------------------------------------------------------
async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'pbkdf2-sha256' || !salt || !hash) return false;
  const got = await pbkdf2(String(password), fromB64url(salt), Number(iter));
  return equalBytes(got, fromB64url(hash));
}

// Spends the same time as a real check, so "no such email" and "wrong
// password" can't be told apart by how long sign-in takes.
export async function burnPasswordCheck(password) {
  await pbkdf2(String(password), new Uint8Array(16), PBKDF2_ITERATIONS);
  return false;
}

// ---- one-time tokens (email links) ----------------------------------------------
export const newToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));

// ---- sessions -------------------------------------------------------------------
async function sessionKey(secret) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`pg-user-session:${secret}`));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function createUserSession(uid, ver, secret, now = Date.now()) {
  const exp = Math.floor(now / 1000) + SESSION_SECONDS;
  const sig = await crypto.subtle.sign('HMAC', await sessionKey(secret), enc.encode(`user|${uid}|${ver}|${exp}`));
  return `${uid}.${ver}.${exp}.${b64url(sig)}`;
}

// Returns { uid, ver } for a well-signed, unexpired token, otherwise null.
export async function readUserSession(token, secret, now = Date.now()) {
  if (!token || !secret) return null;
  const [uidText, verText, expText, sig] = String(token).split('.');
  const uid = Number(uidText);
  const ver = Number(verText);
  const exp = Number(expText);
  if (!Number.isInteger(uid) || !Number.isInteger(ver) || !Number.isFinite(exp) || exp < Math.floor(now / 1000) || !sig) return null;
  const expected = b64url(await crypto.subtle.sign('HMAC', await sessionKey(secret), enc.encode(`user|${uid}|${ver}|${exp}`)));
  return equalBytes(enc.encode(sig), enc.encode(expected)) ? { uid, ver } : null;
}

export function readUserCookie(request) {
  const header = request.headers.get('Cookie') || '';
  const m = header.match(/(?:^|;\s*)pg_user=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export const userCookie = (token, secure) => `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure ? '; Secure' : ''}`;
export const clearedUserCookie = (secure) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;

// The signed-in, email-confirmed user behind this request, or null.
export async function sessionUser(request, env) {
  if (!env.DB || !env.SESSION_SECRET) return null;
  const s = await readUserSession(readUserCookie(request), env.SESSION_SECRET);
  if (!s) return null;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(s.uid).first();
  return user && user.verified && user.session_ver === s.ver ? user : null;
}

// ---- rate limits ----------------------------------------------------------------
export async function overLimit(env, key, limit, windowSeconds, now = Date.now()) {
  const row = await env.DB.prepare('SELECT window_start, count FROM rate_limits WHERE key = ?').bind(key).first();
  return !!row && Math.floor(now / 1000) - row.window_start < windowSeconds && row.count >= limit;
}

export async function bump(env, key, windowSeconds, now = Date.now()) {
  await env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN ?2 - window_start >= ?3 THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN ?2 - window_start >= ?3 THEN ?2 ELSE window_start END`,
  ).bind(key, Math.floor(now / 1000), windowSeconds).run();
}

// ---- online results -------------------------------------------------------------
const OUTCOME_COLUMN = { win: 'wins', draw: 'draws', loss: 'losses' };

export async function addResult(env, uid, game, outcome) {
  const col = OUTCOME_COLUMN[outcome];
  if (!env.DB || !col || !STAT_GAMES.includes(game)) return;
  await env.DB.prepare(
    `INSERT INTO user_stats (user_id, game, wins, draws, losses, updated_at) VALUES (?1, ?2, 0, 0, 0, ?3)
     ON CONFLICT(user_id, game) DO NOTHING`,
  ).bind(uid, game, new Date().toISOString()).run();
  await env.DB.prepare(`UPDATE user_stats SET ${col} = ${col} + 1, updated_at = ? WHERE user_id = ? AND game = ?`)
    .bind(new Date().toISOString(), uid, game).run();
}

export async function statsFor(env, uid) {
  const { results } = await env.DB.prepare('SELECT game, wins, draws, losses FROM user_stats WHERE user_id = ?').bind(uid).all();
  const stats = Object.fromEntries(STAT_GAMES.map((g) => [g, { wins: 0, draws: 0, losses: 0 }]));
  for (const r of results) if (stats[r.game]) stats[r.game] = { wins: r.wins, draws: r.draws, losses: r.losses };
  return stats;
}
