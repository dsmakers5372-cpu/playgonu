// Episode: a real Master-vs-Master Cham-gonu game (AI self-play, game #273
// of a 400-game search for running mills). Red wins the placement half
// 11–8, then Blue's running mill on the bottom side captures nine turns in
// a row. `moves` are [from, to] exactly as the engine played them (from is
// null for placements and captures).
//
// Opens on the hook (moves 38–42: two shuttles, two captures), then rewinds.
// `explain` pauses the game after `after` plies with highlights drawn on
// the board: rings around points, mills glowing, and shuttle arrows.
// Shown from Blue's seat — the side that comes back to win.
export default {
  game: "cham",
  moves: [
    [
      null,
      4
    ],
    [
      null,
      13
    ],
    [
      null,
      0
    ],
    [
      null,
      7
    ],
    [
      null,
      2
    ],
    [
      null,
      5
    ],
    [
      null,
      21
    ],
    [
      null,
      15
    ],
    [
      null,
      3
    ],
    [
      null,
      15
    ],
    [
      null,
      14
    ],
    [
      null,
      1
    ],
    [
      null,
      7
    ],
    [
      null,
      12
    ],
    [
      null,
      21
    ],
    [
      null,
      23
    ],
    [
      null,
      17
    ],
    [
      null,
      16
    ],
    [
      null,
      18
    ],
    [
      null,
      9
    ],
    [
      null,
      6
    ],
    [
      null,
      8
    ],
    [
      null,
      6
    ],
    [
      null,
      22
    ],
    [
      null,
      19
    ],
    [
      null,
      20
    ],
    [
      null,
      11
    ],
    [
      null,
      17
    ],
    [
      null,
      10
    ],
    [
      16,
      17
    ],
    [
      null,
      5
    ],
    [
      13,
      21
    ],
    [
      null,
      8
    ],
    [
      9,
      8
    ],
    [
      21,
      13
    ],
    [
      null,
      8
    ],
    [
      4,
      5
    ],
    [
      13,
      21
    ],
    [
      null,
      5
    ],
    [
      1,
      9
    ],
    [
      21,
      13
    ],
    [
      null,
      9
    ],
    [
      3,
      4
    ],
    [
      13,
      21
    ],
    [
      null,
      11
    ],
    [
      4,
      5
    ],
    [
      21,
      13
    ],
    [
      null,
      5
    ],
    [
      2,
      3
    ],
    [
      13,
      21
    ],
    [
      null,
      19
    ],
    [
      0,
      7
    ],
    [
      21,
      13
    ],
    [
      null,
      17
    ],
    [
      7,
      6
    ],
    [
      13,
      21
    ],
    [
      null,
      3
    ]
  ],
  names: {
    me: "grandmaster",
    opponent: "gonu38",
    myColor: "B",
    myStats: {
      wins: 41,
      draws: 3,
      losses: 9
    }
  },
  hook: {
    at: 37,
    plies: 5,
    caption: {
      ko: "11 대 8에서 <em>역전</em>한 비결?!",
      en: "Down 8–11… how did Blue <em>win</em>?!"
    }
  },
  intro: {
    ko: {
      title: "참고누 필승 전략, 왕복 꼰",
      body: "처음부터 같이 볼까요?"
    },
    en: {
      title: "Cham-gonu’s winning trick: the running mill",
      body: "Let’s watch from the start."
    }
  },
  shortsIntro: {
    ko: {
      title: "비결은 왕복 꼰",
      body: "배치가 끝날 무렵부터 볼게요"
    },
    en: {
      title: "The trick: a running mill",
      body: "Let’s rewind to halftime."
    }
  },
  explain: [
    {
      after: 1,
      ko: {
        tag: "첫 수",
        title: "빨강이 먼저 시작해요",
        body: "첫 수는 아무 점에나 놓을 수 있어요."
      },
      en: {
        tag: "Move 1",
        title: "Red opens the game",
        body: "The first piece can go on any point."
      }
    },
    {
      after: 10,
      mills: [
        [
          2,
          3,
          4
        ]
      ],
      rings: [
        {
          points: [
            15
          ],
          color: "red"
        }
      ],
      ko: {
        tag: "꼰",
        title: "한 줄에 셋 = 꼰!",
        body: "꼰을 만들면 하나 잡아요. 그 자리는 ×."
      },
      en: {
        tag: "Mill",
        title: "Three in a row = a mill",
        body: "A mill takes a piece. That point becomes an ×."
      }
    },
    {
      after: 23,
      mills: [
        [
          0,
          8,
          16
        ]
      ],
      ko: {
        tag: "대각선",
        title: "대각선도 꼰!",
        body: "참고누만의 줄이에요. 빨강 벌써 세 번째 꼰."
      },
      en: {
        tag: "Diagonals",
        title: "Diagonals count too",
        body: "Only in Cham-gonu. Red’s third mill already."
      }
    },
    {
      after: 26,
      tagTone: "alert",
      rings: [
        {
          points: [
            12,
            13,
            14,
            20,
            22
          ],
          color: "blue"
        },
        {
          points: [
            21
          ],
          color: "gold"
        }
      ],
      arrows: [
        {
          from: 13,
          to: 21
        }
      ],
      ko: {
        tag: "잠깐!",
        title: "파랑 아래쪽을 보세요",
        body: "두 줄을 잇는 다리 하나 — 왕복 꼰 틀이에요."
      },
      en: {
        tag: "Wait!",
        title: "Look at Blue’s bottom side",
        body: "Two lines and one bridge — a running-mill frame."
      }
    },
    {
      after: 29,
      ko: {
        tag: "배치 끝",
        title: "11 대 8. 빨강 승리 각?",
        body: "이제 말을 옮기는 후반전이에요."
      },
      en: {
        tag: "Halftime",
        title: "11 vs 8. Red has this?",
        body: "Now the pieces start to move."
      }
    },
    {
      after: 36,
      tagTone: "alert",
      mills: [
        [
          12,
          13,
          14
        ],
        [
          20,
          21,
          22
        ]
      ],
      arrows: [
        {
          from: 13,
          to: 21
        }
      ],
      ko: {
        tag: "왕복 꼰",
        title: "이게 바로 왕복 꼰!",
        body: "내려가도 꼰, 올라와도 꼰. 매 턴 하나씩!"
      },
      en: {
        tag: "Running mill",
        title: "This is the running mill!",
        body: "Down: a mill. Up: a mill. A capture every turn!"
      }
    },
    {
      after: 39,
      rings: [
        {
          points: [
            5
          ],
          color: "red"
        },
        {
          points: [
            13,
            21
          ],
          color: "gold"
        }
      ],
      ko: {
        tag: "막아볼까?",
        title: "틈을 막으려다…",
        body: "막으러 온 말부터 잡혀요."
      },
      en: {
        tag: "Block it?",
        title: "Trying to plug the gap…",
        body: "The blocker is the next to go."
      }
    },
    {
      after: 57,
      ko: {
        tag: "결과",
        title: "아홉 번 연속, 파랑 역전승",
        body: "배치 때 왕복 꼰 틀을 먼저 지으세요!"
      },
      en: {
        tag: "Result",
        title: "Nine in a row — Blue wins",
        body: "Lesson: build a running-mill frame while placing!"
      }
    }
  ],
  outro: {
    ko: {
      title: "친구들과 즐거운 고누 한 판 어때요?",
      body: "playgonu.com 에서 친구를 초대해 보세요"
    },
    en: {
      title: "How about a fun game of Gonu with friends?",
      body: "Invite a friend at playgonu.com"
    }
  }
};
