// "How to play Jul-gonu" — a real AI-vs-AI game (self-play batch 2026-10-08,
// hard vs easy, game 7: 23 moves, Red wins with a double capture), clicked
// move by move on the real jul.html page in 2-player local mode.
// Points: 4×4 grid, index = row * 4 + col (0–3 Red's back row, 12–15 Black's).
export default {
  page: 'jul.html',
  engine: 'julgonu',
  board: { kind: 'grid', rows: 4, cols: 4, margin: 40 },
  pieceR: 16,
  portraitExplainCap: 8.5,
  scenes: [
    {
      moves: [[0, 4], [14, 10], [4, 8], [13, 9], [2, 6], [9, 5], [8, 4], [12, 8], [3, 7], [15, 11], [6, 5], [10, 6], [1, 2], [8, 9], [4, 8], [11, 15], [5, 1], [15, 14], [1, 5], [14, 10], [7, 11], [10, 6], [11, 10]],
    },
  ],
  intro: {
    ko: { title: '줄고누 게임 방법', body: '1분이면 배우는 한국 전통 고누.\n실제 한 판을 두면서 알아봐요.' },
    en: { title: 'How to play Jul-gonu', body: 'A traditional Korean Gonu game you can learn in a minute.\nLet’s learn it by watching a real game.' },
  },
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 바로 둘 수 있어요.\nAI와도, 옆자리 친구와도.' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Play it right now at playgonu.com —\nagainst the AI or a friend next to you.' },
  },
  explain: [
    {
      after: 0,
      rings: [{ color: 'red', points: [0, 1, 2, 3] }, { color: 'dark', points: [12, 13, 14, 15] }],
      ko: { tag: '준비', title: '말 4개씩, 빨강 먼저', body: '가로세로 4줄 판이에요. 각자 말 4개를 자기 쪽 끝줄에 놓고 시작하고, 빨강이 먼저 둬요.' },
      en: { tag: 'Setup', title: '4 pieces each, Red first', body: 'The board is a 4×4 grid of points. Each side lines up 4 pieces on its back row, and Red moves first.' },
    },
    {
      after: 0,
      arrows: [{ from: 0, to: 4 }],
      ko: { tag: '움직이기', title: '선을 따라 한 칸', body: '말을 누르면 갈 수 있는 곳이 점으로 표시돼요. 한 번에 한 칸, 가로나 세로로만 움직여요.' },
      en: { tag: 'Moving', title: 'One step along a line', body: 'Tap a piece and the site shows where it can go. Move one step at a time, across or up and down.' },
    },
    {
      after: 7,
      lines: [[4, 5, 6]],
      rings: [{ color: 'gold', points: [4, 6] }, { color: 'dark', points: [5] }],
      tagTone: 'alert',
      ko: { tag: '잡기', title: '사이에 끼우면 잡아요!', body: '빨강이 말을 옮겨서 검정을 빨강 두 개 사이에 가뒀어요. 가로든 세로든 일직선으로 끼우면 그 말을 잡아요.' },
      en: { tag: 'Capture', title: 'Sandwich it to capture!', body: 'Red moved a piece so a Black piece sat between two Red pieces. Trap an enemy in a straight line, across or down, and it’s captured.' },
    },
    {
      after: 12,
      lines: [[5, 6, 7]],
      rings: [{ color: 'dark', points: [6] }, { color: 'gold', points: [5, 7] }],
      ko: { tag: '알아두기', title: '스스로 들어가면 안전', body: '검정이 빨강 둘 사이로 직접 들어갔어요. 잡기는 말을 옮긴 쪽만 할 수 있어서, 이렇게 들어간 말은 안 잡혀요.' },
      en: { tag: 'Good to know', title: 'Walking in is safe', body: 'Black stepped in between two Red pieces on its own. Only the player who moves can capture, so this piece is safe.' },
    },
    {
      after: 22,
      arrows: [{ from: 11, to: 10 }],
      rings: [{ color: 'dark', points: [6, 9] }],
      portrait: false,
      ko: { tag: '마지막 수', title: '여기로 오면…?', body: '검정은 2개 남았어요. 빨강이 이 칸으로 들어가면 어떻게 될까요?' },
      en: { tag: 'Last move', title: 'What if Red steps here…?', body: 'Black has 2 pieces left. Watch what happens when Red moves into this point.' },
    },
    {
      after: 23,
      lines: [[2, 6, 10], [8, 9, 10]],
      rings: [{ color: 'gold', points: [10] }],
      tagTone: 'alert',
      ko: { tag: '승리', title: '한 번에 두 개! 빨강 승리', body: '세로와 가로로 동시에 끼워 2개를 잡았어요. 상대를 1개 이하로 줄이거나, 움직일 곳이 없게 가두면 이겨요. 40수 동안 잡기가 없으면 무승부예요.' },
      en: { tag: 'Win', title: 'Two at once! Red wins', body: 'One move trapped two pieces, up-and-down and across. Win by leaving your opponent 1 piece or no legal move. 40 moves with no capture is a draw.' },
    },
  ],
};
