// Renders the per-language link-preview cards (og:image) shown when a page is
// shared on KakaoTalk, X, Facebook… — same layout as the English og-image.svg,
// with the text of each language's home-page hero.
//   node og-image.mjs [en ko es …]  → ../../og-image.png (English) and
//   og-image-{ko,es,ja,zh}.png, each with its .svg source
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(import.meta.dirname, '../..');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));

const CARDS = {
  en: {
    file: 'og-image', serif: 'Noto Serif', sans: 'Noto Sans', font: 'Noto+Serif:wght@400;700&family=Noto+Sans:wght@400;700',
    name: 'PlayGonu', tag: ['Master Mind Games', 'Cham-gonu & Omok'],
    lines: ['Korean traditional strategy board games.', 'Play solo vs AI, or online against a real person.'],
  },
  ko: {
    serif: 'Noto Serif KR', sans: 'Noto Sans KR', font: 'Noto+Serif+KR:wght@400;700&family=Noto+Sans+KR:wght@400;700',
    name: '플레이고누', tag: ['한국 전통 최고의 전략 두뇌게임', '고누 온라인 대전'],
    lines: ['참고누 · 오목 · 줄고누 · 바퀴고누'],
  },
  es: {
    serif: 'Noto Serif', sans: 'Noto Sans', font: 'Noto+Serif:wght@400;700&family=Noto+Sans:wght@400;700',
    name: 'PlayGonu', tag: ['Domina los juegos de ingenio', 'Cham-gonu & Gomoku'],
    lines: ['Juegos de estrategia tradicionales coreanos.', 'Contra la IA o en línea con personas reales.', 'Sin instalar nada, sin crear cuenta.'],
  },
  ja: {
    serif: 'Noto Serif JP', sans: 'Noto Sans JP', font: 'Noto+Serif+JP:wght@400;700&family=Noto+Sans+JP:wght@400;700',
    name: 'PlayGonu', tag: ['頭脳で勝負', 'チャムゴヌ & 五目並べ'],
    lines: ['韓国の伝統戦略ボードゲーム。', 'AIとひとりで、またはオンラインで対戦。', 'インストールもアカウントも不要。'],
  },
  zh: {
    serif: 'Noto Serif SC', sans: 'Noto Sans SC', font: 'Noto+Serif+SC:wght@400;700&family=Noto+Sans+SC:wght@400;700',
    name: 'PlayGonu', tag: ['烧脑对弈', '参高努 & 五子棋'],
    lines: ['韩国传统策略棋类游戏。', '单人挑战 AI，或在线与真人对弈。', '无需安装，无需注册。'],
  },
};

// The site button sits just under the last line of text (y=500 with three lines).
const btnY = (c) => 400 + (c.lines.length - 1) * 34 + 32;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function svgFor(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#F6F1E6"/>

  <!-- Cham-gonu board motif, right side -->
  <g transform="translate(700,95)" fill="none" stroke="#2A2420" stroke-width="5" stroke-linecap="round">
    <rect x="0" y="0" width="440" height="440"/>
    <rect x="85" y="85" width="270" height="270"/>
    <rect x="170" y="170" width="100" height="100"/>
    <line x1="0" y1="0" x2="85" y2="85"/>
    <line x1="440" y1="0" x2="355" y2="85"/>
    <line x1="0" y1="440" x2="85" y2="355"/>
    <line x1="440" y1="440" x2="355" y2="355"/>
  </g>
  <circle cx="700" cy="95" r="15" fill="#AC3B2A"/>
  <circle cx="1140" cy="95" r="15" fill="#2C5F8A"/>
  <circle cx="700" cy="535" r="15" fill="#2C5F8A"/>
  <circle cx="1140" cy="535" r="15" fill="#AC3B2A"/>
  <circle cx="785" cy="180" r="15" fill="#2C5F8A"/>
  <circle cx="1055" cy="450" r="15" fill="#AC3B2A"/>

  <!-- Text -->
  <text x="80" y="230" font-family="'${c.serif}', serif" font-size="88" font-weight="700" fill="#2A2420">${esc(c.name)}</text>
  <text x="80" y="292" font-family="'${c.serif}', serif" font-size="40" fill="#AC3B2A">${esc(c.tag[0])}</text>
  <text x="80" y="340" font-family="'${c.serif}', serif" font-size="40" fill="#AC3B2A">${esc(c.tag[1])}</text>
${c.lines.map((l, i) => `  <text x="80" y="${400 + i * 34}" font-family="'${c.sans}', sans-serif" font-size="25" fill="#4A4038">${esc(l)}</text>`).join('\n')}

  <rect x="80" y="${btnY(c)}" width="190" height="56" rx="10" fill="#AC3B2A"/>
  <text x="175" y="${btnY(c) + 36}" font-family="'${c.sans}', sans-serif" font-size="26" font-weight="700" fill="#F6F1E6" text-anchor="middle">playgonu.com</text>
</svg>
`;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630 });
const only = process.argv.slice(2);
for (const [lang, c] of Object.entries(CARDS).filter(([l]) => !only.length || only.includes(l))) {
  const svg = svgFor(c);
  const file = c.file || `og-image-${lang}`;
  fs.writeFileSync(path.join(ROOT, `${file}.svg`), svg);
  await page.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=${c.font}&display=block" rel="stylesheet"><style>html,body{margin:0}</style></head><body>${svg}</body></html>`, { waitUntil: 'load', timeout: 120000 });
  // Load exactly the glyphs on the card (CJK web fonts come in many slices).
  await page.evaluate(async (fams, texts) => {
    await Promise.all(fams.flatMap((f) => ['400', '700'].map((w) => document.fonts.load(`${w} 40px '${f}'`, texts))));
    await document.fonts.ready;
  }, [c.serif, c.sans], [c.name, ...c.tag, ...c.lines, 'playgonu.com'].join(''));
  // Text left of the board must not run into it (the board starts at x=700).
  const widest = await page.evaluate(() => Math.max(...[...document.querySelectorAll('text')].slice(0, 6).map((t) => t.getBBox().x + t.getBBox().width)));
  await page.screenshot({ path: path.join(ROOT, `${file}.png`), clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log(`${file}.png  text right edge ${Math.round(widest)}px${widest > 680 ? '  ⚠ overlaps the board' : ''}`);
}
await browser.close();
