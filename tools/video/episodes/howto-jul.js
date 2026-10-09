// "How to play Jul-gonu" — a real AI-vs-AI game (self-play batch 2026-10-08,
// hard vs easy, game 7: 23 moves, Red wins with a double capture), clicked
// move by move on the real jul.html page in 2-player local mode.
// Opens on the hook (the final double capture), then teaches from move one.
// Points: 4×4 grid, index = row * 4 + col (0–3 Red's back row, 12–15 Black's).
export default {
  page: 'jul.html',
  engine: 'julgonu',
  board: { kind: 'grid', rows: 4, cols: 4, margin: 40 },
  pieceR: 16,
  scenes: [
    {
      moves: [[0, 4], [14, 10], [4, 8], [13, 9], [2, 6], [9, 5], [8, 4], [12, 8], [3, 7], [15, 11], [6, 5], [10, 6], [1, 2], [8, 9], [4, 8], [11, 15], [5, 1], [15, 14], [1, 5], [14, 10], [7, 11], [10, 6], [11, 10]],
    },
  ],
  hook: {
    at: 22,
    plies: 1,
    caption: { ko: '한 수로 <em>두 개</em>를 잡는다?!', en: '<em>Two</em> captures in one move?!' },
    after: {
      ko: { title: '줄고누, 1분이면 배워요', body: '처음부터 같이 볼까요?' },
      en: { title: 'Learn Jul-gonu in a minute', body: 'Let’s start from move one.' },
    },
  },
  intro: {
    ko: { title: '줄고누 게임 방법', body: '1분이면 배우는 한국 전통 고누' },
    en: { title: 'How to play Jul-gonu', body: 'A traditional Korean game you can learn in a minute' },
  },
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 바로 둘 수 있어요' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Play it right now at playgonu.com' },
  },
  explain: [
    {
      after: 0,
      rings: [{ color: 'red', points: [0, 1, 2, 3] }, { color: 'dark', points: [12, 13, 14, 15] }],
      arrows: [{ from: 0, to: 4 }],
      ko: { tag: '준비', title: '말 4개씩, 빨강 먼저', body: '한 번에 한 칸, 가로나 세로로.' },
      en: { tag: 'Setup', title: '4 pieces each, Red first', body: 'One step at a time, across or down.' },
    },
    {
      after: 7,
      lines: [[4, 5, 6]],
      rings: [{ color: 'gold', points: [4, 6] }, { color: 'dark', points: [5] }],
      tagTone: 'alert',
      ko: { tag: '잡기', title: '끼우면 잡아요!', body: '내 말 둘 사이에 가두면 끝.' },
      en: { tag: 'Capture', title: 'Sandwich it!', body: 'Trap it between two of yours.' },
    },
    {
      after: 12,
      lines: [[5, 6, 7]],
      rings: [{ color: 'dark', points: [6] }, { color: 'gold', points: [5, 7] }],
      ko: { tag: '알아두기', title: '들어가는 건 안전', body: '잡기는 움직인 쪽만 해요.' },
      en: { tag: 'Good to know', title: 'Walking in is safe', body: 'Only the player who moves captures.' },
    },
    {
      after: 23,
      lines: [[2, 6, 10], [8, 9, 10]],
      rings: [{ color: 'gold', points: [10] }],
      tagTone: 'alert',
      ko: { tag: '승리', title: '1개 남기면 승리!', body: '가둬도 이겨요 · 40수 동안 못 잡으면 말 많은 쪽 승리' },
      en: { tag: 'Win', title: 'Leave them 1 piece — you win', body: 'Boxing them in wins too · 40 moves with no capture: more pieces wins' },
    },
  ],
};
