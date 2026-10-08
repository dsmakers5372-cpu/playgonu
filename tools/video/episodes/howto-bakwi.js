// "How to play Bakwi-gonu" — a real AI-vs-AI game (self-play batch
// 2026-10-08, easy vs master, game 53: 18 moves, Black wins), clicked move by
// move on the real bakwi.html page in 2-player local mode. Opens on the hook
// (moves 8–10: three wheel-slide captures traded back and forth).
// Points: 4×4 grid, index = row * 4 + col; wheels (corners) are 0, 3, 12, 15.
export default {
  page: 'bakwi.html',
  engine: 'bakwigonu',
  board: { kind: 'grid', rows: 4, cols: 4, margin: 60 },
  pieceR: 12,
  scenes: [
    {
      moves: [[5, 6], [14, 13], [4, 8], [13, 12], [1, 5], [11, 7], [0, 3], [12, 8], [3, 7], [15, 7], [5, 9], [7, 3], [6, 2], [3, 2], [9, 5], [8, 12], [5, 4], [12, 4]],
    },
  ],
  hook: {
    at: 7,
    plies: 3,
    caption: { ko: '멀리서 <em>쭉</em> 미끄러져 잡는다?!', en: 'Slide <em>all the way</em> to capture?!' },
    after: {
      ko: { title: '바퀴고누, 1분이면 배워요', body: '처음부터 같이 볼까요?' },
      en: { title: 'Learn Bakwi-gonu in a minute', body: 'Let’s start from move one.' },
    },
  },
  intro: {
    ko: { title: '바퀴고누 게임 방법', body: '모서리 "바퀴"에서 미끄러져 잡는 고누' },
    en: { title: 'How to play Bakwi-gonu', body: 'Slide from the corner “wheels” to capture' },
  },
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 바로 둘 수 있어요' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Play it right now at playgonu.com' },
  },
  explain: [
    {
      after: 0,
      rings: [{ color: 'red', points: [0, 1, 4, 5] }, { color: 'dark', points: [10, 11, 14, 15] }],
      ko: { tag: '준비', title: '말 4개씩, 마주 보는 모서리', body: '빨강 먼저, 한 칸씩 가로나 세로로.' },
      en: { tag: 'Setup', title: '4 each, in opposite corners', body: 'Red first; one step across or down.' },
    },
    {
      after: 0,
      rings: [{ color: 'gold', points: [0, 3, 12, 15] }],
      ko: { tag: '바퀴', title: '네 모서리가 "바퀴"', body: '바퀴 위 말만 한 줄로 멀리 미끄러져요.' },
      en: { tag: 'Wheels', title: 'The corners are “wheels”', body: 'Only a piece on a wheel can slide far.' },
    },
    {
      after: 8,
      arrows: [{ from: 12, to: 8 }],
      rings: [{ color: 'dark', points: [8] }],
      tagTone: 'alert',
      ko: { tag: '잡기', title: '미끄러져서 잡기', body: '처음 만난 상대 말을 잡고 그 자리에 서요.' },
      en: { tag: 'Capture', title: 'Slide in to capture', body: 'Take the first enemy in your path, and stop there.' },
    },
    {
      after: 18,
      arrows: [{ from: 12, to: 4 }],
      rings: [{ color: 'dark', points: [4] }],
      tagTone: 'alert',
      ko: { tag: '승리', title: '다 잡으면 승리!', body: '가둬도 이겨요 · 40수 동안 못 잡으면 무승부' },
      en: { tag: 'Win', title: 'Capture them all — you win', body: 'Boxing them in wins too · 40 moves with no capture is a draw' },
    },
  ],
};
