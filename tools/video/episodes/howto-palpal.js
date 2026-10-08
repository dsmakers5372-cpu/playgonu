// "How to play Palpal-gonu" — a real AI-vs-AI game (self-play batch
// 2026-10-08, master vs easy, game 104: 67 moves, Red wins), clicked move by
// move on the real palpal.html page in 2-player local mode. The capture-free
// opening and the quiet stretches between captures play fast; every capture
// plays at full speed.
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
  intro: {
    ko: { title: '팔팔고누 게임 방법', body: '말 8개씩, 8×8 넓은 판에서 두는 줄고누.\n실제 한 판을 두면서 알아봐요.' },
    en: { title: 'How to play Palpal-gonu', body: 'The Jul-gonu family on a big 8×8 board, 8 pieces each.\nLet’s learn it by watching a real game.' },
  },
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 바로 둘 수 있어요.\nAI와도, 옆자리 친구와도.' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Play it right now at playgonu.com —\nagainst the AI or a friend next to you.' },
  },
  explain: [
    {
      after: 0,
      rings: [{ color: 'red', points: [0, 1, 2, 3, 4, 5, 6, 7] }, { color: 'dark', points: [56, 57, 58, 59, 60, 61, 62, 63] }],
      arrows: [{ from: 5, to: 13 }],
      ko: { tag: '준비', title: '말 8개씩, 빨강 먼저', body: '가로세로 8줄 판에 각자 말 8개를 끝줄에 놓고 시작해요. 빨강부터 한 번에 한 칸씩, 가로나 세로로 움직여요.' },
      en: { tag: 'Setup', title: '8 pieces each, Red first', body: 'Each side lines up 8 pieces on its back row of an 8×8 grid. Red goes first; pieces move one step across or up and down.' },
    },
    {
      after: 37,
      lines: [[10, 18, 26]],
      rings: [{ color: 'gold', points: [10, 26] }, { color: 'dark', points: [18] }],
      tagTone: 'alert',
      ko: { tag: '잡기', title: '사이에 끼우면 잡아요!', body: '빨강이 말을 옮겨 검정을 빨강 두 개 사이에 세로로 가뒀어요. 일직선으로 끼우면 잡혀요. 판이 넓어서 한 번 길이 열리면 연달아 잡기도 해요.' },
      en: { tag: 'Capture', title: 'Sandwich it to capture!', body: 'Red moved so a Black piece sat between two Red pieces, top and bottom. Trap an enemy in a straight line and it’s captured — on a big board, one opening can lead to several.' },
    },
    {
      after: 67,
      lines: [[52, 53, 54]],
      rings: [{ color: 'gold', points: [52] }, { color: 'dark', points: [43] }],
      tagTone: 'alert',
      ko: { tag: '승리', title: '검정 1개 — 빨강 승리', body: '상대를 1개 이하로 줄이거나, 움직일 곳이 없게 가두면 이겨요. 양쪽 합쳐 40수 동안 잡기가 없으면 무승부예요.' },
      en: { tag: 'Win', title: 'One Black piece left — Red wins', body: 'Win by leaving your opponent 1 piece or no legal move. If 40 moves pass with no capture, it’s a draw.' },
    },
  ],
};
