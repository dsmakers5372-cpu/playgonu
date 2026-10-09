// Public pages built from the admin's data (D1): blog posts written in the
// admin, the admin posts' cards on the blog index, the "watch how to play"
// video card on each game page, and the posts' sitemap entries.
import { markdownToHtml, escapeHtml, videoFacade } from './markdown.js';

const SITE = 'https://playgonu.com';

export const BLOG_LANGS = {
  en: {
    prefix: '', htmlLang: 'en', siteName: 'PlayGonu', blog: 'Blog', back: '← All posts', guide: 'A PlayGonu guide', privacy: 'Privacy Policy',
    nav: [['index.html', 'Cham-gonu'], ['gomoku.html', 'Omok'], ['online.html', 'Online'], ['howto.html', 'How to Play']],
    indexTitle: 'Blog — PlayGonu', indexHeading: 'Guides to Gonu, Gomoku, and the games behind them', indexIntro: '',
  },
  ko: {
    prefix: '/ko', htmlLang: 'ko', siteName: '플레이고누', blog: '블로그', back: '← 블로그 목록', guide: '플레이고누 가이드', privacy: '개인정보처리방침',
    nav: [['index.html', '참고누'], ['gomoku.html', '오목'], ['howto.html', '하는 법'], ['online.html', '온라인 대전']],
    indexTitle: '블로그 — 플레이고누', indexHeading: '고누와 오목 이야기', indexIntro: '고누가 어떤 놀이인지, 어떻게 두는지, 어떻게 가르치는지 정리했어요.',
  },
};

export const VIDEO_CSS = `
.pg-video { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: #2A2420; }
.pg-video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.pg-video__play { all: unset; cursor: pointer; position: absolute; inset: 0; display: block; }
.pg-video__play img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pg-video__icon { position: absolute; left: 50%; top: 50%; width: 68px; height: 48px; margin: -24px 0 0 -34px; border-radius: 14px; background: rgba(172,59,42,.92); box-shadow: 0 4px 14px rgba(0,0,0,.3); }
.pg-video__icon::after { content: ''; position: absolute; left: 27px; top: 14px; border-style: solid; border-width: 10px 0 10px 17px; border-color: transparent transparent transparent #fff; }
.pg-video__play:focus-visible { outline: 3px solid #E9B949; outline-offset: -3px; }
`;

const MD_CSS = `
.md-body { display: flex; flex-direction: column; gap: 18px; font-size: 15.5px; line-height: 1.75; color: var(--ink-soft); }
.md-body p, .md-body ul, .md-body ol, .md-body blockquote, .md-body figure { margin: 0; }
.md-body h2 { font-family: "Noto Serif KR", Georgia, serif; font-size: 22px; margin: 10px 0 0; color: var(--ink); }
.md-body h3 { font-size: 18px; margin: 6px 0 0; color: var(--ink); }
.md-body ul, .md-body ol { padding-left: 22px; display: flex; flex-direction: column; gap: 6px; }
.md-body blockquote { border-left: 4px solid var(--red); padding: 4px 0 4px 16px; color: var(--ink); }
.md-body figure img { width: 100%; border-radius: 12px; display: block; }
.md-body figcaption { font-size: 13px; color: var(--muted); margin-top: 6px; }
.md-body pre { background: #2A2420; color: #F6F1E6; padding: 14px 16px; border-radius: 10px; overflow-x: auto; font-size: 13.5px; }
.md-body code { font-size: .92em; }
`;

function header(L, lang) {
  const base = L.prefix || '';
  const links = L.nav.map(([href, label], i) => `<a href="${base}/${href}" class="variant-tab">${escapeHtml(label)}</a>${i === 0 ? '\n        <span data-variant-menu></span>' : ''}`).join('\n        ');
  return `<header class="site-header">
    <div class="site-header__inner">
      <a href="${base}/index.html" style="display:flex;align-items:baseline;gap:8px;">
        <span class="serif" style="font-size:21px;font-weight:700;color:var(--ink);">PlayGonu</span>
      </a>
      <nav style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${links}
        <a href="${base}/blog/" class="variant-tab is-active">${escapeHtml(L.blog)}</a>
      </nav>
    </div>
  </header>`;
}

