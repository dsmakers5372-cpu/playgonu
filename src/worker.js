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
import { handleAdmin } from './server/admin.js';
import { handleAccount } from './server/account.js';
import { ensureSchema } from './server/schema.js';
import { BLOG_LANGS, renderPost, renderIndex, injectIndexCards, gamePageFor, pickVideo, injectVideo, injectSitemap } from './server/site.js';

export { GameRoom, Lobby };

// Pages that exist in every language folder — the only ones a first-time
// visitor is sent to their own language for (the blog is mostly English, so
// /blog/... must not be bounced to a /ko/blog/... that doesn't exist).
const LOCALIZED_PAGES = new Set(['', 'index', 'jul', 'daseotjul', 'palpal', 'bakwi', 'gomoku', 'howto', 'online', 'cham-strategy']);
const isLocalizedPage = (pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length <= 1 && LOCALIZED_PAGES.has((parts[0] || '').replace(/\.html$/, ''));
};

const htmlResponse = (html, status = 200) => new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } });

async function publishedPosts(env, lang) {
  if (!env.DB) return [];
  const q = lang
    ? env.DB.prepare('SELECT * FROM posts WHERE published = 1 AND lang = ? ORDER BY created_at DESC').bind(lang)
    : env.DB.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC');
  return (await q.all()).results;
}

// Blog pages: an admin-written (D1) post wins over a static file with the same
// address; the static index gets the admin's posts added to it.
async function serveBlog(request, env, url) {
  const m = url.pathname.match(/^\/(?:(ko)\/)?blog(?:\/(.*))?$/);
  if (!m) return null;
  const lang = m[1] || 'en';
  const rest = decodeURIComponent(m[2] || '').replace(/\.html$/, '');
  if (!rest || rest === 'index') {
    const res = await env.ASSETS.fetch(request);
    const posts = await publishedPosts(env, lang);
    if (res.status === 404 && posts.length) return htmlResponse(renderIndex(lang, posts));
    if (!res.ok || !(res.headers.get('Content-Type') || '').includes('text/html')) return res;
    return injectIndexCards(res, posts);
  }
  if (rest.includes('/') || !env.DB) return null;
  const post = await env.DB.prepare('SELECT * FROM posts WHERE slug = ? AND lang = ? AND published = 1').bind(rest.toLowerCase(), lang).first();
  return post ? htmlResponse(renderPost({ ...post, lang: BLOG_LANGS[lang] ? lang : 'en' })) : null;
}

// Traditional-Chinese regions (TW, HK, MO) stay on English until there's a
// Traditional Chinese version — Simplified would read as foreign there.
const SPANISH_COUNTRIES = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ'];
const COUNTRY_DEFAULT_LANG = {
  KR: 'ko',
  JP: 'ja',
  CN: 'zh',
  SG: 'zh',
  ...Object.fromEntries(SPANISH_COUNTRIES.map((c) => [c, 'es'])),
};
const ASSET_PATH = /\.(js|css|svg|png|jpg|jpeg|webp|ico|json|woff2?|txt|xml)$/;
// Search engines and link-preview fetchers are never sent elsewhere by
// country: a crawler must see the address it asked for (Naver's checker in
// Korea was being bounced from / to /ko/), and every language version is
// already linked through hreflang.
// (App names like NAVER or KAKAOTALK alone are in-app browsers of real people.)
const CRAWLER_UA = /bot|crawl|spider|slurp|yeti|daumoa|google|bing|yandex|baidu|facebookexternalhit|kakaotalk-scrap|whatsapp/i;

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

    // Admin page API (sign-in, blog posts, videos).
    if (url.pathname === '/api/admin' || url.pathname.startsWith('/api/admin/')) {
      await ensureSchema(env);
      return handleAdmin(request, env, url);
    }

    // Optional player accounts (sign-up, sign-in, saved online record).
    if (url.pathname === '/api/account' || url.pathname.startsWith('/api/account/')) {
      await ensureSchema(env);
      return handleAccount(request, env, url);
    }

    if (!ASSET_PATH.test(url.pathname) && isLocalizedPage(url.pathname.replace(/^\/(ko|es|ja|zh)(?=\/|$)/, ''))) {
      const cookie = request.headers.get('Cookie') || '';
      const hasChoice = /(?:^|;\s*)pg_lang=/.test(cookie);
      const isCrawler = CRAWLER_UA.test(request.headers.get('User-Agent') || '');
      if (!hasChoice && !isCrawler) {
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

    if ((request.method === 'GET' || request.method === 'HEAD') && env.DB) {
      // A database problem must never take a page down — on any error the
      // plain static page is served instead.
      try {
        await ensureSchema(env);
        const blog = await serveBlog(request, env, url);
        if (blog) return blog;

        if (url.pathname === '/sitemap.xml') {
          const res = await env.ASSETS.fetch(request);
          return res.ok ? injectSitemap(res, await publishedPosts(env)) : res;
        }

        // Game pages: add the "watch how to play" video when the admin has
        // linked one for that game.
        const game = gamePageFor(url.pathname);
        if (game) {
          const { results } = await env.DB.prepare('SELECT * FROM videos WHERE game = ?').bind(game.game).all();
          const video = pickVideo(results, game.lang);
          const res = await env.ASSETS.fetch(request);
          if (!video || !res.ok || !(res.headers.get('Content-Type') || '').includes('text/html')) return res;
          return injectVideo(res, video, game.lang);
        }
      } catch (err) {
        console.error('admin data unavailable, serving the static page', err);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
