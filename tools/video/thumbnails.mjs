// YouTube thumbnails (1280×720) for the long-form videos: big two-line text
// on the left, the board from the video's key moment (the last explanation
// before the outro) on the right.
//   node thumbnails.mjs [name …]   → out/thumbs/<name>-{ko,en}.png
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const OUT = path.join(import.meta.dirname, 'out');
const DIR = path.join(OUT, 'thumbs');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));

// Board area in the 1920×1080 recordings (game pages; the online page centers it).
const CROP = { game: [285, 215, 650], online: [635, 285, 650] };

const T = {
  'howto-cham': { ko: { tag: '참고누', big: ['참고누', '하는 법'], sub: '왔다 갔다만 해도 계속 잡는다?!' }, en: { tag: 'CHAM-GONU', big: ['Cham-gonu', 'How to Play'], sub: 'Keep capturing, back and forth?!' } },
  'howto-jul': { ko: { tag: '줄고누', big: ['줄고누', '하는 법'], sub: '한 수로 두 개를 잡는다?!' }, en: { tag: 'JUL-GONU', big: ['Jul-gonu', 'How to Play'], sub: 'Two captures in one move?!' } },
  'howto-daseotjul': { ko: { tag: '다섯줄고누', big: ['다섯줄고누', '하는 법'], sub: '양옆을 한 번에 잡는다?!' }, en: { tag: 'DASEOTJUL-GONU', big: ['Daseotjul-gonu', 'How to Play'], sub: 'Both sides in one move?!' } },
  'howto-palpal': { ko: { tag: '팔팔고누', big: ['팔팔고누', '하는 법'], sub: '연달아 세 개를 잡는다?!' }, en: { tag: 'PALPAL-GONU', big: ['Palpal-gonu', 'How to Play'], sub: 'Three captures in a row?!' } },
  'howto-bakwi': { ko: { tag: '바퀴고누', big: ['바퀴고누', '하는 법'], sub: '멀리서 쭉 미끄러져 잡는다?!' }, en: { tag: 'BAKWI-GONU', big: ['Bakwi-gonu', 'How to Play'], sub: 'Slide all the way to capture?!' } },
  'cham-running-mill': { crop: 'online', ko: { tag: '참고누 전략', big: ['11 대 8', '역전 비결'], sub: '왕복 꼰 하나면 끝' }, en: { tag: 'CHAM-GONU', big: ['Down 8 to 11', 'and still won'], sub: 'The running mill' } },
  'gomoku-43': { ko: { tag: '오목', big: ['오목 필승법', '4-3'], sub: '막을 수 없는 한 수' }, en: { tag: 'OMOK', big: ['The 4-3', 'wins'], sub: 'The move that can’t be stopped' } },
  'gomoku-open3': { ko: { tag: '오목', big: ['열린 3은', '바로 막아라'], sub: '한 수 늦으면 끝' }, en: { tag: 'OMOK', big: ['Block the', 'open three'], sub: 'One move late = game over' } },
  'gomoku-vcf': { ko: { tag: '오목 퍼즐', big: ['3수 만에', '이기기'], sub: '연속 4로 끝내는 법' }, en: { tag: 'OMOK PUZZLE', big: ['Win in', '3 moves'], sub: 'Forcing fours' } },
  'gomoku-renju': { ko: { tag: '렌주', big: ['흑은 여기', '못 둔다'], sub: '삼삼 · 사사 · 장목' }, en: { tag: 'RENJU', big: ['Black can’t', 'play here'], sub: 'The three Renju fouls' } },
  'cham-puzzle': { ko: { tag: '참고누 퍼즐', big: ['한 칸 옮겨', '잡아라'], sub: '꼰 퍼즐 3문제' }, en: { tag: 'CHAM-GONU PUZZLE', big: ['One slide', 'to capture'], sub: 'Three mill puzzles' } },
  'cham-block': { ko: { tag: '참고누 전략', big: ['왕복 꼰', '막는 법'], sub: '빈칸을 먼저 차지하세요' }, en: { tag: 'CHAM-GONU', big: ['Stop the', 'running mill'], sub: 'Take the gap first' } },
  'cham-mistakes': { ko: { tag: '참고누', big: ['초보 실수', '3가지'], sub: '말이 많은데 졌다?!' }, en: { tag: 'CHAM-GONU', big: ['3 beginner', 'mistakes'], sub: 'Lost with pieces to spare?!' } },
  'cham-bestpoints': { ko: { tag: '참고누 통계', big: ['명당은', '모서리'], sub: 'AI 대국 356판 분석' }, en: { tag: 'CHAM-GONU', big: ['Corners', 'win more'], sub: 'Stats from 356 AI games' } },
  'cham-highlight': { ko: { tag: '참고누', big: ['3개 차', '대역전'], sub: '고수 대국 하이라이트' }, en: { tag: 'CHAM-GONU', big: ['Down three,', 'came back'], sub: 'Master game highlights' } },
};

