// "How to play Palpal-gonu" — a real AI-vs-AI game (self-play batch
// 2026-10-08, master vs easy, game 104: 67 moves, Red wins), clicked move by
// move on the real palpal.html page in 2-player local mode. Opens on the hook
// (three captures in a row from move 37); the capture-free stretches play
// fast, every capture at full speed.
// Points: 8×8 grid, index = row * 8 + col (0–7 Red's back row, 56–63 Black's).
export default {
  page: 'palpal.html',
  engine: 'palpalgonu',
  board: { kind: 'grid', rows: 8, cols: 8, margin: 20 },
  pieceR: 8,
  scenes: [
    {
      moves: [[5, 13], [59, 51], [3, 11], [62, 54], [7, 15], [57, 49], [13, 21], [61, 53], [15, 23], [53, 45], [1, 9], [49, 41], [9, 17], [56, 48], [6, 14], [41, 42], [11, 19], [48, 49], [4, 12], [42, 34], [0, 1], [49, 41], [21, 29], [51, 43], [23, 31], [60, 52], [29, 28], [58, 50], [2, 10], [45, 37], [31, 39], [37, 36], [39, 38], [34, 26], [17, 25], [26, 18], [25, 26], [36, 37], [28, 36], [43, 35], [26, 34], [41, 33], [1, 9], [54, 46], [14, 22], [63, 55], [22, 21], [50, 49], [9, 17], [46, 45], [36, 44], [55, 54], [38, 46], [33, 25], [34, 33], [49, 50], [17, 25], [50, 42], [19, 27], [42, 34], [27, 35], [52, 51], [21, 29], [54, 53], [46, 54], [51, 43], [44, 52]],
      fast: [[1, 34], [41, 66]],
    },
  ],
  hook: {
    at: 36,
    plies: 5,
    caption: { ko: '연달아 <em>세 개</em>를 잡는다?!', en: '<em>Three</em> captures in a row?!' },
    after: {
      ko: { title: '팔팔고누, 1분이면 배워요', body: '처음부터 같이 볼까요?' },
      en: { title: 'Learn Palpal-gonu in a minute', body: 'Let’s start from move one.' },
    },
  },
  intro: {
    ko: { title: '팔팔고누 게임 방법', body: '말 8개씩, 8×8 넓은 판' },
    en: { title: 'How to play Palpal-gonu', body: '8 pieces each on a big 8×8 board' },
  },
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 바로 둘 수 있어요' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Play it right now at playgonu.com' },
  },
  explain: [
    {
      after: 0,
      rings: [{ color: 'red', points: [0, 1, 2, 3, 4, 5, 6, 7] }, { color: 'dark', points: [56, 57, 58, 59, 60, 61, 62, 63] }],
      arrows: [{ from: 5, to: 13 }],
      ko: { tag: '준비', title: '말 8개씩, 빨강 먼저', body: '한 번에 한 칸, 가로나 세로로.' },
      en: { tag: 'Setup', title: '8 pieces each, Red first', body: 'One step at a time, across or down.' },
    },
    {
      after: 37,
      lines: [[10, 18, 26]],
      rings: [{ color: 'gold', points: [10, 26] }, { color: 'dark', points: [18] }],
      tagTone: 'alert',
      ko: { tag: '잡기', title: '끼우면 잡아요!', body: '내 말 둘 사이에 가두면 끝.' },
      en: { tag: 'Capture', title: 'Sandwich it!', body: 'Trap it between two of yours.' },
    },
    {
      after: 67,
      lines: [[52, 53, 54]],
      rings: [{ color: 'gold', points: [52] }, { color: 'dark', points: [43] }],
      tagTone: 'alert',
      ko: { tag: '승리', title: '1개 남기면 승리!', body: '가둬도 이겨요 · 40수 동안 못 잡으면 무승부' },
      en: { tag: 'Win', title: 'Leave them 1 piece — you win', body: 'Boxing them in wins too · 40 moves with no capture is a draw' },
    },
  ],
};
