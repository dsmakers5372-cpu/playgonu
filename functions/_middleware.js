// Cloudflare Pages Function: redirects a first-time visitor to their
// country's default language, using Cloudflare's own edge geolocation
// (request.cf.country) — no external IP-lookup service, no cost.
// A visitor who has ever used the language switcher gets a `pg_lang`
// cookie (set client-side in src/ui/languageSwitcher.js) and is never
// auto-redirected again, so their choice always wins over geolocation.

const COUNTRY_DEFAULT_LANG = { KR: 'ko' };
const ASSET_PATH = /\.(js|css|svg|png|jpg|jpeg|webp|ico|json|woff2?|txt|xml)$/;

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (ASSET_PATH.test(url.pathname) || url.pathname.startsWith('/functions/')) {
    return next();
  }

  const cookie = request.headers.get('Cookie') || '';
  if (/(?:^|;\s*)pg_lang=/.test(cookie)) {
    return next();
  }

  const country = request.cf && request.cf.country;
  const lang = country && COUNTRY_DEFAULT_LANG[country];
  if (!lang || lang === 'en') {
    return next();
  }

  const alreadyLocalized = url.pathname === `/${lang}` || url.pathname.startsWith(`/${lang}/`);
  if (alreadyLocalized) {
    return next();
  }

  const target = new URL(url);
  target.pathname = `/${lang}${url.pathname}`;
  return Response.redirect(target.toString(), 302);
}
