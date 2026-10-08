// Gomoku: the four-three (4-3) winning shape — two constructed lessons.
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
 "lineOpacity": 0.22,
 "scenes": [
  {
   "moves": [
    [
     null,
     110
    ],
    [
     null,
     32
    ],
    [
     null,
     111
    ],
    [
     null,
     182
    ],
    [
     null,
     97
    ],
    [
     null,
     108
    ],
    [
     null,
     82
    ],
    [
     null,
     42
    ],
    [
     null,
     109
    ],
    [
     null,
     192
    ],
    [
     null,
     112
    ],
    [
     null,
     113
    ],
    [
     null,
     127
    ],
    [
     null,
     67
    ],
    [
     null,
     142
    ]
   ],
   "from": 10,
   "cut": {
    "ko": {
     "title": "오목 필승법, 4-3",
     "body": "4와 열린 3을 한 번에"
    },
    "en": {
     "title": "The winning shape: four-three",
     "body": "A four and an open three in one move"
    }
   }
  },
  {
   "moves": [
    [
     null,
     96
    ],
    [
     null,
     16
    ],
    [
     null,
     112
    ],
    [
     null,
     28
    ],
    [
     null,
     127
    ],
    [
     null,
     64
    ],
    [
     null,
     126
    ],
    [
     null,
     196
    ],
    [
     null,
     80
    ],
    [
     null,
     208
    ],
    [
     null,
     128
    ],
    [
     null,
     144
    ],
    [
     null,
     129
    ],
    [
     null,
     125
    ],
    [
     null,
     130
    ]
   ],
   "from": 10,
   "cut": {
    "ko": {
     "title": "모양이 달라도 같아요",
     "body": "대각선 4 + 가로 3"
    },
    "en": {
     "title": "Same idea, new shape",
     "body": "Diagonal four + straight three"
    }
   }
  }
 ],
 "hook": {
  "scene": 0,
  "at": 10,
  "plies": 3,
  "caption": {
   "ko": "막을 수 없는 <em>한 수</em>?!",
   "en": "The move that <em>can’t</em> be stopped?!"
  },
  "after": {
   "ko": {
    "title": "오목 필승법, 4-3",
    "body": "같이 볼까요?"
   },
   "en": {
    "title": "Gomoku’s winning shape: four-three",
    "body": "Let’s see how it works."
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
   "after": 10,
   "rings": [
    {
     "color": "gold",
     "points": [
      112
     ]
    }
   ],
   "lines": [
    [
     109,
     111
    ],
    [
     82,
     97
    ]
   ],
   "ko": {
    "tag": "흑 차례",
    "title": "이 한 칸이 승부처",
    "body": "여기 두면 4와 3이 동시에 생겨요."
   },
   "en": {
    "tag": "Black to move",
    "title": "This point decides it",
    "body": "A stone here makes a four and a three at once."
   }
  },
  {
   "scene": 0,
   "after": 11,
   "lines": [
    [
     109,
     112
    ],
    [
     82,
     112
    ]
   ],
   "rings": [
    {
     "color": "red",
     "points": [
      113
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "4-3",
    "title": "4-3 완성!",
    "body": "4는 바로 막아야 하고, 그사이 3이 열린 4가 돼요."
   },
   "en": {
    "tag": "Four-three",
    "title": "Four-three!",
    "body": "The four must be blocked now — meanwhile the three grows."
   }
  },
  {
   "scene": 0,
   "after": 13,
   "lines": [
    [
     82,
     127
    ]
   ],
   "rings": [
    {
     "color": "gold",
     "points": [
      67,
      142
     ]
    }
   ],
   "ko": {
    "tag": "열린 4",
    "title": "막을 곳이 두 군데",
    "body": "한쪽을 막으면 다른 쪽으로 5목."
   },
   "en": {
    "tag": "Open four",
    "title": "Two ends to block",
    "body": "Block one, and five lands on the other."
   }
  },
  {
   "scene": 1,
   "after": 11,
   "lines": [
    [
     80,
     128
    ],
    [
     126,
     128
    ]
   ],
   "rings": [
    {
     "color": "red",
     "points": [
      144
     ]
    }
   ],
   "ko": {
    "tag": "4-3",
    "title": "대각선 4 + 가로 3",
    "body": "줄 방향이 달라도 원리는 같아요."
   },
   "en": {
    "tag": "Four-three",
    "title": "Diagonal four + straight three",
    "body": "Any directions work the same way."
   }
  },
  {
   "scene": 1,
   "after": 15,
   "tagTone": "alert",
   "lines": [
    [
     126,
     130
    ]
   ],
   "ko": {
    "tag": "정리",
    "title": "4-3이면 이겨요!",
    "body": "내 4-3은 노리고, 상대 4-3은 미리 막아요."
   },
   "en": {
    "tag": "Takeaway",
    "title": "Four-three wins!",
    "body": "Aim for yours, and break up your opponent’s early."
   }
  }
 ]
};
