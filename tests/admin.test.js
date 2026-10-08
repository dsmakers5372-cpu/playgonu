import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { markdownToHtml, youtubeId, safeUrl } from '../src/server/markdown.js';
import { createSessionToken, verifySessionToken, secretsEqual } from '../src/server/auth.js';
import { gamePageFor, pickVideo, renderPost } from '../src/server/site.js';
import { staticPostToMarkdown } from '../src/server/admin.js';

test('markdown: headings, paragraphs, lists, links, emphasis', () => {
  const html = markdownToHtml('## Title\n\nOne **bold** and *it* with `code`.\nSame paragraph.\n\n- a\n- b\n\n1. x\n2. y\n\n> quote\n\n[play](/ko/jul.html)');
  assert.match(html, /<h2>Title<\/h2>/);
  assert.match(html, /<p>One <strong>bold<\/strong> and <em>it<\/em> with <code>code<\/code>\. Same paragraph\.<\/p>/);
  assert.match(html, /<ul><li>a<\/li><li>b<\/li><\/ul>/);
  assert.match(html, /<ol><li>x<\/li><li>y<\/li><\/ol>/);
  assert.match(html, /<blockquote>quote<\/blockquote>/);
  assert.match(html, /<a href="\/ko\/jul\.html">play<\/a>/);
});

test('markdown: raw HTML and script URLs never get through', () => {
  const html = markdownToHtml('<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n![a](data:text/html,hi)\n\n<img src=x onerror=alert(1)>');
  assert.doesNotMatch(html, /<script|<img src=x|javascript:|data:text/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
});

test('markdown: images and YouTube lines', () => {
  const html = markdownToHtml('![Board](/images/a.webp)\n\n{{youtube https://youtu.be/dQw4w9WgXcQ}}');
  assert.match(html, /<figure><img src="\/images\/a\.webp" alt="Board" loading="lazy"><figcaption>Board<\/figcaption><\/figure>/);
  assert.match(html, /data-youtube="dQw4w9WgXcQ"/);
});

test('youtubeId understands the usual link shapes', () => {
  for (const url of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ']) {
    assert.equal(youtubeId(url), 'dQw4w9WgXcQ', url);
  }
  assert.equal(youtubeId('https://example.com/watch?v=nope'), null);
});

test('admin session token: valid, tampered, expired, other password', async () => {
  const token = await createSessionToken('pw-one');
  assert.equal(await verifySessionToken(token, 'pw-one'), true);
  assert.equal(await verifySessionToken(token, 'pw-two'), false);
  assert.equal(await verifySessionToken(token.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')), 'pw-one'), false);
  assert.equal(await verifySessionToken(token, 'pw-one', Date.now() + 13 * 3600 * 1000), false);
  assert.equal(await verifySessionToken('', 'pw-one'), false);
  assert.equal(await secretsEqual('abc', 'abc'), true);
  assert.equal(await secretsEqual('abc', 'abd'), false);
});

test('gamePageFor maps every game page in every language', () => {
  assert.deepEqual(gamePageFor('/'), { lang: 'en', game: 'cham' });
  assert.deepEqual(gamePageFor('/index.html'), { lang: 'en', game: 'cham' });
  assert.deepEqual(gamePageFor('/jul'), { lang: 'en', game: 'jul' });
  assert.deepEqual(gamePageFor('/ko/'), { lang: 'ko', game: 'cham' });
  assert.deepEqual(gamePageFor('/ko/bakwi.html'), { lang: 'ko', game: 'bakwi' });
  assert.deepEqual(gamePageFor('/ja/palpal'), { lang: 'ja', game: 'palpal' });
  assert.equal(gamePageFor('/blog/what-is-gonu'), null);
  assert.equal(gamePageFor('/gomoku'), null);
});

test('pickVideo: Korean pages get the Korean video, others English', () => {
  const rows = [{ kind: 'long', lang: 'ko', youtube_id: 'k' }, { kind: 'long', lang: 'en', youtube_id: 'e' }, { kind: 'shorts', lang: 'en', youtube_id: 's' }];
  assert.equal(pickVideo(rows, 'ko').youtube_id, 'k');
  assert.equal(pickVideo(rows, 'ja').youtube_id, 'e');
  assert.equal(pickVideo([rows[0]], 'en').youtube_id, 'k');
  assert.equal(pickVideo([rows[2]], 'en'), null);
});

test('rendered post escapes its fields and links home in its language', () => {
  const html = renderPost({ slug: 'a-b', lang: 'ko', tag: '<b>', title: 'T <x>', description: 'D', body: 'hello', created_at: '2026-10-08T00:00:00Z', updated_at: '2026-10-08T00:00:00Z' });
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /<title>T &lt;x&gt; — 플레이고누<\/title>/);
  assert.match(html, /href="\/ko\/blog\/"/);
  assert.doesNotMatch(html, /<x>|<b><\/div>/);
});

test('a static blog post imports as editable Markdown', () => {
  const draft = staticPostToMarkdown(fs.readFileSync(new URL('../blog/what-is-gonu.html', import.meta.url), 'utf8'));
  assert.match(draft.title, /What Is Gonu/);
  assert.ok(draft.description.length > 20);
  assert.match(draft.body, /^## Where it comes from$/m);
  assert.match(draft.body, /\[→ Play Cham-gonu \(the deep one\)\]\(\.\.\/index\.html\)/);
  assert.doesNotMatch(draft.body, /<[a-z]/i);
});