function page({ lang, title, description, canonical, head = '', body }) {
  const L = BLOG_LANGS[lang];
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="PlayGonu">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${SITE}/${lang === 'ko' ? 'og-image-ko.png' : 'og-image.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${SITE}/${lang === 'ko' ? 'og-image-ko.png' : 'og-image.png'}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles/main.css">
<style>${MD_CSS}${VIDEO_CSS}</style>
${head}
</head>
<body>
<div data-root>
  ${header(L, lang)}
${body}
  <footer style="max-width:1280px;margin:40px auto 0;padding:20px 40px;text-align:center;font-size:12px;color:var(--muted);">
    &copy; 2026 PlayGonu &middot; <a href="/privacy.html" style="color:var(--muted);text-decoration:underline;">${escapeHtml(L.privacy)}</a>
  </footer>
</div>
<script type="module">
  import { mountVariantMenu } from '/src/ui/variantMenu.js';
  import { mountVideoFacades } from '/src/ui/videoFacade.js';
  mountVariantMenu(document.querySelector('[data-variant-menu]'), { lang: '${lang}', currentPage: 'blog' });
  mountVideoFacades(document);
</script>
</body>
</html>`;
}

export const postUrl = (lang, slug) => `${BLOG_LANGS[lang].prefix}/blog/${encodeURIComponent(slug)}`;

export function renderPost(post) {
  const L = BLOG_LANGS[post.lang];
  const canonical = `${SITE}${postUrl(post.lang, post.slug)}`;
  const date = (post.created_at || '').slice(0, 10);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    inLanguage: L.htmlLang,
    mainEntityOfPage: canonical,
    publisher: { '@type': 'Organization', name: 'PlayGonu', url: SITE },
  };
  return page({
    lang: post.lang,
    title: `${post.title} — ${L.siteName}`,
    description: post.description,
    canonical,
    head: `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
    body: `  <article style="max-width:720px;margin:0 auto;padding:56px 40px;display:flex;flex-direction:column;gap:28px;">
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${post.tag ? `<div class="tag" style="color:var(--red);">${escapeHtml(post.tag)}</div>` : ''}
      <h1 class="serif" style="margin:0;font-size:34px;line-height:1.25;">${escapeHtml(post.title)}</h1>
      <p style="margin:0;font-size:13px;color:var(--muted);">${escapeHtml(L.guide)}${date ? ` · ${date}` : ''}</p>
    </div>
    <div class="md-body">
${markdownToHtml(post.body)}
    </div>
    <a href="${L.prefix}/blog/" style="font-size:15px;font-weight:600;">${escapeHtml(L.back)}</a>
  </article>`,
  });
}

export function postCard(post) {
  return `<a href="${postUrl(post.lang, post.slug)}" class="card" style="padding:24px 28px;display:flex;flex-direction:column;gap:8px;">
        ${post.tag ? `<div class="tag">${escapeHtml(post.tag)}</div>` : ''}
        <div class="serif" style="font-size:20px;font-weight:700;color:var(--ink);">${escapeHtml(post.title)}</div>
        <p style="margin:0;font-size:14px;line-height:1.6;color:var(--ink-soft);">${escapeHtml(post.description)}</p>
      </a>`;
}

