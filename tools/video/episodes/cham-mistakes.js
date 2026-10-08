// Cham-gonu: three beginner mistakes from real games (1@14, 1@32, 260 end).
// Generated from real AI-vs-AI games (scratchpad cham-episodes.mjs, 2026-10-08).
// Point numbering: outer square 0–7, middle 8–15, inner 16–23, clockwise from top-left.
export default {
 "page": "index.html",
 "engine": "chamgonu",
 "board": {
  "kind": "cham"
 },
 "pieceR": 13,
 "explainZoom": 1.5,
 "scenes": [
  {
   "moves": [
    [
     null,
     2
    ],
    [
     null,
     14
    ],
    [
     null,
     5
    ],
    [
     null,
     7
    ],
    [
     null,
     1
    ],
    [
     null,
     6
    ],
    [
     null,
     0
    ],
    [
     null,
     6
    ],
    [
     null,
     19
    ],
    [
     null,
     11
    ],
    [
     null,
     8
    ],
    [
     null,
     15
    ],
    [
     null,
     10
    ],
    [
     null,
     9
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
     19
    ]
   ],
   "from": 14,
   "cut": {
    "ko": {
     "title": "실수 ① 두 개 줄 방치",
     "body": "전반, 놓는 단계"
    },
    "en": {
     "title": "Mistake 1: ignoring two in a row",
     "body": "First half, placing"
    }
   }
  },
  {
   "moves": [
    [
     null,
     2
    ],
    [
     null,
     14
    ],
    [
     null,
     5
    ],
    [
     null,
     7
    ],
    [
     null,
     1
    ],
    [
     null,
     6
    ],
    [
     null,
     0
    ],
    [
     null,
     6
    ],
    [
     null,
     19
    ],
    [
     null,
     11
    ],
    [
     null,
     8
    ],
    [
     null,
     15
    ],
    [
     null,
     10
    ],
    [
     null,
     9
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
     19
    ],
    [
     null,
     22
    ],
    [
     null,
     16
    ],
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
     3
    ],
    [
     null,
     12
    ],
    [
     null,
     18
    ],
    [
     null,
     21
    ],
    [
     null,
     14
    ],
    [
     null,
     20
    ],
    [
     15,
     14
    ],
    [
     null,
     8
    ],
    [
     23,
     15
    ],
    [
     9,
     8
    ],
    [
     null,
     15
    ],
    [
     10,
     9
    ],
    [
     2,
     10
    ],
    [
     null,
     9
    ]
   ],
   "from": 32,
   "cut": {
    "ko": {
     "title": "실수 ② 꼰 자리 열어주기",
     "body": "후반, 옮기는 단계"
    },
    "en": {
     "title": "Mistake 2: opening a mill point",
     "body": "Second half, moving"
    }
   }
  },
  {
   "moves": [
    [
     null,
     0
    ],
    [
     null,
     18
    ],
    [
     null,
     11
    ],
    [
     null,
     8
    ],
    [
     null,
     4
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
     12
    ],
    [
     null,
     6
    ],
    [
     null,
     2
    ],
    [
     null,
     10
    ],
    [
     null,
     9
    ],
    [
     null,
     1
    ],
    [
     null,
     23
    ],
    [
     null,
     13
    ],
    [
     null,
     3
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
     5
    ],
    [
     null,
     16
    ],
    [
     null,
     7
    ],
    [
     null,
     15
    ],
    [
     null,
     21
    ],
    [
     null,
     14
    ],
    [
     null,
     22
    ],
    [
     17,
     16
    ],
    [
     18,
     17
    ],
    [
     10,
     18
    ],
    [
     9,
     10
    ],
    [
     1,
     9
    ],
    [
     2,
     1
    ]
   ],
   "from": 27,
   "cut": {
    "ko": {
     "title": "실수 ③ 내 말 가두기",
     "body": "말이 많아도 질 수 있어요"
    },
    "en": {
     "title": "Mistake 3: boxing yourself in",
     "body": "You can lose with pieces to spare"
    }
   }
  }
 ],
 "hook": {
  "scene": 2,
  "at": 27,
  "plies": 4,
  "caption": {
   "ko": "말이 12개인데 <em>졌다</em>?!",
   "en": "12 pieces left — and <em>lost</em>?!"
  },
  "after": {
   "ko": {
    "title": "참고누 초보 실수 3가지",
    "body": "이것만 피해도 훨씬 강해져요"
   },
   "en": {
    "title": "Three Cham-gonu beginner mistakes",
    "body": "Avoid these and you’ll win more"
   }
  }
 },
 "outro": {
  "ko": {
   "title": "친구들과 즐거운 고누 한 판 어때요?",
   "body": "playgonu.com 에서 친구를 초대해 보세요"
  },
  "en": {
   "title": "How about a fun game of Gonu with friends?",
   "body": "Invite a friend at playgonu.com"
  }
 },
 "explain": [
  {
   "scene": 0,
   "after": 14,
   "lines": [
    [
     1,
     9,
     17
    ]
   ],
   "rings": [
    {
     "color": "red",
     "points": [
      1,
      9
     ]
    },
    {
     "color": "gold",
     "points": [
      17
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "주의",
    "title": "빨강 두 개가 한 줄!",
    "body": "남은 빈칸을 막지 않으면…"
   },
   "en": {
    "tag": "Watch out",
    "title": "Red has two in a line!",
    "body": "Leave the last point open, and…"
   }
  },
  {
   "scene": 0,
   "after": 17,
   "lines": [
    [
     1,
     9,
     17
    ]
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "실수",
    "title": "바로 꼰, 바로 잡혀요",
    "body": "상대 두 개 줄은 보이는 즉시 막아요."
   },
   "en": {
    "tag": "Mistake",
    "title": "Mill — and a piece gone",
    "body": "Block an opponent’s two-in-a-row as soon as you see it."
   }
  },
  {
   "scene": 1,
   "after": 33,
   "rings": [
    {
     "color": "gold",
     "points": [
      10
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "주의",
    "title": "방금 비운 자리",
    "body": "상대가 이 자리로 오면 꼰이 돼요."
   },
   "en": {
    "tag": "Watch out",
    "title": "The point you just left",
    "body": "If your opponent slides in here, it’s a mill."
   }
  },
  {
   "scene": 1,
   "after": 35,
   "tagTone": "alert",
   "ko": {
    "tag": "실수",
    "title": "옮기기 전에 확인!",
    "body": "내가 비운 자리가 상대 꼰 자리인지 먼저 봐요."
   },
   "en": {
    "tag": "Mistake",
    "title": "Look before you slide",
    "body": "Check whether the point you leave completes a mill for them."
   }
  },
  {
   "scene": 2,
   "after": 31,
   "rings": [
    {
     "color": "red",
     "points": [
      0,
      4,
      5,
      6,
      9,
      11,
      13,
      14,
      15,
      16,
      18,
      20
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "실수",
    "title": "빨강, 움직일 곳이 없어요",
    "body": "말이 12개나 남았는데 졌어요. 빈칸 쪽으로 길을 남겨 두세요."
   },
   "en": {
    "tag": "Mistake",
    "title": "Red has no move left",
    "body": "12 pieces left — and still lost. Keep a path to empty points."
   }
  }
 ]
};
