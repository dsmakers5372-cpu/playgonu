// "How to play Bakwi-gonu" — a real AI-vs-AI game (self-play batch
// 2026-10-08, easy vs master, game 53: 18 moves, Black wins), clicked move by
// move on the real bakwi.html page in 2-player local mode.
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
  intro: {
    ko: { title: '바퀴고누 게임 방법', body: '네 모서리의 "바퀴"에서 멀리 미끄러져 잡는 고누.\n실제 한 판을 두면서 알아봐요.' },
    en: { title: 'How to play Bakwi-gonu', body: 'The Gonu game where pieces slide far from the corner “wheels” to capture.\nLet’s learn it by watching a real game.' },
  },
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 바로 둘 수 있어요.\nAI와도, 옆자리 친구와도.' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Play it right now at playgonu.com —\nagainst the AI or a friend next to you.' },
  },
  explain: [
    {
      after: 0,
      rings: [{ color: 'red', points: [0, 1, 4, 5] }, { color: 'dark', points: [10, 11, 14, 15] }],
      ko: { tag: '준비', title: '말 4개씩, 마주 보는 모서리에서', body: '빨강은 왼쪽 위, 검정은 오른쪽 아래에 4개씩 모여 시작해요. 빨강이 먼저, 한 번에 한 칸씩 가로나 세로로 움직여요.' },
      en: { tag: 'Setup', title: '4 pieces each, in opposite corners', body: 'Red starts with 4 pieces in the top-left, Black in the bottom-right. Red goes first; pieces move one step across or up and down.' },
    },
    {
      after: 0,
      rings: [{ color: 'gold', points: [0, 3, 12, 15] }],
      ko: { tag: '바퀴', title: '네 모서리가 "바퀴"', body: '모서리의 동그라미가 바퀴예요. 바퀴 위에 있는 말만 한 줄로 멀리 미끄러질 수 있어요 — 빈칸이 이어지는 데까지.' },
      en: { tag: 'Wheels', title: 'The four corners are “wheels”', body: 'The circles at the corners are wheels. Only a piece standing on a wheel may slide any distance in a straight line, as far as the points are empty.' },
    },
    {
      after: 8,
      arrows: [{ from: 12, to: 8 }],
      rings: [{ color: 'dark', points: [8] }],
      tagTone: 'alert',
      ko: { tag: '잡기', title: '미끄러져서 잡기', body: '검정이 바퀴에서 위로 미끄러지다 처음 만난 빨강을 잡고 그 자리에 섰어요. 바퀴고누에서 잡는 방법은 이것뿐이에요.' },
      en: { tag: 'Capture', title: 'Slide in to capture', body: 'Black slid up from a wheel, took the first Red piece in its path and stopped there. This is the only way to capture in Bakwi-gonu.' },
    },
    {
      after: 10,
      rings: [{ color: 'dark', points: [7] }],
      arrows: [{ from: 15, to: 7 }],
      portrait: false,
      ko: { tag: '주고받기', title: '잡으면 바로 잡히기도', body: '빨강이 바퀴에서 내려와 잡자, 검정도 다른 바퀴에서 올라와 되잡았어요. 바퀴 줄에 서면 늘 조심!' },
      en: { tag: 'Trade', title: 'Capture, then get captured', body: 'Red came down from a wheel to capture, and Black answered from another wheel. Any point on a wheel’s line is risky.' },
    },
    {
      after: 18,
      arrows: [{ from: 12, to: 4 }],
      rings: [{ color: 'dark', points: [4] }],
      tagTone: 'alert',
      ko: { tag: '승리', title: '빨강이 하나도 안 남았어요', body: '상대 말을 모두 잡거나, 움직일 곳이 없게 가두면 이겨요. 양쪽 합쳐 40수 동안 잡기가 없으면 무승부예요.' },
      en: { tag: 'Win', title: 'No Red pieces left', body: 'Win by capturing every enemy piece or leaving your opponent no legal move. If 40 moves pass with no capture, it’s a draw.' },
    },
  ],
};
