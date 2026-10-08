// What a virtual opponent says back in chat. Short, casual, never rude —
// and if someone keeps talking mid-game it tells them, playfully, to just
// play. Replies match the language the person wrote in (Korean if their
// message has Hangul, otherwise English). Pure functions: the room decides
// when to call them and adds a typing delay.

const HANGUL = /[ㄱ-ㆎ가-힣]/;
export const isKorean = (text) => HANGUL.test(String(text || ''));

const LINES = {
  ko: {
    greet: ['안녕하세요 ㅎㅎ', 'ㅎㅇ 잘 부탁해요', '반가워요~ 한 판 해요'],
    gg: ['gg 수고했어요', 'ㅈㅈ 재밌었어요', 'gg ㅎㅎ'],
    praise: ['ㅎㅎ 감사', '운이 좋았네요 ㅋ', '오 감사합니다'],
    laugh: ['ㅋㅋㅋ', 'ㅋㅋ', 'ㅎㅎㅎ'],
    question: ['글쎄요 ㅎ', '음.. 두고 보면 알겠죠 ㅋ', '비밀이에요 ㅋㅋ'],
    generic: ['ㅎㅎ', '넵', '오케이', 'ㅇㅇ'],
    chatty: ['겜이나 해 ㅋㅋ', '말보다 수로 말해요 ㅋㅋ', '집중 좀 하자 ㅎㅎ', '지금 수 읽는 중이에요..'],
    winGG: ['gg 재밌었어요', 'gg ㅎㅎ 한 판 더?', '휴 아슬아슬했네요 gg'],
    loseGG: ['gg 잘 두시네요 ㄷㄷ', '와 졌다 ㅋㅋ gg', 'gg 다음엔 안 져요 ㅋ'],
  },
  en: {
    greet: ['hi! good luck', 'hey 👋', 'hello, have fun'],
    gg: ['gg', 'gg, fun game', 'gg wp'],
    praise: ['thanks :)', 'haha got lucky', 'ty!'],
    laugh: ['lol', 'haha', '😄'],
    question: ['hmm, we’ll see', 'secret 😄', 'maybe?'],
    generic: ['ok', ':)', 'sure', 'yep'],
    chatty: ['less talk, more moves 😄', 'focus! 😄', 'shh, thinking…', 'play first, chat later lol'],
    winGG: ['gg, fun one', 'gg! another?', 'close one, gg'],
    loseGG: ['gg, well played', 'wow you got me, gg', 'gg — rematch?'],
  },
};

function kindOf(text) {
  const t = String(text).toLowerCase();
  if (/(^|\s)(gg|ㅈㅈ|ggwp)(\s|$)|수고|잘\s?했|good game/.test(t)) return 'gg';
  if (/안녕|하이|ㅎㅇ|반가|\b(hi|hello|hey|yo)\b/.test(t)) return 'greet';
  if (/잘\s?두|잘\s?하|고수|굿|대박|nice|good|great|wow/.test(t)) return 'praise';
  if (/ㅋㅋ|ㅎㅎ|lol|haha|lmao/.test(t)) return 'laugh';
  if (/\?|？/.test(t)) return 'question';
  return 'generic';
}

const pick = (list, rand) => list[Math.floor(rand() * list.length) % list.length];

// state: { recent: [timestamps of the person's messages], lastReplyAt }
// Returns the reply text, or null to stay quiet.
// `roomLang` is the language the room was made in; without one, the bot
// answers in the language it was spoken to.
export function botChatReply(text, state, { now = Date.now(), rand = Math.random, roomLang } = {}) {
  const lang = roomLang === 'ko' || roomLang === 'en' ? roomLang : isKorean(text) ? 'ko' : 'en';
  state.recent = (state.recent || []).filter((t) => now - t < 45000);
  state.recent.push(now);
  // It doesn't answer everything — at most one reply per 30s, often none.
  if (state.lastReplyAt && now - state.lastReplyAt < 30000) return null;
  let line = null;
  if (state.recent.length >= 3) {
    if (rand() < 0.6) line = pick(LINES[lang].chatty, rand);
  } else {
    const kind = kindOf(text);
    const chance = kind === 'generic' ? 0.12 : state.replies ? 0.35 : 0.6;
    if (rand() < chance) line = pick(LINES[lang][kind], rand);
  }
  if (line) {
    state.lastReplyAt = now;
    state.replies = (state.replies || 0) + 1;
  }
  return line;
}

// A line after the game, from the bot's side (it won or lost); null = silent.
export function botGameOverLine(botWon, lang, rand = Math.random) {
  if (rand() > 0.6) return null;
  return pick(LINES[lang === 'ko' ? 'ko' : 'en'][botWon ? 'winGG' : 'loseGG'], rand);
}
