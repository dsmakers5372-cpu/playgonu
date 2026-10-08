// YouTube upload text for the "how to play" videos — one file per game and
// language, covering the landscape video (title, description with chapters
// from its caption timings, tags) and the portrait Shorts cut.
//
//   node howto-meta.mjs            (all games)
//   node howto-meta.mjs howto-jul
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(HERE, 'out');

const GAMES = {
  'howto-jul': { ko: ['줄고누', 'jul.html'], en: ['Jul-gonu', 'jul.html'], koIntro: '4×4 판에서 말 4개씩, 상대 말을 내 말 둘 사이에 끼워 잡는 가장 쉬운 고누예요.', enIntro: 'The simplest Gonu: 4 pieces each on a 4×4 board — trap an enemy piece between two of yours to capture it.' },
  'howto-daseotjul': { ko: ['다섯줄고누', 'daseotjul.html'], en: ['Daseotjul-gonu', 'daseotjul.html'], koIntro: '줄고누를 5×5 판으로 넓힌 게임. 말 5개씩, 끼워서 잡아요.', enIntro: 'Jul-gonu on a wider 5×5 board, 5 pieces each — capture by sandwiching.' },
  'howto-palpal': { ko: ['팔팔고누', 'palpal.html'], en: ['Palpal-gonu', 'palpal.html'], koIntro: '8×8 넓은 판에서 말 8개씩 두는 줄고누 계열 고누예요.', enIntro: 'The Jul-gonu family on a big 8×8 board with 8 pieces each.' },
  'howto-bakwi': { ko: ['바퀴고누', 'bakwi.html'], en: ['Bakwi-gonu', 'bakwi.html'], koIntro: '네 모서리의 "바퀴"에 선 말만 멀리 미끄러져 상대를 잡을 수 있는 고누예요.', enIntro: 'Only a piece standing on one of the four corner “wheels” can slide far — and that slide is the only way to capture.' },
  'howto-cham': { ko: ['참고누', ''], en: ['Cham-gonu', ''], koIntro: '말 12개씩 번갈아 놓는 전반, 한 칸씩 옮기는 후반. 한 줄에 셋(꼰)을 만들면 상대 말을 잡아요. 서양의 나인 멘스 모리스와 닮았지만 대각선 줄이 있는 한국 전통 고누예요.', enIntro: 'Place 12 pieces each, then move them one step at a time; three in a row (a mill) captures. A Korean cousin of Nine Men’s Morris — with diagonal lines.' },
};

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const parse = (file) => fs.readFileSync(file, 'utf8').trim().split(/\n\n+/).map((block) => {
  const m = block.split('\n')[0].match(/^\[(\d\d):(\d\d) – (\d\d):(\d\d)\] (.*)$/);
  return { start: Number(m[1]) * 60 + Number(m[2]), title: m[5] };
});

for (const [id, g] of Object.entries(GAMES)) {
  if (process.argv[2] && process.argv[2] !== id) continue;
  for (const lang of ['ko', 'en']) {
    const narration = path.join(out, `${id}-landscape-${lang}-narration.txt`);
    if (!fs.existsSync(narration)) { console.warn(`skip ${id} ${lang}: no ${path.basename(narration)}`); continue; }
    const [name, page] = g[lang];
    const url = `https://playgonu.com/${lang === 'ko' ? 'ko/' : ''}${page}`;
    // YouTube wants chapters at least 10s long, the first at 00:00: keep the
    // intro, then every caption that starts 10s+ after the last kept one; the
    // closing card is too short to be a chapter of its own.
    const marks = parse(narration).slice(0, -1);
    marks[0].start = 0;
    const chapters = [];
    for (const m of marks) if (!chapters.length || m.start - chapters[chapters.length - 1].start >= 10) chapters.push(m);
    const ko = lang === 'ko';
    const title = ko ? `${name} 게임 방법 — 실제 한 판으로 배우기` : `How to Play ${name} — Learn It From One Real Game`;
    const shortsTitle = ko ? `${name}, 이렇게 둬요 #shorts` : `How to play ${name} #shorts`;
    const tags = ko
      ? [name, '고누', '고누놀이', '고누 게임 방법', '전통놀이', '민속놀이', '보드게임', '플레이고누', 'PlayGonu']
      : [name, 'Gonu', 'how to play', 'Korean board game', 'traditional games', 'abstract strategy', 'board game rules', 'PlayGonu'];
    const text = [
      `[${ko ? '롱폼(가로)' : 'Video (landscape)'}] ${title}`,
      '',
      ko ? g.koIntro : g.enIntro,
      ko ? 'playgonu.com 실제 화면에서 AI끼리 둔 한 판을 직접 클릭하며 규칙을 하나씩 설명해요.' : 'Every move is clicked on the real playgonu.com board, with each rule explained as it comes up in a real AI-vs-AI game.',
      '',
      `${ko ? '▶ 직접 해보기' : '▶ Play it'}: ${url}`,
      ko ? '🔊 해설 음성은 AI 음성(OpenAI)으로 만들었어요.' : '🔊 Narration is an AI-generated voice (OpenAI).',
      '',
      ko ? '챕터' : 'Chapters',
      ...chapters.map((c) => `${mmss(c.start)} ${c.title}`),
      '',
      tags.map((t) => `#${t.replace(/[\s-]/g, '')}`).slice(0, 5).join(' '),
      '',
      `${ko ? '태그' : 'Tags'}: ${tags.join(', ')}`,
      '',
      '----',
      '',
      `[${ko ? '숏츠(세로)' : 'Shorts (portrait)'}] ${shortsTitle}`,
      '',
      `${ko ? g.koIntro : g.enIntro} ${ko ? '전체 영상과 직접 해보기:' : 'Full video & play:'} ${url}`,
      '',
    ].join('\n');
    const file = path.join(out, `${id}-youtube-${lang}.txt`);
    fs.writeFileSync(file, text);
    console.log(path.basename(file));
  }
}
