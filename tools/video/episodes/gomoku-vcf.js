// Gomoku puzzles from real AI games (games 0, 1, 15): win in three by consecutive fours.
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
 "scenes": [
  {
   "moves": [
    [
     null,
     112
    ],
    [
     null,
     110
    ],
    [
     null,
     96
    ],
    [
     null,
     80
    ],
    [
     null,
     95
    ],
    [
     null,
     94
    ],
    [
     null,
     97
    ],
    [
     null,
     98
    ],
    [
     null,
     82
    ],
    [
     null,
     127
    ],
    [
     null,
     68
    ],
    [
     null,
     126
    ],
    [
     null,
     54
    ],
    [
     null,
     40
    ],
    [
     null,
     142
    ],
    [
     null,
     67
    ],
    [
     null,
     128
    ],
    [
     null,
     78
    ],
    [
     null,
     62
    ],
    [
     null,
     144
    ],
    [
     null,
     114
    ],
    [
     null,
     100
    ],
    [
     null,
     113
    ],
    [
     null,
     115
    ],
    [
     null,
     81
    ],
    [
     null,
     129
    ],
    [
     null,
     66
    ],
    [
     null,
     111
    ],
    [
     null,
     51
    ],
    [
     null,
     36
    ],
    [
     null,
     53
    ],
    [
     null,
     52
    ],
    [
     null,
     38
    ],
    [
     null,
     83
    ],
    [
     null,
     23
    ],
    [
     null,
     8
    ],
    [
     null,
     65
    ],
    [
     null,
     49
    ],
    [
     null,
     37
    ],
    [
     null,
     9
    ],
    [
     null,
     79
    ]
   ],
   "from": 34,
   "cut": {
    "ko": {
     "title": "퍼즐 1",
     "body": "3수 안에 이기는 길은?"
    },
    "en": {
     "title": "Puzzle 1",
     "body": "Win within three moves"
    }
   },
   "question": {
    "ko": "흑 차례! <em>3수</em> 안에 이기려면?",
    "en": "Black to move — win in <em>3</em>?"
   }
  },
  {
   "moves": [
    [
     null,
     112
    ],
    [
     null,
     110
    ],
    [
     null,
     96
    ],
    [
     null,
     80
    ],
    [
     null,
     95
    ],
    [
     null,
     94
    ],
    [
     null,
     97
    ],
    [
     null,
     126
    ],
    [
     null,
     142
    ],
    [
     null,
     78
    ],
    [
     null,
     62
    ],
    [
     null,
     127
    ],
    [
     null,
     98
    ],
    [
     null,
     99
    ],
    [
     null,
     128
    ],
    [
     null,
     79
    ],
    [
     null,
     81
    ],
    [
     null,
     109
    ],
    [
     null,
     64
    ],
    [
     null,
     124
    ],
    [
     null,
     139
    ],
    [
     null,
     77
    ],
    [
     null,
     76
    ],
    [
     null,
     125
    ],
    [
     null,
     123
    ],
    [
     null,
     93
    ],
    [
     null,
     61
    ],
    [
     null,
     141
    ]
   ],
   "from": 21,
   "cut": {
    "ko": {
     "title": "퍼즐 2",
     "body": "3수 안에 이기는 길은?"
    },
    "en": {
     "title": "Puzzle 2",
     "body": "Win within three moves"
    }
   },
   "question": {
    "ko": "백 차례! <em>3수</em> 안에 이기려면?",
    "en": "White to move — win in <em>3</em>?"
   }
  },
  {
   "moves": [
    [
     null,
     112
    ],
    [
     null,
     84
    ],
    [
     null,
     113
    ],
    [
     null,
     114
    ],
    [
     null,
     97
    ],
    [
     null,
     99
    ],
    [
     null,
     129
    ],
    [
     null,
     145
    ],
    [
     null,
     127
    ],
    [
     null,
     82
    ],
    [
     null,
     81
    ],
    [
     null,
     65
    ],
    [
     null,
     128
    ],
    [
     null,
     130
    ],
    [
     null,
     142
    ],
    [
     null,
     157
    ],
    [
     null,
     98
    ],
    [
     null,
     83
    ],
    [
     null,
     126
    ],
    [
     null,
     125
    ],
    [
     null,
     158
    ],
    [
     null,
     143
    ],
    [
     null,
     110
    ],
    [
     null,
     94
    ],
    [
     null,
     174
    ]
   ],
   "from": 18,
   "cut": {
    "ko": {
     "title": "퍼즐 3",
     "body": "3수 안에 이기는 길은?"
    },
    "en": {
     "title": "Puzzle 3",
     "body": "Win within three moves"
    }
   },
   "question": {
    "ko": "흑 차례! <em>3수</em> 안에 이기려면?",
    "en": "Black to move — win in <em>3</em>?"
   }
  }
 ],
 "hook": {
  "scene": 0,
  "at": 34,
  "plies": 0,
  "caption": {
   "ko": "3초 안에 <em>풀 수</em> 있을까요?",
   "en": "Can you <em>solve</em> it in 3 seconds?"
  },
  "after": {
   "ko": {
    "title": "오목 퍼즐: 4로 몰아붙이기",
    "body": "연속 4로 3수 만에 이기기"
   },
   "en": {
    "title": "Gomoku puzzles: keep making fours",
    "body": "Win in three with forcing fours"
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
   "after": 35,
   "rings": [
    {
     "color": "gold",
     "points": [
      23
     ]
    },
    {
     "color": "red",
     "points": [
      8
     ]
    }
   ],
   "ko": {
    "tag": "1수",
    "title": "먼저 4로 몰아붙이기",
    "body": "상대는 한 곳만 막을 수 있어요."
   },
   "en": {
    "tag": "Move 1",
    "title": "Start with a four",
    "body": "The reply is forced — one point to block."
   }
  },
  {
   "scene": 0,
   "after": 39,
   "rings": [
    {
     "color": "gold",
     "points": [
      9,
      79
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "3수",
    "title": "5목 자리가 두 군데!",
    "body": "한 번에 둘 다 막을 수는 없어요."
   },
   "en": {
    "tag": "Move 3",
    "title": "Two ways to make five!",
    "body": "Nobody can block both at once."
   }
  },
  {
   "scene": 1,
   "after": 26,
   "rings": [
    {
     "color": "gold",
     "points": [
      61,
      141
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "3수",
    "title": "5목 자리가 두 군데!",
    "body": "한 번에 둘 다 막을 수는 없어요."
   },
   "en": {
    "tag": "Move 3",
    "title": "Two ways to make five!",
    "body": "Nobody can block both at once."
   }
  },
  {
   "scene": 2,
   "after": 23,
   "rings": [
    {
     "color": "gold",
     "points": [
      94,
      174
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "3수",
    "title": "5목 자리가 두 군데!",
    "body": "한 번에 둘 다 막을 수는 없어요."
   },
   "en": {
    "tag": "Move 3",
    "title": "Two ways to make five!",
    "body": "Nobody can block both at once."
   }
  }
 ]
};
