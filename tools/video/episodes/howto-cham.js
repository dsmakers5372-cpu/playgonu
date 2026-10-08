// "How to play Cham-gonu" — two real AI-vs-AI games (self-play batch
// 2026-10-08), clicked move by move on the real Cham-gonu page in 2-player
// local mode: the first half (placing) from game 8, whose first mill is a
// diagonal, then a cut to game 251 for the second half (moving), which Red
// finishes by shuttling a running mill.
// Point numbering is the site's: outer square 0–7, middle 8–15, inner 16–23,
// clockwise from the top-left corner.
export default {
  page: 'index.html',
  engine: 'chamgonu',
  board: { kind: 'cham' },
  pieceR: 13,
  portraitExplainCap: 7,
  portraitMoveScale: 0.7,
  scenes: [
    {
      // Game 8 — the whole first half (28 actions: 24 placements + 4 captures).
      moves: [[null, 2], [null, 8], [null, 11], [null, 9], [null, 10], [null, 12], [null, 18], [null, 12], [null, 22], [null, 19], [null, 1], [null, 3], [null, 1], [null, 15], [null, 4], [null, 22], [null, 20], [null, 21], [null, 14], [null, 21], [null, 16], [null, 17], [null, 23], [null, 5], [null, 13], [null, 0], [null, 6], [null, 7]],
      fastPortrait: [[1, 6], [8, 11], [13, 14], [16, 18], [20, 28]],
    },
    {
      // Game 251 — its first half replays behind a title card; the video
      // resumes at the first move of the second half.
      moves: [[null, 2], [null, 4], [null, 17], [null, 21], [null, 10], [null, 20], [null, 18], [null, 20], [null, 3], [null, 1], [null, 22], [null, 19], [null, 11], [null, 15], [null, 16], [null, 0], [null, 16], [null, 5], [null, 9], [null, 5], [null, 12], [null, 6], [null, 14], [null, 8], [null, 12], [null, 13], [null, 7], [null, 11], [null, 23], [8, 16], [null, 13], [3, 11], [9, 8], [null, 11], [21, 20], [8, 9], [null, 4], [22, 21], [9, 8], [null, 20], [21, 20], [10, 9], [null, 14]],
      from: 29,
      cut: {
        ko: { title: '후반은 다른 판으로 볼게요', body: '24개를 다 놓은 뒤부터 —\n이번엔 말을 옮기는 후반이에요.' },
        en: { title: 'Now the second half, from another game', body: 'All pieces are on the board —\nfrom here on, pieces move.' },
      },
    },
  ],
  intro: {
    ko: { title: '참고누 게임 방법', body: '한국 전통 고누 중 가장 묵직한 게임.\n실제 대국으로 전반·후반을 차례로 알아봐요.' },
    en: { title: 'How to play Cham-gonu', body: 'The deepest of the traditional Korean Gonu games.\nLet’s learn both halves from real games.' },
  },
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 바로 시작하세요.\n링크 하나로 친구를 초대할 수 있어요.' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Start right away at playgonu.com —\ninvite a friend with a single link.' },
  },
  explain: [
    {
      after: 0,
      lines: [[0, 1, 2], [1, 9, 17], [0, 8, 16]],
      portrait: false,
      ko: { tag: '판', title: '점 24개, 줄 20개', body: '사각형 세 겹에 점이 24개예요. 한 줄에 점 셋이 놓이는 줄이 20개 — 변, 가운데를 잇는 선, 그리고 참고누만의 모서리 대각선이에요.' },
      en: { tag: 'Board', title: '24 points, 20 lines', body: 'Three nested squares make 24 points. There are 20 lines of three: the sides, the middle connectors, and Cham-gonu’s own corner diagonals.' },
    },
    {
      after: 0,
      rings: [{ color: 'gold', points: [0, 2, 4, 6] }],
      ko: { tag: '전반', title: '12개씩 번갈아 놓기', body: '전반에는 각자 말 12개를 한 개씩 번갈아 놓아요. 빨강이 먼저, 첫 수는 바깥 모서리 네 곳 중 하나에만 둘 수 있어요.' },
      en: { tag: 'First half', title: 'Take turns placing 12 each', body: 'In the first half, players take turns placing their 12 pieces. Red starts, and the very first piece must go on one of the four outer corners.' },
    },
    {
      after: 8,
      lines: [[2, 10, 18]],
      rings: [{ color: 'red', points: [12] }],
      tagTone: 'alert',
      ko: { tag: '꼰', title: '한 줄에 셋 = 꼰!', body: '빨강이 대각선에 셋을 이었어요. 꼰을 만들면 상대 말 하나를 잡아요. 전반에 잡힌 자리는 ×가 되어 전반이 끝날 때까지 아무도 못 놓아요.' },
      en: { tag: 'Mill', title: 'Three in a row = a mill!', body: 'Red lined up three on a diagonal. A mill lets you remove one enemy piece. In the first half, that point becomes an × that nobody may use until the half ends.' },
    },
    {
      after: 20,
      lines: [[14, 15, 8]],
      rings: [{ color: 'blue', points: [8, 14, 15] }],
      portrait: false,
      ko: { tag: '알아두기', title: '꼰 속의 말은 못 잡아요', body: '파랑도 꼰을 만들어 하나 잡았어요. 잡을 때, 이미 꼰을 이루고 있는 상대 말은 고를 수 없어요 — 상대 말이 전부 꼰 속에 있을 때만 예외예요.' },
      en: { tag: 'Good to know', title: 'Pieces in a mill are protected', body: 'Blue made a mill too. When capturing, you can’t take a piece that’s part of a standing mill — unless every enemy piece is in one.' },
    },
    {
      scene: 1,
      after: 29,
      arrows: [{ from: 8, to: 16 }],
      ko: { tag: '후반', title: '한 칸씩 옮기기', body: '둘 다 12개를 다 놓으면 후반이에요. 이제는 내 말 하나를 선을 따라 옆 빈 점으로 한 칸 옮겨요. ×는 사라져서 모든 빈 점을 쓸 수 있어요.' },
      en: { tag: 'Second half', title: 'Move one step at a time', body: 'Once both sides have placed 12, the second half begins: move one of your pieces along a line to an empty neighbouring point. The ×s are gone, so every empty point is open.' },
    },
    {
      scene: 1,
      after: 31,
      lines: [[16, 17, 18]],
      portrait: false,
      ko: { tag: '후반 꼰', title: '옮겨서 꼰, 그리고 잡기', body: '옮겨서 셋을 이어도 꼰이에요. 후반에 잡힌 자리는 ×가 생기지 않고 그냥 빈 점이 돼요.' },
      en: { tag: 'Mill', title: 'Move into a mill, then capture', body: 'Sliding into a line of three is a mill too. In the second half a captured point simply becomes empty — no ×.' },
    },
    {
      scene: 1,
      after: 43,
      rings: [{ color: 'blue', points: [20, 23] }],
      tagTone: 'alert',
      ko: { tag: '승리', title: '파랑 2개 — 빨강 승리', body: '상대를 2개 이하로 줄이거나, 움직일 곳이 없게 가두면 이겨요. 빨강이 마지막에 쓴 8↔9 왕복 꼰은 전략 영상에서 자세히!' },
      en: { tag: 'Win', title: 'Blue is down to 2 — Red wins', body: 'Win by cutting your opponent down to 2 pieces or leaving them no legal move. Red’s finishing 8↔9 shuttle — the running mill — has its own strategy video!' },
    },
  ],
};
