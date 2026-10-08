// /api/admin/* — the admin page's API. Every route except sign-in needs the
// signed admin cookie; every write must come from this site's own pages
// (Origin check, on top of the SameSite=Strict cookie).
import { isAdmin, secretsEqual, createSessionToken, sessionCookie, clearedCookie, tooManyAttempts, recordFailedAttempt, clearAttempts } from './auth.js';
import { youtubeId } from './markdown.js';
import { BLOG_LANGS } from './site.js';

const GAMES = ['cham', 'jul', 'daseotjul', 'palpal', 'bakwi', 'gomoku'];
const VIDEO_LANGS = ['ko', 'en'];
const KINDS = ['long', 'shorts'];

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const now = () => new Date().toISOString();
const SLUG = /^[\p{L}\p{N}][\p{L}\p{N}-]{0,79}$/u;

function cleanPost(input) {
  const post = {
    slug: String(input.slug || '').trim().toLowerCase(),
    lang: String(input.lang || ''),
    tag: String(input.tag || '').trim().slice(0, 40),
    title: String(input.title || '').trim().slice(0, 200),
    description: String(input.description || '').trim().slice(0, 400),
    body: String(input.body || '').slice(0, 200000),
    published: input.published ? 1 : 0,
  };
  if (!SLUG.test(post.slug)) return { error: '주소(slug)는 글자·숫자·하이픈만, 80자 이내로 적어주세요.' };
  if (!BLOG_LANGS[post.lang]) return { error: '언어는 ko 또는 en 이어야 해요.' };
  if (!post.title) return { error: '제목을 적어주세요.' };
  return { post };
}

// ---- static post → Markdown (for "import an existing post") ----------------------
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&middot;/g, '·').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&rarr;/g, '→').replace(/&larr;/g, '←').replace(/&hellip;/g, '…');
const inlineMd = (html) => decode(html
  .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => `[${text.replace(/<[^>]+>/g, '').trim()}](${href})`)
  .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
  .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*')
  .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ''))
  .replace(/\s+/g, ' ').trim();

