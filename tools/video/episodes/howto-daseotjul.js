// "How to play Daseotjul-gonu" — a real AI-vs-AI game (self-play batch
// 2026-10-08, master vs easy, game 16: 25 moves, Red wins), clicked move by
// move on the real daseotjul.html page in 2-player local mode.
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
  intro: {
    ko: { title: '다섯줄고누 게임 방법', body: '줄고누를 한 줄 넓힌 5×5 판.\n실제 한 판을 두면서 알아봐요.' },
    en: { title: 'How to play Daseotjul-gonu', body: 'Jul-gonu on a wider 5×5 board.\nLet’s learn it by watching a real game.' },
  },
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 바로 둘 수 있어요.\nAI와도, 옆자리 친구와도.' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Play it right now at playgonu.com —\nagainst the AI or a friend next to you.' },
  },
  explain: [
    {
      after: 0,
      rings: [{ color: 'red', points: [0, 1, 2, 3, 4] }, { color: 'dark', points: [20, 21, 22, 23, 24] }],
      arrows: [{ from: 0, to: 5 }],
      ko: { tag: '준비', title: '말 5개씩, 빨강 먼저', body: '가로세로 5줄 판이에요. 각자 말 5개를 끝줄에 놓고, 빨강부터 한 번에 한 칸씩 가로나 세로로 움직여요.' },
      en: { tag: 'Setup', title: '5 pieces each, Red first', body: 'A 5×5 grid of points. Each side starts with 5 pieces on its back row; Red goes first, and pieces move one step across or up and down.' },
    },
    {
      after: 11,
      lines: [[10, 11, 12], [12, 13, 14]],
      rings: [{ color: 'gold', points: [10, 12, 14] }],
      tagTone: 'alert',
      ko: { tag: '잡기', title: '양쪽을 한 번에!', body: '빨강이 가운데로 들어가면서 왼쪽 검정과 오른쪽 검정을 동시에 끼웠어요. 내 말 둘 사이에 일직선으로 가두면 잡아요 — 이번엔 2개!' },
      en: { tag: 'Capture', title: 'Both sides at once!', body: 'Red stepped into the middle and trapped a Black piece on each side. A piece caught in a straight line between two of yours is captured — two this time!' },
    },
    {
      after: 17,
      lines: [[16, 17, 18]],
      rings: [{ color: 'red', points: [17] }, { color: 'dark', points: [16, 18] }],
      ko: { tag: '알아두기', title: '스스로 들어가면 안전', body: '빨강이 검정 둘 사이로 직접 들어갔지만 안 잡혀요. 잡기는 말을 옮긴 쪽만 할 수 있어요.' },
      en: { tag: 'Good to know', title: 'Walking in is safe', body: 'Red stepped in between two Black pieces on its own, and it’s safe. Only the player who moves can capture.' },
    },
    {
      after: 25,
      lines: [[5, 6, 7]],
      rings: [{ color: 'gold', points: [5] }],
      tagTone: 'alert',
      ko: { tag: '승리', title: '검정 1개 — 빨강 승리', body: '상대를 1개 이하로 줄이거나, 움직일 곳이 없게 가두면 이겨요. 양쪽 합쳐 40수 동안 잡기가 없으면 무승부예요.' },
      en: { tag: 'Win', title: 'One Black piece left — Red wins', body: 'Win by leaving your opponent 1 piece or no legal move. If 40 moves pass with no capture, it’s a draw.' },
    },
  ],
};
