// What a virtual opponent says back in chat. This is a game, not a chat room:
// it only answers short game manners (a hello, a gg, a compliment on the play)
// and stays silent on everything else — questions, small talk, "who are you".
// Replies match the room's language (or the language it was spoken to). Pure
// functions: the room decides when to call them and adds a typing delay.

const HANGUL = /[ㄱ-ㆎ가-힣]/;
export const isKorean = (text) => HANGUL.test(String(text || ''));

const LINES = {
  ko: {
    greet: ['안녕하세요 ㅎㅎ', 'ㅎㅇ 잘 부탁해요', '반가워요~ 한 판 해요'],
    gg: ['gg 수고했어요', 'ㅈㅈ 재밌었어요', 'gg ㅎㅎ'],
    praise: ['ㅎㅎ 감사', '운이 좋았네요 ㅋ', '오 감사합니다'],
    winGG: ['gg 재밌었어요', 'gg ㅎㅎ 한 판 더?', '휴 아슬아슬했네요 gg'],
    loseGG: ['gg 잘 두시네요 ㄷㄷ', '와 졌다 ㅋㅋ gg', 'gg 다음엔 안 져요 ㅋ'],
  },
  en: {
    greet: ['hi! good luck', 'hey 👋', 'hello, have fun'],
    gg: ['gg', 'gg, fun game', 'gg wp'],
    praise: ['thanks :)', 'haha got lucky', 'ty!'],
    winGG: ['gg, fun one', 'gg! another?', 'close one, gg'],
    loseGG: ['gg, well played', 'wow you got me, gg', 'gg — rematch?'],
  },
};

// null = not game manners → no reply.
function kindOf(text) {
  const t = String(text).toLowerCase();
  if (/(^|\s)(gg|ㅈㅈ|ggwp)(\s|$)|수고|잘\s?했|good game/.test(t)) return 'gg';
  if (/안녕|하이|ㅎㅇ|반가|잘\s?부탁|\b(hi|hello|hey|yo|gl|good luck)\b/.test(t)) return 'greet';
  if (/잘\s?두|잘\s?하|고수|굿|대박|nice|good|great|wow/.test(t)) return 'praise';
  return null;
}

const pick = (list, rand) => list[Math.floor(rand() * list.length) % list.length];

// state: { lastReplyAt, replies }. Returns the reply text, or null to stay quiet.
// `roomLang` is the language the room was made in; without one, the bot
// answers in the language it was spoken to.
export function botChatReply(text, state, { now = Date.now(), rand = Math.random, roomLang } = {}) {
  const lang = roomLang === 'ko' || roomLang === 'en' ? roomLang : isKorean(text) ? 'ko' : 'en';
  const kind = kindOf(text);
  if (!kind) return null;
  // It doesn't answer everything — at most one reply per 30s, often none.
  if (state.lastReplyAt && now - state.lastReplyAt < 30000) return null;
  const chance = state.replies ? 0.35 : 0.6;
  if (rand() >= chance) return null;
  state.lastReplyAt = now;
  state.replies = (state.replies || 0) + 1;
  return pick(LINES[lang][kind], rand);
}

// A line after the game, from the bot's side (it won or lost); null = silent.
export function botGameOverLine(botWon, lang, rand = Math.random) {
  if (rand() > 0.6) return null;
  return pick(LINES[lang === 'ko' ? 'ko' : 'en'][botWon ? 'winGG' : 'loseGG'], rand);
}
