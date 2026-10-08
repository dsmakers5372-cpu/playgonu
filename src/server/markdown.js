// A small, safe Markdown → HTML converter for blog posts written in the
// admin page. Everything is HTML-escaped first; only the constructs below
// produce markup, and links/images accept only http(s), site-relative and
// mailto URLs — so a post can never inject a script, even by mistake.
//
// Blocks:  ## / ### headings · paragraphs (blank-line separated) · "- " or
//          "* " lists · "1. " lists · "> " quotes · ``` code fences ·
//          a line that is only ![alt](url) → figure · {{youtube ID}} → video
// Inline:  **bold** · *italic* · `code` · [text](url)

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function safeUrl(url) {
  const u = url.trim();
  if (/^(https?:\/\/|\/(?!\/)|\.{0,2}\/|#|mailto:)/i.test(u) || /^[\w\-./%#?=&]+$/.test(u)) {
    if (/^\s*(javascript|data|vbscript):/i.test(u)) return null;
    return u;
  }
  return null;
}

export function youtubeId(input) {
  const s = String(input || '').trim();
  const m = s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/) || s.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}

function inline(text) {
  // Code spans first, so nothing inside them is formatted.
  const codes = [];
  let s = escapeHtml(text).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${c}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, url) => {
    const safe = safeUrl(url.replace(/&amp;/g, '&'));
    if (!safe) return label;
    const external = /^https?:\/\//i.test(safe);
    return `<a href="${escapeHtml(safe)}"${external ? ' rel="noopener" target="_blank"' : ''}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

export function videoFacade(id, title = '') {
  const t = escapeHtml(title);
  return `<div class="pg-video" data-youtube="${id}" data-title="${t}"><button type="button" class="pg-video__play" aria-label="Play video${t ? `: ${t}` : ''}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${t}" loading="lazy" width="480" height="360"><span class="pg-video__icon" aria-hidden="true"></span></button></div>`;
}

export function markdownToHtml(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let para = [];
  let list = null; // { tag, items }
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flushPara(); flushList();
      const code = [];
      for (i++; i < lines.length && !/^```/.test(lines[i]); i++) code.push(lines[i]);
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (!line.trim()) { flushPara(); flushList(); continue; }
    let m;
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      flushPara(); flushList();
      out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
    } else if ((m = line.match(/^\{\{\s*youtube\s+(\S+)\s*\}\}$/i))) {
      flushPara(); flushList();
      const id = youtubeId(m[1]);
      if (id) out.push(videoFacade(id));
    } else if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
      flushPara(); flushList();
      const url = safeUrl(m[2]);
      if (url) out.push(`<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(m[1])}" loading="lazy">${m[1] ? `<figcaption>${inline(m[1])}</figcaption>` : ''}</figure>`);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara(); flushList();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else if ((m = line.match(/^[-*]\s+(.*)$/)) || (m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara();
      const tag = /^\d/.test(line) ? 'ol' : 'ul';
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [] };
      list.items.push(m[1]);
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara(); flushList();
  return out.join('\n');
}

export { escapeHtml };
