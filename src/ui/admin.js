// The admin page (/admin/): sign in, write and edit blog posts with a live
// preview, and link the YouTube videos shown on the game pages. All data
// goes through /api/admin/* (see src/server/admin.js).
import { markdownToHtml, youtubeId } from '/src/server/markdown.js';

const $ = (sel, root = document) => root.querySelector(sel);
const GAME_NAMES = { cham: '참고누', jul: '줄고누', daseotjul: '다섯줄고누', palpal: '팔팔고누', bakwi: '바퀴고누', gomoku: '오목' };
const LANG_NAMES = { ko: '한국어', en: '영어' };
const KIND_NAMES = { long: '롱폼(가로)', shorts: '숏츠(세로)' };

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/admin${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/login') showLogin();
  if (!res.ok) throw new Error(data.error || `오류 (${res.status})`);
  return data;
}

function say(el, text, ok = false) {
  el.textContent = text;
  el.className = `msg ${ok ? 'ok' : 'err'}`;
}

// ---- sign-in -----------------------------------------------------------------------
function showLogin() {
  $('[data-login]').hidden = false;
  $('[data-app]').hidden = true;
  $('[data-logout]').hidden = true;
  $('[data-login-form] input').focus();
}

async function showApp() {
  $('[data-login]').hidden = true;
  $('[data-app]').hidden = false;
  $('[data-logout]').hidden = false;
  showView('posts');
  await loadPosts();
}

$('[data-login-form]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = e.target.password;
  try {
    await api('/login', { method: 'POST', body: { password: input.value } });
    input.value = '';
    $('[data-login-msg]').textContent = '';
    await showApp();
  } catch (err) {
    say($('[data-login-msg]'), err.message);
  }
});

$('[data-logout]').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' }).catch(() => {});
  showLogin();
});

// ---- views -------------------------------------------------------------------------
function showView(name) {
  for (const v of document.querySelectorAll('[data-view]')) v.hidden = v.dataset.view !== name;
  const tab = name === 'editor' ? 'posts' : name;
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
}

for (const b of document.querySelectorAll('[data-tab]')) {
  b.addEventListener('click', async () => {
    showView(b.dataset.tab);
    if (b.dataset.tab === 'posts') await loadPosts();
    else await loadVideos();
  });
}

// ---- posts -------------------------------------------------------------------------
const postUrl = (p) => `${p.lang === 'ko' ? '/ko' : ''}/blog/${encodeURIComponent(p.slug)}`;

async function loadPosts() {
  const { posts } = await api('/posts');
  const rows = $('[data-post-rows]');
  rows.replaceChildren();
  if (!posts.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" style="color:var(--muted);">아직 관리자에서 쓴 글이 없어요. "새 글 쓰기"나 "불러오기"로 시작하세요.</td>';
    rows.append(tr);
  }
  for (const p of posts) {
    const tr = document.createElement('tr');
    const cells = [LANG_NAMES[p.lang] || p.lang, p.title, postUrl(p), null, (p.updated_at || '').slice(0, 16).replace('T', ' '), null];
    cells.forEach((text, i) => {
      const td = document.createElement('td');
      if (i === 3) {
        const pill = document.createElement('span');
        pill.className = p.published ? 'pill-on' : 'pill-off';
        pill.textContent = p.published ? '공개' : '비공개';
        td.append(pill);
      } else if (i === 5) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = '수정';
        btn.addEventListener('click', () => openEditor(p.id));
        td.append(btn);
      } else {
        td.textContent = text;
      }
      tr.append(td);
    });
    rows.append(tr);
  }
}

let editingId = null;
const form = () => $('[data-view="editor"]');
const field = (name) => form().querySelector(`[name="${name}"]`);

function fillEditor(post) {
  for (const name of ['lang', 'slug', 'tag', 'title', 'description', 'body']) field(name).value = post[name] || '';
  field('published').checked = !!post.published;
  renderPreview();
  const link = $('[data-view-link]');
  link.hidden = !(editingId && post.published);
  if (editingId) link.href = postUrl(post);
  $('[data-delete]').hidden = !editingId;
  $('[data-editor-msg]').textContent = '';
  showView('editor');
}

async function openEditor(id) {
  editingId = id;
  const { post } = await api(`/posts/${id}`);
  fillEditor(post);
}

function renderPreview() {
  $('[data-preview]').innerHTML = markdownToHtml(field('body').value);
}
field('body').addEventListener('input', renderPreview);