const FONTS = {
  ko: { big: 'Black Han Sans', sub: 'Noto Sans KR', css: 'Black+Han+Sans&family=Noto+Sans+KR:wght@700;900' },
  en: { big: 'Archivo Black', sub: 'Noto Sans', css: 'Archivo+Black&family=Noto+Sans:wght@700;900' },
};

function videoFile(name, lang) {
  for (const f of [`${name}-landscape-${lang}`, `${name}-long-${lang}`]) if (fs.existsSync(path.join(OUT, `${f}.mp4`))) return f;
  throw new Error(`no video for ${name} ${lang}`);
}

// The board at the last explanation before the outro, from the Korean video
// (the board itself has no text, so both languages share it).
function boardImage(name, crop) {
  const base = videoFile(name, 'ko');
  const marks = fs.readFileSync(path.join(OUT, `${base}-narration.txt`), 'utf8').split('\n').filter((l) => /^\[\d+:\d+/.test(l) && !/친구들과/.test(l));
  const [, mm, ss] = marks.at(-1).match(/^\[(\d+):(\d+)/);
  const t = Number(mm) * 60 + Number(ss) + 1.5;
  const [x, y, s] = CROP[crop];
  const file = path.join(DIR, `_board-${name}.png`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', path.join(OUT, `${base}.mp4`), '-frames:v', '1', '-vf', `crop=${s}:${s}:${x}:${y}`, file]);
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function html(c, f, board) {
  return `<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=${f.css}&display=block" rel="stylesheet"><style>
  html,body{margin:0}
  .card{width:1280px;height:720px;background:#F6F1E6;position:relative;overflow:hidden;font-family:'${f.sub}',sans-serif}
  .board{position:absolute;right:46px;top:50%;width:600px;height:600px;transform:translateY(-50%) rotate(2deg);border-radius:22px;overflow:hidden;box-shadow:0 18px 40px rgba(42,36,32,.28);border:6px solid #2A2420}
  .board img{width:100%;height:100%;display:block}
  .text{position:absolute;left:58px;top:0;bottom:0;width:530px;display:flex;flex-direction:column;justify-content:center;gap:18px}
  .tag{align-self:flex-start;background:#AC3B2A;color:#fff;font-weight:900;font-size:30px;padding:8px 20px;border-radius:12px;letter-spacing:.02em}
  .big{font-family:'${f.big}',sans-serif;line-height:1.02;color:#2A2420;white-space:nowrap}
  .big .l2{color:#AC3B2A}
  .sub{font-weight:900;font-size:36px;color:#4A4038;line-height:1.25;word-break:keep-all}
  .site{position:absolute;left:58px;bottom:34px;font-weight:700;font-size:24px;color:#6B5F53}
  </style></head><body><div class="card">
  <div class="board"><img src="${board}"></div>
  <div class="text">
    <div class="tag">${esc(c.tag)}</div>
    <div class="big"><div class="l1">${esc(c.big[0])}</div><div class="l2">${esc(c.big[1])}</div></div>
    <div class="sub">${esc(c.sub)}</div>
  </div>
  <div class="site">playgonu.com</div>
  </div></body></html>`;
}

fs.mkdirSync(DIR, { recursive: true });
const only = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
for (const [name, def] of Object.entries(T).filter(([n]) => !only.length || only.includes(n))) {
  const board = boardImage(name, def.crop || 'game');
  for (const lang of ['ko', 'en']) {
    const c = def[lang];
    const f = FONTS[lang];
    await page.setContent(html(c, f, board), { waitUntil: 'load', timeout: 120000 });
    await page.evaluate(async (fams, text) => {
      await Promise.all(fams.map((fam) => document.fonts.load(`400 100px '${fam}'`, text)));
      await document.fonts.ready;
    }, [f.big, f.sub], [c.tag, ...c.big, c.sub, 'playgonu.com'].join(''));
    // Largest font size (≤150px) at which both big lines fit the text column.
    await page.evaluate(() => {
      const big = document.querySelector('.big');
      let size = 150;
      big.style.fontSize = `${size}px`;
      while (size > 60 && big.scrollWidth > 530) { size -= 4; big.style.fontSize = `${size}px`; }
    });
    const file = path.join(DIR, `${name}-${lang}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1280, height: 720 } });
    console.log(path.basename(file));
  }
  fs.rmSync(path.join(DIR, `_board-${name}.png`), { force: true });
}
await browser.close();
