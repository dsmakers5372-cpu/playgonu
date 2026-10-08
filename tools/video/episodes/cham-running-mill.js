// Episode: a real Master-vs-Master Cham-gonu game (AI self-play, game #273
// of a 400-game search for running mills). Red wins the placement half
// 11–8, then Blue's running mill on the bottom side captures nine turns in
// a row. `moves` are [from, to] exactly as the engine played them (from is
// null for placements and captures).
//
// `explain` pauses the game after `after` plies with highlights drawn on
// the board: rings around points, mills glowing, and shuttle arrows.
export default {
  game: 'cham',
  moves: [[null,4],[null,13],[null,0],[null,7],[null,2],[null,5],[null,21],[null,15],[null,3],[null,15],[null,14],[null,1],[null,7],[null,12],[null,21],[null,23],[null,17],[null,16],[null,18],[null,9],[null,6],[null,8],[null,6],[null,22],[null,19],[null,20],[null,11],[null,17],[null,10],[16,17],[null,5],[13,21],[null,8],[9,8],[21,13],[null,8],[4,5],[13,21],[null,5],[1,9],[21,13],[null,9],[3,4],[13,21],[null,11],[4,5],[21,13],[null,5],[2,3],[13,21],[null,19],[0,7],[21,13],[null,17],[7,6],[13,21],[null,3]],
  // Shown from Blue's seat — the side that comes back to win — so the site's
  // own result banner at the end reads as a win.
  names: { me: 'grandmaster', opponent: 'gonu38', myColor: 'B', myStats: { wins: 41, draws: 3, losses: 9 } },
  intro: {
    ko: { title: '참고누, 들어보셨나요?', body: '한국 전통 고누 중 가장 묵직한 게임이에요. 한 판을 같이 보면서, 승부를 가르는 기술 ‘왕복 꼰’을 알아볼게요.' },
    en: { title: 'Ever heard of Cham-gonu?', body: "It's the deepest of Korea's traditional Gonu games. Let's watch one game together — and the one trick that decides it: the running mill." },
  },
  shortsIntro: {
    ko: { title: '11 대 8에서 역전?', body: '배치에서 크게 밀린 파랑이 이기는 방법 — 참고누의 ‘왕복 꼰’' },
    en: { title: 'Down 8 to 11… and still wins?', body: 'How Blue turns a lost Cham-gonu game around: the running mill.' },
  },
  explain: [
    {
      after: 1,
      rings: [{ points: [0, 2, 4, 6], color: 'gold' }],
      ko: { tag: '첫 수', title: '첫 수는 바깥 모서리에만!', body: '참고누는 첫 수를 바깥 사각형 모서리 네 곳 중 하나에만 둘 수 있어요. 빨강은 오른쪽 아래 모서리로 시작!' },
      en: { tag: 'Move 1', title: 'The first move goes on an outer corner', body: 'Cham-gonu only lets the opening move land on one of the four outer corners. Red starts bottom-right.' },
    },
    {
      after: 10,
      mills: [[2, 3, 4]],
      rings: [{ points: [15], color: 'red' }],
      ko: { tag: '꼰', title: '한 줄에 셋 = 꼰!', body: '빨강이 오른쪽 변에 셋을 나란히 놨어요. 이게 ‘꼰’이고, 꼰을 만들면 상대 말 하나를 잡아요. 잡힌 자리엔 ×(말뚝)가 박혀서 배치가 끝날 때까지 아무도 못 써요.' },
      en: { tag: 'Mill', title: 'Three in a row = a mill', body: "Red lines up three on the right side — that's a mill, and every mill captures one enemy piece. The captured point gets an ×: nobody can place there for the rest of the first half." },
    },
    {
      after: 23,
      mills: [[0, 8, 16]],
      ko: { tag: '대각선', title: '대각선도 꼰이 돼요', body: '왼쪽 위 모서리부터 안쪽까지 대각선 셋! 서양 모리스 게임엔 없는 참고누만의 줄이에요. 빨강은 벌써 세 번째 꼰.' },
      en: { tag: 'Diagonals', title: 'Diagonals count too', body: "Top-left corner, straight down the diagonal — another mill. Western Morris games don't have these lines. That's Red's third mill already." },
    },
    {
      after: 26,
      tagTone: 'alert',
      rings: [{ points: [12, 13, 14, 20, 22], color: 'blue' }, { points: [21], color: 'gold' }],
      arrows: [{ from: 13, to: 21 }],
      ko: { tag: '잠깐!', title: '파랑 아래쪽을 보세요', body: '가운데 아래 변 셋, 안쪽 아래 양 끝, 그리고 둘을 잇는 다리 하나. 이게 ‘왕복 꼰’ 틀이에요. 다리 끝 빈자리는 아까 파랑이 빨강 말을 잡아서 생긴 자리고요.' },
      en: { tag: 'Wait!', title: "Look at Blue's bottom side", body: "Three on the middle bottom side, both ends of the inner bottom side, and one bridge between them. That's a running-mill frame — and the gap at the end of the bridge is where Blue captured a red piece earlier." },
    },
    {
      after: 29,
      ko: { tag: '배치 끝', title: '11 대 8. 빨강 승리 각?', body: '빨강은 배치 단계에서 꼰을 네 번이나 만들어 크게 앞섰어요. 이제부턴 말을 옮기는 후반전. 파랑의 아래쪽, 기억하시죠?' },
      en: { tag: 'Halftime', title: '11 vs 8. Red has this, right?', body: "Red built four mills while placing and is way ahead. Now the second half starts: pieces slide instead of being placed. Remember Blue's bottom side?" },
    },
    {
      after: 36,
      tagTone: 'alert',
      mills: [[12, 13, 14], [20, 21, 22]],
      arrows: [{ from: 13, to: 21 }],
      ko: { tag: '왕복 꼰', title: '이게 바로 왕복 꼰!', body: '파랑은 말 하나를 다리 위로 내렸다 올렸다만 해요. 내려가면 안쪽 꼰, 올라오면 가운데 꼰. 움직일 때마다 꼰이 생기니 매 턴 빨강 말이 하나씩 사라져요.' },
      en: { tag: 'Running mill', title: 'This is the running mill!', body: 'Blue just slides one piece down the bridge and back. Down: inner mill. Up: middle mill. Every single move closes a mill, so Red loses a piece every turn.' },
    },
    {
      after: 39,
      rings: [{ points: [5], color: 'red' }, { points: [13, 21], color: 'gold' }],
      ko: { tag: '막아볼까?', title: '틈을 막으려다…', body: '빨강이 빈자리 옆으로 와서 길을 막으려 했지만, 파랑은 바로 그 말부터 잡아버려요. 안쪽 빈자리는 주변이 전부 파랑이라 들어갈 길조차 없고요.' },
      en: { tag: 'Block it?', title: 'Trying to plug the gap…', body: "Red slides next to the gap to block it — and Blue simply captures that piece first. The inner gap is surrounded by blue pieces, so Red can't even reach it." },
    },
    {
      after: 57,
      ko: { tag: '결과', title: '아홉 번 연속 잡기, 파랑 역전승', body: '빨강은 2개만 남아 패배. 교훈은 하나예요. 배치 단계에서 왕복 꼰 틀을 먼저 짓거나, 상대 틀의 한 칸을 먼저 차지하세요.' },
      en: { tag: 'Result', title: 'Nine captures in a row — Blue comes back to win', body: 'Red is down to two pieces and loses. One lesson: during placement, build a running-mill frame first — or take one point of your opponent’s before it’s finished.' },
    },
  ],
  outro: {
    ko: { title: '친구들과 즐거운 고누 한 판 어때요?', body: 'playgonu.com 에서 바로 시작하세요. 링크 하나로 친구를 초대할 수 있어요.' },
    en: { title: 'How about a fun game of Gonu with friends?', body: 'Start right away at playgonu.com — invite a friend with a single link.' },
  },
};
