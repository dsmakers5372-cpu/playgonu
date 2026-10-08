// Cham-gonu: stopping a running mill by taking the gap — real games 12@33, 13@29.
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
 "noWin": true,
 "scenes": [
  {
   "moves": [
    [
     null,
     0
    ],
    [
     null,
     4
    ],
    [
     null,
     8
    ],
    [
     null,
     16
    ],
    [
     null,
     2
    ],
    [
     null,
     1
    ],
    [
     null,
     21
    ],
    [
     null,
     7
    ],
    [
     null,
     14
    ],
    [
     null,
     15
    ],
    [
     null,
     9
    ],
    [
     null,
     10
    ],
    [
     null,
     13
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
     20
    ],
    [
     null,
     22
    ],
    [
     null,
     14
    ],
    [
     null,
     6
    ],
    [
     null,
     12
    ],
    [
     null,
     3
    ],
    [
     null,
     19
    ],
    [
     null,
     17
    ],
    [
     null,
     18
    ],
    [
     null,
     5
    ],
    [
     null,
     11
    ],
    [
     null,
     20
    ],
    [
     6,
     14
    ],
    [
     19,
     20
    ],
    [
     null,
     14
    ],
    [
     21,
     13
    ],
    [
     11,
     19
    ],
    [
     null,
     13
    ],
    [
     3,
     11
    ]
   ],
   "from": 33,
   "cut": {
    "ko": {
     "title": "왕복 꼰 막는 법",
     "body": "빈칸을 먼저 차지하기"
    },
    "en": {
     "title": "How to stop a running mill",
     "body": "Take the empty point first"
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
     11
    ],
    [
     null,
     8
    ],
    [
     null,
     21
    ],
    [
     null,
     10
    ],
    [
     null,
     12
    ],
    [
     null,
     20
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
     21
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
     6
    ],
    [
     null,
     15
    ],
    [
     null,
     5
    ],
    [
     null,
     14
    ],
    [
     null,
     11
    ],
    [
     null,
     23
    ],
    [
     null,
     16
    ],
    [
     null,
     13
    ],
    [
     null,
     1
    ],
    [
     null,
     17
    ],
    [
     null,
     22
    ],
    [
     null,
     3
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
     10,
     11
    ],
    [
     18,
     10
    ],
    [
     22,
     21
    ],
    [
     23,
     22
    ]
   ],
   "from": 29,
   "cut": {
    "ko": {
     "title": "한 번 더",
     "body": "다른 판, 같은 방법"
    },
    "en": {
     "title": "Once more",
     "body": "Another game, same idea"
    }
   }
  }
 ],
 "hook": {
  "scene": 0,
  "at": 33,
  "plies": 1,
  "caption": {
   "ko": "왕복 꼰, <em>막을 수</em> 있다?!",
   "en": "A running mill <em>can</em> be stopped?!"
  },
  "after": {
   "ko": {
    "title": "왕복 꼰 막는 법",
    "body": "빈칸 하나가 승부를 갈라요"
   },
   "en": {
    "title": "How to stop a running mill",
    "body": "One empty point decides it"
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
   "after": 33,
   "lines": [
    [
     18,
     19,
     20
    ]
   ],
   "rings": [
    {
     "color": "blue",
     "points": [
      19
     ]
    },
    {
     "color": "gold",
     "points": [
      11
     ]
    }
   ],
   "arrows": [
    {
     "from": 19,
     "to": 11
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "위험",
    "title": "파랑의 왕복 꼰 틀!",
    "body": "저 말이 빈칸으로 오면 꼰, 돌아가도 꼰이에요."
   },
   "en": {
    "tag": "Danger",
    "title": "Blue’s running-mill frame!",
    "body": "Slide into the gap: a mill. Slide back: another mill."
   }
  },
  {
   "scene": 0,
   "after": 34,
   "rings": [
    {
     "color": "red",
     "points": [
      11
     ]
    }
   ],
   "ko": {
    "tag": "막기",
    "title": "빈칸을 먼저 차지!",
    "body": "왔다 갔다 할 자리가 없으면 왕복 꼰은 끝이에요."
   },
   "en": {
    "tag": "Block",
    "title": "Take the gap first!",
    "body": "No room to shuttle — no running mill."
   }
  },
  {
   "scene": 1,
   "after": 29,
   "lines": [
    [
     14,
     15,
     8
    ]
   ],
   "rings": [
    {
     "color": "red",
     "points": [
      14
     ]
    },
    {
     "color": "gold",
     "points": [
      22
     ]
    }
   ],
   "arrows": [
    {
     "from": 14,
     "to": 22
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "위험",
    "title": "빨강의 왕복 꼰 틀!",
    "body": "저 말이 빈칸으로 오면 꼰, 돌아가도 꼰이에요."
   },
   "en": {
    "tag": "Danger",
    "title": "Red’s running-mill frame!",
    "body": "Slide into the gap: a mill. Slide back: another mill."
   }
  },
  {
   "scene": 1,
   "after": 30,
   "rings": [
    {
     "color": "blue",
     "points": [
      22
     ]
    }
   ],
   "ko": {
    "tag": "막기",
    "title": "빈칸을 먼저 차지!",
    "body": "왔다 갔다 할 자리가 없으면 왕복 꼰은 끝이에요."
   },
   "en": {
    "tag": "Block",
    "title": "Take the gap first!",
    "body": "No room to shuttle — no running mill."
   }
  }
 ]
};
