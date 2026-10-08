// Gomoku (Renju rules): the three fouls for Black — double three, double four, overline — and White has none.
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
 "init": {
  "ruleset": "renju"
 },
 "noWin": true,
 "scenes": [
  {
   "moves": [
    [
     null,
     112
    ],
    [
     null,
     224
    ],
    [
     null,
     98
    ],
    [
     null,
     14
    ],
    [
     null,
     83
    ],
    [
     null,
     210
    ],
    [
     null,
     111
    ],
    [
     null,
     0
    ]
   ],
   "from": 8,
   "cut": {
    "ko": {
     "title": "렌주 금수 ① 삼삼",
     "body": "흑만 지키는 규칙"
    },
    "en": {
     "title": "Renju foul 1: double three",
     "body": "A rule for Black only"
    }
   }
  },
  {
   "moves": [
    [
     null,
     111
    ],
    [
     null,
     0
    ],
    [
     null,
     67
    ],
    [
     null,
     7
    ],
    [
     null,
     97
    ],
    [
     null,
     210
    ],
    [
     null,
     110
    ],
    [
     null,
     217
    ],
    [
     null,
     82
    ],
    [
     null,
     14
    ],
    [
     null,
     109
    ],
    [
     null,
     224
    ]
   ],
   "from": 12,
   "cut": {
    "ko": {
     "title": "렌주 금수 ② 사사",
     "body": "4가 두 개 동시에"
    },
    "en": {
     "title": "Renju foul 2: double four",
     "body": "Two fours at once"
    }
   }
  },
  {
   "moves": [
    [
     null,
     108
    ],
    [
     null,
     7
    ],
    [
     null,
     109
    ],
    [
     null,
     14
    ],
    [
     null,
     112
    ],
    [
     null,
     0
    ],
    [
     null,
     111
    ],
    [
     null,
     210
    ],
    [
     null,
     107
    ],
    [
     null,
     224
    ]
   ],
   "from": 10,
   "cut": {
    "ko": {
     "title": "렌주 금수 ③ 장목",
     "body": "6목 이상"
    },
    "en": {
     "title": "Renju foul 3: overline",
     "body": "Six or more in a row"
    }
   }
  },
  {
   "moves": [
    [
     null,
     14
    ],
    [
     null,
     98
    ],
    [
     null,
     210
    ],
    [
     null,
     111
    ],
    [
     null,
     7
    ],
    [
     null,
     112
    ],
    [
     null,
     224
    ],
    [
     null,
     83
    ],
    [
     null,
     0
    ],
    [
     null,
     113
    ]
   ],
   "from": 9,
   "cut": {
    "ko": {
     "title": "백은요?",
     "body": "백은 금수가 없어요"
    },
    "en": {
     "title": "And White?",
     "body": "White has no fouls"
    }
   }
  }
 ],
 "hook": {
  "scene": 0,
  "at": 8,
  "plies": 0,
  "caption": {
   "ko": "흑은 여기 <em>못</em> 둔다?!",
   "en": "Black <em>can’t</em> play here?!"
  },
  "after": {
   "ko": {
    "title": "렌주 금수 3가지",
    "body": "흑이 못 두는 자리"
   },
   "en": {
    "title": "The three Renju fouls",
    "body": "Where Black may not play"
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
   "after": 8,
   "poke": 113,
   "lines": [
    [
     111,
     113
    ],
    [
     83,
     113
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
    "tag": "금수",
    "title": "삼삼(3-3)",
    "body": "열린 3 두 개가 한 번에 생기는 자리. 흑은 못 둬요."
   },
   "en": {
    "tag": "Foul",
    "title": "Double three",
    "body": "A point that makes two open threes at once is off-limits to Black."
   }
  },
  {
   "scene": 1,
   "after": 12,
   "poke": 112,
   "lines": [
    [
     109,
     112
    ],
    [
     67,
     112
    ]
   ],
   "rings": [
    {
     "color": "red",
     "points": [
      112
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "금수",
    "title": "사사(4-4)",
    "body": "4가 두 개 동시에 생기는 자리도 흑은 못 둬요."
   },
   "en": {
    "tag": "Foul",
    "title": "Double four",
    "body": "Making two fours at once is also off-limits to Black."
   }
  },
  {
   "scene": 2,
   "after": 10,
   "poke": 110,
   "lines": [
    [
     107,
     112
    ]
   ],
   "rings": [
    {
     "color": "red",
     "points": [
      110
     ]
    }
   ],
   "tagTone": "alert",
   "ko": {
    "tag": "금수",
    "title": "장목(6목 이상)",
    "body": "흑은 정확히 5목만 이겨요. 6목은 금수예요."
   },
   "en": {
    "tag": "Foul",
    "title": "Overline",
    "body": "Black must make exactly five — six or more is a foul."
   }
  },
  {
   "scene": 3,
   "after": 10,
   "lines": [
    [
     111,
     113
    ],
    [
     83,
     113
    ]
   ],
   "rings": [
    {
     "color": "gold",
     "points": [
      113
     ]
    }
   ],
   "ko": {
    "tag": "백",
    "title": "백은 금수가 없어요",
    "body": "같은 모양도 백은 둘 수 있어요. 대신 흑이 먼저 둬요."
   },
   "en": {
    "tag": "White",
    "title": "White has no fouls",
    "body": "White may play the same shape — Black gets to move first instead."
   }
  }
 ]
};
