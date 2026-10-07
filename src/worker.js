// Cloudflare Worker entry point (static-assets mode). Replaces the old
// Pages Functions middleware — this Cloudflare project deploys via
// `wrangler deploy`, which uses this file, not functions/_middleware.js.
//
// Redirects a first-time visitor to their country's default language,
// using Cloudflare's own edge geolocation (request.cf.country) — no
// external IP-lookup service, no cost. A visitor who has ever used the
// language switcher gets a `pg_lang` cookie (set client-side in
// src/ui/languageSwitcher.js) and is never auto-redirected again, so
// their choice always wins over geolocation.

import { GameRoom } from './durable/GameRoom.js';
import { Lobby } from './durable/Lobby.js';

export { GameRoom, Lobby };

const COUNTRY_DEFAULT_LANG = { KR: 'ko' };
const ASSET_PATH = /\.(js|css|svg|png|jpg|jpeg|webp|ico|json|woff2?|txt|xml)$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Online-battle room — one Durable Object instance per room id, created
    // lazily on first connection.
    if (url.pathname.startsWith('/ws/room/')) {
      const roomId = url.pathname.slice('/ws/room/'.length);
      if (!roomId) return new Response('Missing room id', { status: 400 });
      const id = env.GAME_ROOM.idFromName(roomId);
      return env.GAME_ROOM.get(id).fetch(request);
    }

    // Public-room dashboard list, e.g. /api/lobby?game=cham
    if (url.pathname === '/api/lobby') {
      const id = env.LOBBY.idFromName('global');
      return env.LOBBY.get(id).fetch(request);
    }

    if (!ASSET_PATH.test(url.pathname)) {
      const cookie = request.headers.get('Cookie') || '';
      const hasChoice = /(?:^|;\s*)pg_lang=/.test(cookie);
      if (!hasChoice) {
        const country = request.cf && request.cf.country;
        const lang = country && COUNTRY_DEFAULT_LANG[country];
        if (lang && lang !== 'en') {
          const alreadyLocalized = url.pathname === `/${lang}` || url.pathname.startsWith(`/${lang}/`);
          if (!alreadyLocalized) {
            const target = new URL(url);
            target.pathname = `/${lang}${url.pathname}`;
            return Response.redirect(target.toString(), 302);
          }
        }
      }
    }

    return env.ASSETS.fetch(request);
  },
};