// A blog index for a language that has no static index page yet.
export function renderIndex(lang, posts) {
  const L = BLOG_LANGS[lang];
  return page({
    lang,
    title: L.indexTitle,
    description: L.indexIntro || L.indexHeading,
    canonical: `${SITE}${L.prefix}/blog/`,
    body: `  <div style="max-width:800px;margin:0 auto;padding:56px 40px;display:flex;flex-direction:column;gap:40px;">
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div class="tag" style="color:var(--red);">${escapeHtml(L.blog)}</div>
      <h1 class="serif" style="margin:0;font-size:32px;line-height:1.25;">${escapeHtml(L.indexHeading)}</h1>
      ${L.indexIntro ? `<p style="margin:0;font-size:15.5px;line-height:1.65;color:var(--ink-soft);">${escapeHtml(L.indexIntro)}</p>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;gap:16px;">
      ${posts.map(postCard).join('\n      ')}
    </div>
  </div>`,
  });
}

// Updates a static blog index with the admin's published posts: a post
// imported from a static one (same slug) replaces that card in place, and
// brand-new posts go on top of the list. The index is a small file, so it is
// simply read whole.
export async function injectIndexCards(response, posts) {
  if (!posts.length) return response;
  let html = await response.text();
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const seen = new Set();
  html = html.replace(/<a href="([^"]+)" class="card"[\s\S]*?<\/a>/g, (card, href) => {
    const slug = decodeURIComponent(href.replace(/^\.\//, '').replace(/\.html$/, '')).toLowerCase();
    const own = bySlug.get(slug);
    if (!own) return card;
    seen.add(slug);
    return postCard(own);
  });
  const fresh = posts.filter((p) => !seen.has(p.slug));
  if (fresh.length) {
    const at = html.search(/<a href="[^"]+" class="card"/);
    const cards = fresh.map(postCard).join('\n      ') + '\n      ';
    if (at >= 0) html = html.slice(0, at) + cards + html.slice(at);
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, headers });
}

// ---- videos on the game pages ------------------------------------------------
export const GAME_PAGES = { 'index.html': 'cham', 'jul.html': 'jul', 'daseotjul.html': 'daseotjul', 'palpal.html': 'palpal', 'bakwi.html': 'bakwi' };
const PAGE_LANGS = ['ko', 'es', 'ja', 'zh'];
const VIDEO_HEADING = { en: 'Watch: how to play', ko: '영상으로 배우기', es: 'Mira cómo se juega', ja: '動画で遊び方を見る', zh: '看视频学玩法' };

// "/ko/jul" → { lang: 'ko', game: 'jul' }; null for anything else.
export function gamePageFor(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  let lang = 'en';
  if (parts.length && PAGE_LANGS.includes(parts[0])) lang = parts.shift();
  if (parts.length > 1) return null;
  const file = parts.length ? (parts[0].endsWith('.html') ? parts[0] : `${parts[0]}.html`) : 'index.html';
  const game = GAME_PAGES[file];
  return game ? { lang, game } : null;
}

export function pickVideo(rows, lang) {
  const long = rows.filter((r) => r.kind === 'long');
  return long.find((r) => r.lang === (lang === 'ko' ? 'ko' : 'en')) || long.find((r) => r.lang === 'en') || long[0] || null;
}

export function injectVideo(response, video, lang) {
  const heading = VIDEO_HEADING[lang] || VIDEO_HEADING.en;
  const watch = `https://www.youtube.com/watch?v=${video.youtube_id}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title || heading,
    description: video.description || video.title || heading,
    thumbnailUrl: [`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`],
    uploadDate: video.upload_date || (video.updated_at || '').slice(0, 10),
    embedUrl: `https://www.youtube.com/embed/${video.youtube_id}`,
    url: watch,
  };
  const card = `<div class="card" style="padding:20px 24px;display:flex;flex-direction:column;gap:12px;" data-howto-video>
        <div class="serif" style="font-size:18px;font-weight:700;color:var(--ink);">${escapeHtml(heading)}</div>
        ${videoFacade(video.youtube_id, video.title || heading)}
      </div>`;
  return new HTMLRewriter()
    .on('head', { element(el) { el.append(`<style>${VIDEO_CSS}</style><script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`, { html: true }); } })
    .on('.rules-panel', { element(el) { el.append(card, { html: true }); } })
    .on('body', { element(el) { el.append(`<script type="module">import { mountVideoFacades } from '/src/ui/videoFacade.js'; mountVideoFacades(document);</script>`, { html: true }); } })
    .transform(response);
}

// ---- sitemap ---------------------------------------------------------------------
export async function injectSitemap(response, posts) {
  if (!posts.length) return response;
  const xml = await response.text();
  const entries = posts.map((p) => `  <url>\n    <loc>${SITE}${postUrl(p.lang, p.slug)}</loc>\n    <lastmod>${(p.updated_at || '').slice(0, 10)}</lastmod>\n  </url>\n`).join('');
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(xml.replace('</urlset>', `${entries}</urlset>`), { status: response.status, headers });
}
