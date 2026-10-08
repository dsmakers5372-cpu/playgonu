// "How to play Cham-gonu" — two real AI-vs-AI games (self-play batch
// 2026-10-08), clicked move by move on the real Cham-gonu page in 2-player
// local mode. Opens on the hook (game 251's running mill: shuttling 8↔9 to
// capture again and again), then the first half (placing) from game 8, then
// a cut to game 251 for the second half (moving).
// Point numbering is the site's: outer square 0–7, middle 8–15, inner 16–23,
// clockwise from the top-left corner.
const GAME_251 = [[null, 2], [null, 4], [null, 17], [null, 21], [null, 10], [null, 20], [null, 18], [null, 20], [null, 3], [null, 1], [null, 22], [null, 19], [null, 11], [null, 15], [null, 16], [null, 0], [null, 16], [null, 5], [null, 9], [null, 5], [null, 12], [null, 6], [null, 14], [null, 8], [null, 12], [null, 13], [null, 7], [null, 11], [null, 23], [8, 16], [null, 13], [3, 11], [9, 8], [null, 11], [21, 20], [8, 9], [null, 4], [22, 21], [9, 8], [null, 20], [21, 20], [10, 9], [null, 14]];

export default {
  page: 'index.html',
  engine: 'chamgonu',
  board: { kind: 'cham' },
  pieceR: 13,
  scenes: [
    {
      // Game 8 — the whole first half (28 actions: 24 placements + 4 captures).
      moves: [[null, 2], [null, 8], [null, 11], [null, 9], [null, 10], [null, 12], [null, 18], [null, 12], [null, 22], [null, 19], [null, 1], [null, 3], [null, 1], [null, 15], [null, 4], [null, 22], [null, 20], [null, 21], [null, 14], [null, 21], [null, 16], [null, 17], [null, 23], [null, 5], [null, 13], [null, 0], [null, 6], [null, 7]],
      fastPortrait: [[1, 6], [8, 11], [13, 14], [16, 18], [20, 28]],
    },
    {
      // Game 251 — its first half replays behind a title card; the video
      // resumes at the first move of the second half.
      moves: GAME_251,
      from: 29,
      cut: {
        ko: { title: '후반은 다른 판으로', body: '이제 말을 옮겨요' },
        en: { title: 'Second half, another game', body: 'Now the pieces move' },
      },
    },
  ],
  hook: {
    scene: 1,
    at: 35,
    plies: 5,
    caption: { ko: '왔다 갔다만 해도 <em>계속</em> 잡는다?!', en: 'Just slide back and forth — and <em>keep</em> capturing?!' },
    after: {
      ko: { title: '참고누, 금방 배워요', body: '처음부터 같이 볼까요?' },
      en: { title: 'Learn Cham-gonu fast', body: 'Let’s start from move one.' },
    },
  },
  intro: {
    ko: { title: '참고누 게임 방법', body: '한국 전통 고누 중 가장 묵직한 게임' },
    en: { title: 'How to play Cham-gonu', body: 'The deepest of the traditional Korean Gonu games' },
  },
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 친구를 초대해 보세요' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Invite a friend at playgonu.com' },
  },
  explain: [
    {
      after: 0,
      lines: [[0, 1, 2], [1, 9, 17], [0, 8, 16]],
      rings: [{ color: 'gold', points: [0, 2, 4, 6] }],
      ko: { tag: '전반', title: '12개씩 번갈아 놓기', body: '빨강 먼저, 첫 수는 바깥 모서리.' },
      en: { tag: 'First half', title: 'Take turns placing 12 each', body: 'Red first — the first piece on an outer corner.' },
    },
    {
      after: 8,
      lines: [[2, 10, 18]],
      rings: [{ color: 'red', points: [12] }],
      tagTone: 'alert',
      ko: { tag: '꼰', title: '한 줄에 셋 = 꼰!', body: '상대 말 하나를 잡아요. 그 자리는 ×.' },
      en: { tag: 'Mill', title: 'Three in a row = a mill!', body: 'Remove an enemy piece. Its point becomes an ×.' },
    },
    {
      after: 20,
      lines: [[14, 15, 8]],
      rings: [{ color: 'blue', points: [8, 14, 15] }],
      portrait: false,
      ko: { tag: '알아두기', title: '꼰 속의 말은 못 잡아요', body: '상대 말이 전부 꼰일 때만 예외.' },
      en: { tag: 'Good to know', title: 'Pieces in a mill are safe', body: 'Unless every enemy piece is in one.' },
    },
    {
      scene: 1,
      after: 29,
      arrows: [{ from: 8, to: 16 }],
      ko: { tag: '후반', title: '한 칸씩 옮기기', body: '선을 따라 옆 빈 점으로. ×는 사라져요.' },
      en: { tag: 'Second half', title: 'Move one step', body: 'Along a line to an empty point. The ×s are gone.' },
    },
    {
      scene: 1,
      after: 43,
      rings: [{ color: 'blue', points: [20, 23] }],
      tagTone: 'alert',
      ko: { tag: '승리', title: '2개 남기면 승리!', body: '가둬도 이겨요.' },
      en: { tag: 'Win', title: 'Down to 2 — you win', body: 'Boxing them in wins too.' },
    },
  ],
};
