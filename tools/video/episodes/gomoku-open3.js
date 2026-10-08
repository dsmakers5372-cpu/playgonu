// Gomoku: block an open three at once — the miss and the fix.
// Generated from engine-checked positions (scratchpad gomoku-episodes.mjs, 2026-10-08).
// Points: 15×15 grid, index = row * 15 + col.
export default {
 "page": "gomoku.html",
 "engine": "gomoku",
 "board": {
  "kind": "grid",
  "rows": 15,
  "cols": 15,
  "margin": 14
 },
 "pieceR": 11,
 "doubleTap": true,
 "explainZoom": 2.1,
 "tight": true,
 "noWin": true,
 "scenes": [
  {
   "moves": [
    [
     null,
     84
    ],
    [
     null,
     112
    ],
    [
     null,
     128
    ],
    [
     null,
     113
    ],
    [
     null,
     96
    ],
    [
     null,
     111
    ],
    [
     null,
     64
    ],
    [
     null,
     114
    ],
    [
     null,
     110
    ],
    [
     null,
     115
    ]
   ],
   "from": 6,
   "cut": {
    "ko": {
     "title": "열린 3, 놓치면?",
     "body": "흑이 딴 데 두면…"
    },
    "en": {
     "title": "Miss an open three…",
     "body": "Black plays elsewhere."
    }
   }
  },
  {
   "moves": [
    [
     null,
     84
    ],
    [
     null,
     112
    ],
    [
     null,
     128
    ],
    [
     null,
     113
    ],
    [
     null,
     96
    ],
    [
     null,
     111
    ],
    [
     null,
     114
    ],
    [
     null,
     110
    ],
    [
     null,
     109
    ]
   ],
   "from": 6,
   "cut": {
    "ko": {
     "title": "이번엔 바로 막기",
     "body": "같은 자리에서 다시"
    },
    "en": {
     "title": "Now block it at once",
     "body": "Same position, take two"
    }
   }
  }
 ],
 "hook": {
  "scene": 0,
  "at": 7,
  "plies": 3,
  "caption": {
   "ko": "한 수 늦으면 <em>끝</em>?!",
   "en": "One move late — <em>game over</em>?!"
  },
  "after": {
   "ko": {
    "title": "열린 3은 바로 막기",
    "body": "오목 수비의 기본"
   },
   "en": {
    "title": "Block an open three at once",
    "body": "Gomoku defence, step one"
   }
  }
 },
 "outro": {
  "ko": {
   "title": "친구들과 즐거운 오목 한 판 어때요?",
   "body": "playgonu.com 에서 바로 둘 수 있어요"
  },
  "en": {
   "title": "How about a game of Gomoku with friends?",
   "body": "Play it right now at playgonu.com"
  }
 },
 "explain": [
  {
   "scene": 0,
   "after": 6,
   "rings": [
    {
     "color": "dark",
     "points": [
      111,
      112,
      113
     ]
    },
    {
     "color": "gold",
     "points": [
      110,
      114
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "경고",
    "title": "백의 열린 3!",
    "body": "양 끝이 비어 있는 3이에요."
   },
   "en": {
    "tag": "Warning",
    "title": "White has an open three!",
    "body": "Three in a row with both ends empty."
   }
  },
  {
   "scene": 0,
   "after": 8,
   "lines": [
    [
     111,
     114
    ]
   ],
   "rings": [
    {
     "color": "gold",
     "points": [
      110,
      115
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "늦었어요",
    "title": "열린 4 — 못 막아요",
    "body": "양쪽 끝을 한 번에 막을 수 없어요."
   },
   "en": {
    "tag": "Too late",
    "title": "An open four — unstoppable",
    "body": "You can’t block both ends at once."
   }
  },
  {
   "scene": 1,
   "after": 7,
   "rings": [
    {
     "color": "gold",
     "points": [
      114
     ]
    }
   ],
   "ko": {
    "tag": "정답",
    "title": "한쪽 끝을 막아요",
    "body": "이제 백이 4를 만들어도 한 군데만 막으면 돼요."
   },
   "en": {
    "tag": "Right",
    "title": "Block one end",
    "body": "Now any four has a single point to block."
   }
  },
  {
   "scene": 1,
   "after": 9,
   "rings": [
    {
     "color": "gold",
     "points": [
      109
     ]
    }
   ],
   "ko": {
    "tag": "정리",
    "title": "열린 3은 보자마자 막기",
    "body": "막으면서 내 줄도 만들면 더 좋아요."
   },
   "en": {
    "tag": "Takeaway",
    "title": "Block an open three on sight",
    "body": "Even better: block with a stone that builds your own line."
   }
  }
 ]
};