$('[data-new-post]').addEventListener('click', () => {
  editingId = null;
  fillEditor({ lang: 'ko', published: 0 });
});

$('[data-import]').addEventListener('click', async () => {
  const msg = $('[data-posts-msg]');
  try {
    const { draft } = await api('/import', { method: 'POST', body: { path: $('[data-import-path]').value } });
    editingId = null;
    fillEditor({ ...draft, published: 0 });
    say($('[data-editor-msg]'), '불러왔어요. 고친 뒤 "공개"로 저장하면 같은 주소에서 이 글이 대신 보여요.', true);
  } catch (err) {
    say(msg, err.message);
  }
});

$('[data-cancel]').addEventListener('click', async () => {
  showView('posts');
  await loadPosts();
});

$('[data-save]').addEventListener('click', async () => {
  const msg = $('[data-editor-msg]');
  const body = {};
  for (const name of ['lang', 'slug', 'tag', 'title', 'description', 'body']) body[name] = field(name).value;
  body.published = field('published').checked;
  try {
    if (editingId) await api(`/posts/${editingId}`, { method: 'PUT', body });
    else editingId = (await api('/posts', { method: 'POST', body })).id;
    const link = $('[data-view-link]');
    link.hidden = !body.published;
    link.href = postUrl(body);
    $('[data-delete]').hidden = false;
    say(msg, body.published ? '저장했어요. 사이트에 공개됐어요.' : '저장했어요 (비공개).', true);
  } catch (err) {
    say(msg, err.message);
  }
});

$('[data-delete]').addEventListener('click', async () => {
  if (!editingId || !confirm('이 글을 지울까요? 되돌릴 수 없어요.')) return;
  await api(`/posts/${editingId}`, { method: 'DELETE' });
  editingId = null;
  showView('posts');
  await loadPosts();
});

// ---- videos ------------------------------------------------------------------------
async function loadVideos() {
  const { videos, games, langs, kinds } = await api('/videos');
  const byKey = new Map(videos.map((v) => [`${v.game}|${v.lang}|${v.kind}`, v]));
  const rows = $('[data-video-rows]');
  rows.replaceChildren();
  for (const game of games) {
    for (const lang of langs) {
      for (const kind of kinds) {
        const v = byKey.get(`${game}|${lang}|${kind}`);
        const tr = document.createElement('tr');
        const thumb = document.createElement('img');
        thumb.className = 'vid-thumb';
        thumb.alt = '';
        if (v) thumb.src = `https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`;
        const url = Object.assign(document.createElement('input'), { type: 'text', placeholder: 'https://youtu.be/…', value: v ? `https://youtu.be/${v.youtube_id}` : '' });
        const title = Object.assign(document.createElement('input'), { type: 'text', placeholder: '영상 제목', value: v ? v.title : '' });
        const date = Object.assign(document.createElement('input'), { type: 'date', value: v ? v.upload_date : '' });
        url.addEventListener('input', () => {
          const id = youtubeId(url.value);
          thumb.src = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '';
        });
        const save = Object.assign(document.createElement('button'), { className: 'btn-primary', textContent: '저장' });
        save.addEventListener('click', async () => {
          try {
            await api('/videos', { method: 'PUT', body: { game, lang, kind, url: url.value, title: title.value, uploadDate: date.value } });
            say($('[data-videos-msg]'), `${GAME_NAMES[game]} ${LANG_NAMES[lang]} ${KIND_NAMES[kind]} 저장했어요.`, true);
            await loadVideos();
          } catch (err) {
            say($('[data-videos-msg]'), err.message);
          }
        });
        const del = Object.assign(document.createElement('button'), { className: 'btn', textContent: '빼기', hidden: !v });
        del.addEventListener('click', async () => {
          if (!confirm('이 영상 연결을 뺄까요?')) return;
          await api('/videos', { method: 'DELETE', body: { game, lang, kind } });
          await loadVideos();
        });
        const cells = [thumb, GAME_NAMES[game] || game, LANG_NAMES[lang], KIND_NAMES[kind], url, title, date, [save, del]];
        for (const c of cells) {
          const td = document.createElement('td');
          if (Array.isArray(c)) { td.className = 'row'; td.append(...c); } else if (typeof c === 'string') td.textContent = c; else td.append(c);
          tr.append(td);
        }
        rows.append(tr);
      }
    }
  }
}

// ---- start -------------------------------------------------------------------------
api('/me').then(showApp).catch((err) => {
  showLogin();
  if (!/unauthorized/.test(err.message)) say($('[data-login-msg]'), err.message);
});
