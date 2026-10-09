// Small client for the optional player accounts (/api/account/*), shared by
// the account page, the online lobby and the in-game record table.

let mePromise = null;

// The signed-in player ({ email, nickname, stats, ... }) or null. Cached for
// the page; pass `fresh` after signing in or out.
export function fetchMe(fresh = false) {
  if (!mePromise || fresh) {
    mePromise = fetch('/api/account/me', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => d.user || null)
      .catch(() => null);
  }
  return mePromise;
}

export async function accountPost(path, body = {}) {
  try {
    const res = await fetch(`/api/account${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (data.user !== undefined) mePromise = Promise.resolve(data.user);
    return res.ok ? data : { error: data.error || 'network' };
  } catch {
    return { error: 'network' };
  }
}

export const accountUrl = (lang) => `/account/?lang=${encodeURIComponent(lang || 'en')}`;

// The win/draw/loss counts this browser kept for a guest (onlineMatchPanel).
export function readLocalStats(game) {
  try {
    const raw = JSON.parse(localStorage.getItem(`playgonu:stats:${game}`));
    if (raw && typeof raw === 'object') return { wins: raw.wins | 0, draws: raw.draws | 0, losses: raw.losses | 0 };
  } catch { /* ignore */ }
  return { wins: 0, draws: 0, losses: 0 };
}
