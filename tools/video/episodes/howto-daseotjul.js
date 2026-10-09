// "How to play Daseotjul-gonu" — a real AI-vs-AI game (self-play batch
// 2026-10-08, master vs easy, game 16: 25 moves, Red wins), clicked move by
// move on the real daseotjul.html page in 2-player local mode.
// Opens on the hook (move 11: one step captures on both sides).
// Points: 5×5 grid, index = row * 5 + col (0–4 Red's back row, 20–24 Black's).
export default {
  page: 'daseotjul.html',
  engine: 'daseotjulgonu',
  board: { kind: 'grid', rows: 5, cols: 5, margin: 36 },
  pieceR: 12,
  scenes: [
    {
      moves: [[0, 5], [23, 18], [5, 10], [21, 16], [2, 7], [18, 13], [4, 9], [24, 19], [9, 14], [16, 11], [7, 12], [20, 15], [1, 6], [19, 18], [6, 7], [15, 16], [12, 17], [18, 13], [17, 12], [16, 11], [14, 13], [22, 17], [13, 18], [11, 6], [10, 5]],
    },
  ],
  hook: {
    at: 10,
    plies: 1,
    caption: { ko: '양옆을 <em>한 번에</em> 잡는다?!', en: 'Both sides <em>at once</em>?!' },
    after: {
      ko: { title: '다섯줄고누, 1분이면 배워요', body: '처음부터 같이 볼까요?' },
      en: { title: 'Learn Daseotjul-gonu in a minute', body: 'Let’s start from move one.' },
    },
  },
  intro: {
    ko: { title: '다섯줄고누 게임 방법', body: '줄고누를 한 줄 넓힌 5×5 판' },
    en: { title: 'How to play Daseotjul-gonu', body: 'Jul-gonu on a wider 5×5 board' },
  },
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 바로 둘 수 있어요' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Play it right now at playgonu.com' },
  },
  explain: [
    {
      after: 0,
      rings: [{ color: 'red', points: [0, 1, 2, 3, 4] }, { color: 'dark', points: [20, 21, 22, 23, 24] }],
      arrows: [{ from: 0, to: 5 }],
      ko: { tag: '준비', title: '말 5개씩, 빨강 먼저', body: '한 번에 한 칸, 가로나 세로로.' },
      en: { tag: 'Setup', title: '5 pieces each, Red first', body: 'One step at a time, across or down.' },
    },
    {
      after: 11,
      lines: [[10, 11, 12], [12, 13, 14]],
      rings: [{ color: 'gold', points: [10, 12, 14] }],
      tagTone: 'alert',
      ko: { tag: '잡기', title: '끼우면 잡아요!', body: '가운데로 들어가 양옆을 동시에.' },
      en: { tag: 'Capture', title: 'Sandwich to capture!', body: 'Step in and trap both sides at once.' },
    },
    {
      after: 17,
      lines: [[16, 17, 18]],
      rings: [{ color: 'red', points: [17] }, { color: 'dark', points: [16, 18] }],
      ko: { tag: '알아두기', title: '들어가는 건 안전', body: '잡기는 움직인 쪽만 해요.' },
      en: { tag: 'Good to know', title: 'Walking in is safe', body: 'Only the player who moves captures.' },
    },
    {
      after: 25,
      lines: [[5, 6, 7]],
      rings: [{ color: 'gold', points: [5] }],
      tagTone: 'alert',
      ko: { tag: '승리', title: '1개 남기면 승리!', body: '가둬도 이겨요 · 40수 동안 못 잡으면 말 많은 쪽 승리' },
      en: { tag: 'Win', title: 'Leave them 1 piece — you win', body: 'Boxing them in wins too · 40 moves with no capture: more pieces wins' },
    },
  ],
};
