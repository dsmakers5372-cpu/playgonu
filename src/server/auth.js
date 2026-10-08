// Admin sign-in for the PlayGonu admin page. One password, stored only as
// the Worker secret ADMIN_PASSWORD (`wrangler secret put ADMIN_PASSWORD`;
// locally in .dev.vars, never committed). A successful sign-in sets a signed,
// HttpOnly cookie valid for 12 hours; the signing key is derived from the
// password, so changing the password signs everyone out.

const COOKIE = 'pg_admin';
const SESSION_SECONDS = 12 * 60 * 60;
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

// Compares two secrets without leaking where they differ: both are hashed to
// fixed-length digests and every byte is compared.
export async function secretsEqual(a, b) {
  const [x, y] = await Promise.all([sha256(String(a)), sha256(String(b))]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function signingKey(password) {
  const raw = await sha256(`pg-admin-session:${password}`);
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSessionToken(password, now = Date.now()) {
  const exp = Math.floor(now / 1000) + SESSION_SECONDS;
  const sig = await crypto.subtle.sign('HMAC', await signingKey(password), enc.encode(`admin|${exp}`));
  return `${exp}.${b64url(sig)}`;
}

export async function verifySessionToken(token, password, now = Date.now()) {
  if (!token || !password) return false;
  const [expText, sig] = String(token).split('.');
  const exp = Number(expText);
  if (!Number.isFinite(exp) || exp < Math.floor(now / 1000) || !sig) return false;
  const expected = b64url(await crypto.subtle.sign('HMAC', await signingKey(password), enc.encode(`admin|${exp}`)));
  return secretsEqual(sig, expected);
}

export function readCookie(request, name = COOKIE) {
  const header = request.headers.get('Cookie') || '';
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function sessionCookie(token, secure) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure ? '; Secure' : ''}`;
}

export function clearedCookie(secure) {
  return `${COOKIE}=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export async function isAdmin(request, env) {
  return verifySessionToken(readCookie(request), env.ADMIN_PASSWORD);
}

// Brute-force guard: at most MAX_ATTEMPTS failed sign-ins per IP per window.
export async function tooManyAttempts(env, ip, now = Date.now()) {
  const row = await env.DB.prepare('SELECT window_start, count FROM login_attempts WHERE ip = ?').bind(ip).first();
  const t = Math.floor(now / 1000);
  return !!row && t - row.window_start < ATTEMPT_WINDOW_SECONDS && row.count >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(env, ip, now = Date.now()) {
  const t = Math.floor(now / 1000);
  await env.DB.prepare(
    `INSERT INTO login_attempts (ip, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT(ip) DO UPDATE SET
       count = CASE WHEN ?2 - window_start >= ?3 THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN ?2 - window_start >= ?3 THEN ?2 ELSE window_start END`,
  ).bind(ip, t, ATTEMPT_WINDOW_SECONDS).run();
}

export async function clearAttempts(env, ip) {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
}
