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
  // Strategy videos: own titles instead of "how to play".
  'gomoku-43': { ko: ['오목', 'gomoku.html'], en: ['Gomoku', 'gomoku.html'], titles: { ko: ['오목 필승법 4-3 — 막을 수 없는 한 수', '오목 4-3, 이 한 수면 끝 #shorts'], en: ['Gomoku’s Winning Shape: the Four-Three', 'The Gomoku move that can’t be stopped #shorts'] }, tagsKo: ['오목', '오목 필승법', '4-3', '사삼', '오목 전략'], tagsEn: ['Gomoku', 'four three', 'Gomoku strategy', 'five in a row', 'Omok'], koIntro: '4와 열린 3을 한 수로 동시에 만들면 상대는 둘 다 막을 수 없어요. 오목에서 가장 기본적인 필승 모양, 4-3을 두 가지 모양으로 보여드려요.', enIntro: 'Make a four and an open three with one stone, and your opponent can’t block both. Gomoku’s most basic winning shape, shown two ways.' },
  'gomoku-open3': { ko: ['오목', 'gomoku.html'], en: ['Gomoku', 'gomoku.html'], titles: { ko: ['오목 수비 기본 — 열린 3은 바로 막기', '한 수 늦으면 끝! 열린 3 #shorts'], en: ['Gomoku Defence 101: Block an Open Three at Once', 'One move late = game over #shorts'] }, tagsKo: ['오목', '오목 수비', '열린 3', '오목 기초'], tagsEn: ['Gomoku', 'Gomoku defense', 'open three', 'Omok basics'], koIntro: '양 끝이 빈 3(열린 3)을 놓치면 열린 4가 되어 막을 수 없어요. 놓쳤을 때와 바로 막았을 때를 같은 판에서 비교해요.', enIntro: 'Miss an open three and it becomes an unstoppable open four. The same position played both ways: the miss, and the block.' },
  'gomoku-vcf': { ko: ['오목', 'gomoku.html'], en: ['Gomoku', 'gomoku.html'], titles: { ko: ['오목 퍼즐 — 연속 4로 3수 만에 이기기', '3초 안에 풀 수 있을까? 오목 퍼즐 #shorts'], en: ['Gomoku Puzzles: Win in Three With Forcing Fours', 'Can you solve it in 3 seconds? #shorts'] }, tagsKo: ['오목', '오목 퍼즐', '연속 4', 'VCF', '오목 전략'], tagsEn: ['Gomoku', 'Gomoku puzzle', 'VCF', 'forcing fours', 'Renju'], koIntro: '실제 AI 대국에서 뽑은 퍼즐 3문제. 4를 연달아 만들어 상대가 막기만 하게 몰아붙이면 3수 만에 이겨요.', enIntro: 'Three puzzles from real AI games: keep making fours so every reply is forced, and win in three.' },
  'gomoku-renju': { ko: ['오목', 'gomoku.html'], en: ['Gomoku', 'gomoku.html'], titles: { ko: ['렌주 금수 3가지 — 삼삼·사사·장목', '흑은 여기 못 둔다?! 렌주 금수 #shorts'], en: ['The Three Renju Fouls: Double Three, Double Four, Overline', 'Black can’t play here?! Renju fouls #shorts'] }, tagsKo: ['오목', '렌주', '렌주룰', '금수', '삼삼', '오목 규칙'], tagsEn: ['Renju', 'Gomoku', 'renju rules', 'double three', 'overline'], koIntro: '렌주 규칙에서 흑은 삼삼·사사·장목 자리에 둘 수 없어요. 사이트가 실제로 금수 자리를 표시하는 화면으로 하나씩 보여드려요. 백은 금수가 없어요.', enIntro: 'Under Renju rules Black may not play a double three, a double four or an overline. Each one shown on the real board, where the site marks the forbidden point. White has no fouls.' },
  'cham-puzzle': { ko: ['참고누', ''], en: ['Cham-gonu', ''], titles: { ko: ['참고누 꼰 퍼즐 — 한 칸 옮겨서 잡기', '한 칸 옮겨서 잡을 수 있을까? #shorts'], en: ['Cham-gonu Mill Puzzles: One Slide to Capture', 'Can one slide capture? #shorts'] }, tagsKo: ['참고누', '꼰', '고누 퍼즐'], tagsEn: ['Cham-gonu', 'mill puzzle', 'Gonu puzzle'], koIntro: '실제 AI 대국에서 뽑은 퍼즐 3문제. 한 칸만 옮겨서 꼰(한 줄에 셋)을 만들 자리를 찾아보세요.', enIntro: 'Three puzzles from real AI games: find the one slide that makes a mill.' },
  'cham-block': { ko: ['참고누', 'cham-strategy.html'], en: ['Cham-gonu', 'cham-strategy.html'], titles: { ko: ['참고누 왕복 꼰 막는 법 — 빈칸을 먼저', '왕복 꼰, 막을 수 있다?! #shorts'], en: ['How to Stop a Running Mill in Cham-gonu', 'A running mill can be stopped?! #shorts'] }, tagsKo: ['참고누', '왕복 꼰', '참고누 전략'], tagsEn: ['Cham-gonu', 'running mill', 'Cham-gonu strategy'], koIntro: '왔다 갔다 할 때마다 꼰이 되는 왕복 꼰. 그 말이 오갈 빈칸을 먼저 차지하면 막을 수 있어요. 실제 대국 두 판으로 보여드려요.', enIntro: 'A running mill captures every turn — unless you take the point it shuttles into first. Shown in two real games.' },
  'cham-bestpoints': { ko: ['참고누', ''], en: ['Cham-gonu', ''], titles: { ko: ['참고누 배치 명당 — AI 대국 356판 통계', '참고누 명당은 어디? #shorts'], en: ['Cham-gonu’s Best Points — Stats From 356 AI Games', 'Where should you place first? #shorts'] }, tagsKo: ['참고누', '고누', '참고누 전략', '통계'], tagsEn: ['Cham-gonu', 'Gonu strategy', 'statistics', 'mill game'], koIntro: 'AI 대국 356판에서 전반이 끝났을 때 어느 자리를 가진 쪽이 이겼는지 세어봤어요. 모서리는 꼰이 될 줄이 3개라 승률 58%, 변 가운데는 50%.', enIntro: 'We counted 356 AI games: at half time, which points did the winner hold? Corners — on three lines each — won 58%; side midpoints 50%.' },
  'cham-highlight': { ko: ['참고누', ''], en: ['Cham-gonu', ''], titles: { ko: ['참고누 고수 대국 하이라이트 — 3개 차 역전', '밀리던 쪽이 뒤집는다?! #shorts'], en: ['Cham-gonu Master Game Highlights — a 3-Piece Comeback', 'Down three — and turned around?! #shorts'] }, tagsKo: ['참고누', '고누', '대국', '하이라이트'], tagsEn: ['Cham-gonu', 'Gonu', 'game highlights', 'comeback'], koIntro: 'AI 고수 대국 한 판을 빠르게. 후반에 3개 차로 밀리던 쪽이 꼰으로 반격해 역전하는 장면까지.', enIntro: 'A strong AI game, fast: down three pieces in the second half, one side fights back with mills and wins.' },
  'cham-mistakes': { ko: ['참고누', ''], en: ['Cham-gonu', ''], titles: { ko: ['참고누 초보 실수 3가지', '말이 많은데 졌다?! 참고누 #shorts'], en: ['Three Cham-gonu Beginner Mistakes', 'Lost with pieces to spare?! #shorts'] }, tagsKo: ['참고누', '고누', '초보', '참고누 전략'], tagsEn: ['Cham-gonu', 'Gonu', 'beginner mistakes', 'strategy'], koIntro: '두 개 줄 방치, 꼰 자리 열어주기, 내 말 가두기 — 실제 대국에서 나온 초보 실수 3가지와 피하는 법.', enIntro: 'Ignoring two in a row, opening a mill point, boxing yourself in — three beginner mistakes from real games, and how to avoid them.' },
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
    const title = g.titles ? g.titles[lang][0] : ko ? `${name} 게임 방법 — 실제 한 판으로 배우기` : `How to Play ${name} — Learn It From One Real Game`;
    const shortsTitle = g.titles ? g.titles[lang][1] : ko ? `${name}, 이렇게 둬요 #shorts` : `How to play ${name} #shorts`;
    const tags = g.titles
      ? [...(ko ? g.tagsKo : g.tagsEn), ...(ko ? ['보드게임', '플레이고누', 'PlayGonu'] : ['board game', 'strategy', 'PlayGonu'])]
      : ko
        ? [name, '고누', '고누놀이', '고누 게임 방법', '전통놀이', '민속놀이', '보드게임', '플레이고누', 'PlayGonu']
        : [name, 'Gonu', 'how to play', 'Korean board game', 'traditional games', 'abstract strategy', 'board game rules', 'PlayGonu'];
    const text = [
      `[${ko ? '롱폼(가로)' : 'Video (landscape)'}] ${title}`,
      '',
      ko ? g.koIntro : g.enIntro,
      g.titles
        ? (ko ? 'playgonu.com 실제 화면에서 한 수씩 직접 두며 설명해요.' : 'Every move is played on the real playgonu.com board.')
        : (ko ? 'playgonu.com 실제 화면에서 AI끼리 둔 한 판을 직접 클릭하며 규칙을 하나씩 설명해요.' : 'Every move is clicked on the real playgonu.com board, with each rule explained as it comes up in a real AI-vs-AI game.'),
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