export function staticPostToMarkdown(html) {
  const meta = (name) => (html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) || [])[1] || '';
  const article = (html.match(/<article[^>]*>([\s\S]*?)<\/article>/) || [])[1] || '';
  const title = inlineMd((article.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
  const tag = inlineMd((article.match(/<div class="tag"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '');
  // Drop the title block (tag, h1, byline) — the post template draws those.
  const rest = article.replace(/^[\s\S]*?<h1[\s\S]*?<\/h1>[\s\S]*?<\/div>/, '');
  const blocks = [];
  const re = /<(h2|h3|p|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>|<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(rest))) {
    if (m[3]) { blocks.push(`[${inlineMd(m[4])}](${m[3]})`); continue; }
    const [, tagName, inner] = m;
    const t = tagName.toLowerCase();
    if (t === 'h2') blocks.push(`## ${inlineMd(inner)}`);
    else if (t === 'h3') blocks.push(`### ${inlineMd(inner)}`);
    else if (t === 'blockquote') blocks.push(`> ${inlineMd(inner)}`);
    else if (t === 'ul' || t === 'ol') {
      const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((li, i) => `${t === 'ol' ? `${i + 1}.` : '-'} ${inlineMd(li[1])}`);
      blocks.push(items.join('\n'));
    } else {
      const text = inlineMd(inner);
      if (text) blocks.push(text);
    }
  }
  return { title: title || decode(meta('description')), description: decode(meta('description')), tag, body: blocks.join('\n\n') };
}

export async function handleAdmin(request, env, url) {
  const path = url.pathname.slice('/api/admin'.length) || '/';
  const method = request.method;
  const secure = url.protocol === 'https:';
  if (!env.DB) return json({ error: 'DB가 연결되지 않았어요 (wrangler.jsonc의 d1_databases).' }, 503);
  if (!env.ADMIN_PASSWORD) return json({ error: '관리자 비밀번호가 설정되지 않았어요 (wrangler secret put ADMIN_PASSWORD).' }, 503);
  if (method !== 'GET') {
    const origin = request.headers.get('Origin');
    if (origin !== url.origin) return json({ error: 'forbidden' }, 403);
  }

  if (path === '/login' && method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    if (await tooManyAttempts(env, ip)) return json({ error: '시도가 너무 많아요. 15분 뒤에 다시 해주세요.' }, 429);
    const { username, password } = await request.json().catch(() => ({}));
    // Both are always compared, so a wrong ID and a wrong password look alike.
    const [userOk, passOk] = await Promise.all([
      secretsEqual(String(username || '').trim(), env.ADMIN_USER || 'playgonu'),
      secretsEqual(String(password || ''), env.ADMIN_PASSWORD),
    ]);
    if (!userOk || !passOk) {
      await recordFailedAttempt(env, ip);
      return json({ error: '아이디 또는 비밀번호가 맞지 않아요.' }, 401);
    }
    await clearAttempts(env, ip);
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(await createSessionToken(env.ADMIN_PASSWORD), secure) });
  }
  if (path === '/logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': clearedCookie(secure) });

  if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
  if (path === '/me') return json({ ok: true });

  // ---- posts ----
  if (path === '/posts' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id, slug, lang, tag, title, description, published, created_at, updated_at FROM posts ORDER BY created_at DESC').all();
    return json({ posts: results });
  }
  if (path === '/posts' && method === 'POST') {
    const { post, error } = cleanPost(await request.json().catch(() => ({})));
    if (error) return json({ error }, 400);
    const t = now();
    try {
      const row = await env.DB.prepare('INSERT INTO posts (slug, lang, tag, title, description, body, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id')
        .bind(post.slug, post.lang, post.tag, post.title, post.description, post.body, post.published, t, t).first();
      return json({ id: row.id });
    } catch (e) {
      if (/UNIQUE/.test(String(e))) return json({ error: '같은 언어에 같은 주소(slug)의 글이 이미 있어요.' }, 409);
      throw e;
    }
  }
  let m = path.match(/^\/posts\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    if (method === 'GET') {
      const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
      return post ? json({ post }) : json({ error: 'not found' }, 404);
    }
    if (method === 'PUT') {
      const { post, error } = cleanPost(await request.json().catch(() => ({})));
      if (error) return json({ error }, 400);
      try {
        const res = await env.DB.prepare('UPDATE posts SET slug = ?, lang = ?, tag = ?, title = ?, description = ?, body = ?, published = ?, updated_at = ? WHERE id = ?')
          .bind(post.slug, post.lang, post.tag, post.title, post.description, post.body, post.published, now(), id).run();
        return res.meta.changes ? json({ ok: true }) : json({ error: 'not found' }, 404);
      } catch (e) {
        if (/UNIQUE/.test(String(e))) return json({ error: '같은 언어에 같은 주소(slug)의 글이 이미 있어요.' }, 409);
        throw e;
      }
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }
  if (path === '/import' && method === 'POST') {
    const { path: postPath } = await request.json().catch(() => ({}));
    const p = String(postPath || '').trim();
    const mm = p.match(/^\/(?:(ko)\/)?blog\/([^/?#]+?)(?:\.html)?$/);
    if (!mm) return json({ error: '/blog/글주소.html 또는 /ko/blog/글주소.html 형식으로 적어주세요.' }, 400);
    const res = await env.ASSETS.fetch(new Request(new URL(`/${mm[1] ? 'ko/' : ''}blog/${mm[2]}.html`, url.origin)));
    if (!res.ok) return json({ error: '그 주소의 글을 찾지 못했어요.' }, 404);
    const draft = staticPostToMarkdown(await res.text());
    return json({ draft: { ...draft, slug: decodeURIComponent(mm[2]).toLowerCase(), lang: mm[1] || 'en' } });
  }

  // ---- videos ----
  if (path === '/videos' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM videos ORDER BY game, lang, kind').all();
    return json({ videos: results, games: GAMES, langs: VIDEO_LANGS, kinds: KINDS });
  }
  if (path === '/videos' && method === 'PUT') {
    const v = await request.json().catch(() => ({}));
    if (!GAMES.includes(v.game) || !VIDEO_LANGS.includes(v.lang) || !KINDS.includes(v.kind)) return json({ error: '게임·언어·종류를 확인해주세요.' }, 400);
    const id = youtubeId(v.url);
    if (!id) return json({ error: '유튜브 주소(또는 11자리 영상 ID)를 알아볼 수 없어요.' }, 400);
    const uploadDate = /^\d{4}-\d{2}-\d{2}$/.test(v.uploadDate || '') ? v.uploadDate : new Date().toISOString().slice(0, 10);
    await env.DB.prepare(
      `INSERT INTO videos (game, lang, kind, youtube_id, title, description, upload_date, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(game, lang, kind) DO UPDATE SET youtube_id = excluded.youtube_id, title = excluded.title, description = excluded.description, upload_date = excluded.upload_date, updated_at = excluded.updated_at`,
    ).bind(v.game, v.lang, v.kind, id, String(v.title || '').slice(0, 200), String(v.description || '').slice(0, 1000), uploadDate, now()).run();
    return json({ ok: true, youtube_id: id });
  }
  if (path === '/videos' && method === 'DELETE') {
    const v = await request.json().catch(() => ({}));
    await env.DB.prepare('DELETE FROM videos WHERE game = ? AND lang = ? AND kind = ?').bind(v.game, v.lang, v.kind).run();
    return json({ ok: true });
  }

  return json({ error: 'not found' }, 404);
}
