// Numbers every video in upload order (업로드일정.md) and gathers what each
// upload needs into out/업로드/:
//   NN_<video>.mp4          the video (hard link, or a copy)
//   NN_<video>_문구.txt     title / description / tags for that one upload
//   NN_<video>_썸네일.png   long-form thumbnail (from out/thumbs/)
//   NN_<video>.srt          subtitles
// plus 00_목록.md, the numbered list.
//   node upload-pack.mjs
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(import.meta.dirname, 'out');
const DEST = path.join(OUT, '업로드');

const rows = fs.readFileSync(path.join(OUT, '업로드일정.md'), 'utf8').split('\n')
  .filter((l) => /^\| \d+\/\d+/.test(l))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
  .map(([date, time, kind, file, title, playlist, textFile]) => ({ date, time, kind, file, title, playlist, textFile }));

// Site links as the final addresses (no .html, which only redirects).
const cleanUrls = (s) => s.replace(/https:\/\/playgonu\.com\/([\w\/-]*?)(index)?\.html/g, 'https://playgonu.com/$1');

// The running-mill files use a TITLE / DESCRIPTION / TAGS layout per video.
function sectionTexts(raw) {
  const field = (sec, name) => (sec.match(new RegExp(`\\n${name}\\n([\\s\\S]*?)(?=\\n[A-Z ]+\\n|$)`)) || [])[1]?.trim() || '';
  const [, long, short] = raw.split(/^=== .* ===$/m);
  const noAi = (b) => b.split('\n').filter((l) => !/AI 음성|AI-generated voice|AI voice/.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const ko = /[가-힣]/.test(field(long, 'TITLE'));
  const tags = field(long, 'TAGS');
  const hashtags = tags.split(',').slice(0, 4).map((x) => '#' + x.trim().replace(/\s+/g, '')).join(' ') + ' #shorts';
  const shortBody = noAi(field(short, 'DESCRIPTION')).split('\n').filter((l) => !/https?:\/\//.test(l)).join('\n').trim();
  return {
    long: { title: field(long, 'TITLE'), body: noAi(field(long, 'DESCRIPTION')), tags },
    short: { title: field(short, 'TITLE'), body: shortBody + (ko ? ' playgonu.com 에서 직접 해보세요.' : ' Play it at playgonu.com.') + '\n\n' + hashtags, tags: field(short, 'TAGS') || tags },
    ko,
  };
}

function texts(textFile) {
  const raw = cleanUrls(fs.readFileSync(path.join(OUT, textFile), 'utf8')).replace(/\r\n/g, '\n');
  if (raw.startsWith('===')) return sectionTexts(raw);
  const [long, short] = raw.split(/\n----\n/);
  const longLines = long.trim().split('\n');
  const tagsLine = longLines.find((l) => /^(태그|Tags):/.test(l)) || '';
  const hashtags = longLines.find((l) => /^#/.test(l)) || '';
  const ko = /^태그:/.test(tagsLine);
  const longBody = longLines.slice(1)
    .filter((l) => !/^(태그|Tags):/.test(l) && !/AI 음성|AI-generated voice/.test(l))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const shortLines = short.trim().split('\n');
  const shortTitle = shortLines[0].replace(/^\[[^\]]+\]\s*/, '');
  // Shorts descriptions can't hold links: point to the site by name instead.
  const shortBody = shortLines.slice(1).join(' ').trim()
    .replace(/\s*(전체 영상과 직접 해보기|Full video & play):\s*\S+/, ko ? ' playgonu.com 에서 직접 해보세요.' : ' Play it at playgonu.com.');
  return {
    long: { title: longLines[0].replace(/^\[[^\]]+\]\s*/, ''), body: longBody, tags: tagsLine.replace(/^(태그|Tags):\s*/, '') },
    short: { title: shortTitle, body: `${shortBody}\n\n${hashtags}${hashtags.includes('#shorts') ? '' : ' #shorts'}`.trim(), tags: tagsLine.replace(/^(태그|Tags):\s*/, '') },
    ko,
  };
}

function place(src, dest) {
  fs.rmSync(dest, { force: true });
  try { fs.linkSync(src, dest); } catch { fs.copyFileSync(src, dest); }
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
const list = ['# 업로드 순서 (번호 = 올리는 순서)', '', '| 번호 | 날짜 | 시간 | 종류 | 제목 | 재생목록 |', '|---|---|---|---|---|---|'];
rows.forEach((r, i) => {
  const n = String(i + 1).padStart(2, '0');
  const base = r.file.replace(/\.mp4$/, '');
  const isLong = r.kind === '롱폼';
  const t = texts(r.textFile);
  const part = isLong ? t.long : t.short;
  place(path.join(OUT, r.file), path.join(DEST, `${n}_${r.file}`));
  const srt = path.join(OUT, `${base}.srt`);
  if (fs.existsSync(srt)) place(srt, path.join(DEST, `${n}_${base}.srt`));
  if (isLong) {
    const thumbName = `${base.replace(/-(landscape|long)-(ko|en)$/, '')}-${base.slice(-2)}.png`;
    const thumb = path.join(OUT, 'thumbs', thumbName);
    if (fs.existsSync(thumb)) place(thumb, path.join(DEST, `${n}_${base}_썸네일.png`));
  }
  const L = t.ko
    ? { title: '제목', body: '설명', tags: '태그 (자세히 보기 → 태그)', pl: '재생목록', when: '예약' }
    : { title: 'Title', body: 'Description', tags: 'Tags (Show more → Tags)', pl: 'Playlist', when: 'Schedule' };
  const doc = [
    `${n}번 · ${r.date} ${r.time} · ${r.kind} · ${r.file}`, '',
    `■ ${L.title}`, part.title, '',
    `■ ${L.body}`, part.body, '',
    `■ ${L.tags}`, part.tags, '',
    `■ ${L.pl}: ${r.playlist}`,
    `■ ${L.when}: ${r.date} ${r.time}`, '',
  ].join('\n');
  fs.writeFileSync(path.join(DEST, `${n}_${base}_문구.txt`), doc);
  list.push(`| ${n} | ${r.date} | ${r.time} | ${r.kind} | ${part.title} | ${r.playlist} |`);
});
fs.writeFileSync(path.join(DEST, '00_목록.md'), `${list.join('\n')}\n`);
console.log(`${rows.length} uploads → ${DEST}`);
