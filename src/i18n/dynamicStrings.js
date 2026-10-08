// Strings the game UI computes and updates at runtime (turn indicator, win
// banner, captured count). Static page copy (headings, rules text, nav)
// lives directly in each language's own HTML file instead — real translated
// markup reads better for SEO than JS-injected text.
export const DYNAMIC_STRINGS = {
  en: {
    playerName: { A: 'Red', B: 'Black' },
    toMove: (name) => `${name} to move`,
    wins: (name) => `${name} wins`,
    winsExclaim: (name) => `${name} wins!`,
    draw: 'Draw',
    drawExclaim: (n) => `Draw — ${n} moves with no capture`,
    toMoveDrawSoon: (name, left) => `${name} to move · draw in ${left}`,
    captured: (redN, blackN) => `Captured — Red: ${redN} · Black: ${blackN}`,
    noCaptures: 'No captures — trap your opponent to win',
  },
  ko: {
    playerName: { A: '빨강', B: '검정' },
    toMove: (name) => `${name} 차례`,
    wins: (name) => `${name} 승리`,
    winsExclaim: (name) => `${name} 승리!`,
    draw: '무승부',
    drawExclaim: (n) => `무승부 — ${n}수 동안 잡기 없음`,
    toMoveDrawSoon: (name, left) => `${name} 차례 · ${left}수 후 무승부`,
    captured: (redN, blackN) => `잡은 말 — 빨강: ${redN} · 검정: ${blackN}`,
    noCaptures: '잡기 없음 — 상대를 가두면 승리',
  },
};

export function getDynamicStrings(lang) {
  return DYNAMIC_STRINGS[lang] || DYNAMIC_STRINGS.en;
}
