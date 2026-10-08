// Builds YouTube upload text (title, description with chapters, tags) for an
// episode from the narration timings written by site-record.mjs.
//
//   node youtube-meta.mjs cham-running-mill
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const episode = process.argv[2] || 'cham-running-mill';
const out = path.join(HERE, 'out');

const META = {
  'cham-running-mill': {
    ko: {
      long: { title: '참고누 필승 전략, ‘왕복 꼰’ — 11 대 8에서 역전하는 법', guide: 'https://playgonu.com/ko/cham-strategy.html' },
      shorts: { title: '11 대 8에서 역전? 참고누 ‘왕복 꼰’ #shorts' },
      intro: '한국 전통 보드게임 참고누(고누)에서 승부를 가르는 기술, 왕복 꼰을 실제 대국으로 보여드려요. 배치 단계에서 11 대 8로 밀리던 쪽이 말 하나를 왔다 갔다 하며 아홉 번 연속으로 잡아 역전합니다.',
      play: '▶ 직접 해보기: https://playgonu.com/ko/',
      guideLine: '▶ 스크린샷으로 보는 전략 가이드:',
      chapters: '챕터',
      tags: ['참고누', '고누', '고누놀이', '전통놀이', '보드게임', '전략게임', '왕복꼰', '나인멘스모리스', '플레이고누', 'PlayGonu'],
    },
    en: {
      long: { title: 'Cham-gonu Strategy: The Running Mill (How to Come Back From 8 vs 11)', guide: 'https://playgonu.com/cham-strategy.html' },
      shorts: { title: 'Down 8 to 11… and still wins? The running mill #shorts' },
      intro: "Cham-gonu is the deepest of Korea's traditional Gonu board games — a cousin of Nine Men's Morris with diagonal lines. In this game the side that falls behind 8 to 11 builds a running mill and captures nine turns in a row to win.",
      play: '▶ Play it: https://playgonu.com/',
      guideLine: '▶ Strategy guide with screenshots:',
      chapters: 'Chapters',
      tags: ['Cham-gonu', 'Gonu', 'Korean board game', 'Nine Mens Morris', 'Twelve Mens Morris', 'running mill', 'board game strategy', 'abstract strategy', 'PlayGonu'],
    },
  },
};

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const parse = (file) => fs.readFileSync(file, 'utf8').trim().split(/\n\n+/).map((block) => {
  const [head] = block.split('\n');
  const m = head.match(/^\[(\d\d):(\d\d) – (\d\d):(\d\d)\] (.*)$/);
  return { start: Number(m[1]) * 60 + Number(m[2]), title: m[5] };
});

for (const lang of ['ko', 'en']) {
  const meta = META[episode][lang];
  let text = '';
  for (const cut of ['long', 'shorts']) {
    const narration = path.join(out, `${episode}-${cut}-${lang}-narration.txt`);
    if (!fs.existsSync(narration)) continue;
    const marks = parse(narration);
    text += `=== ${cut === 'long' ? 'LONG-FORM (16:9)' : 'SHORTS (9:16)'} — ${episode}-${cut}-${lang}.mp4 ===\n\n`;
    text += `TITLE\n${meta[cut].title}\n\nDESCRIPTION\n${meta.intro}\n\n${meta.play}\n`;
    if (cut === 'long') {
      text += `${meta.guideLine} ${meta.long.guide}\n\n${meta.chapters}\n`;
      // YouTube chapters: first at 00:00, each at least 10 seconds long.
      let last = -Infinity;
      for (const m of marks) {
        const t = m.start === marks[0].start ? 0 : m.start;
        if (t - last < 10) continue;
        text += `${mmss(t)} ${m.title}\n`;
        last = t;
      }
    }
    text += `\nTAGS\n${meta.tags.join(', ')}\n\nCAPTIONS FILE\n${episode}-${cut}-${lang}.srt\n\n`;
  }
  fs.writeFileSync(path.join(out, `${episode}-youtube-${lang}.txt`), text);
  console.log(`${episode}-youtube-${lang}.txt`);
}
