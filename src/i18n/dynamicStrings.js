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
    drawExclaim: (n) => `Draw — ${n} moves with no capture and equal pieces`,
    countWinExclaim: (name, n) => `${name} wins! — ${n} moves with no capture, more pieces left`,
    toMoveLimitSoon: (name, left) => `${name} to move · more pieces wins in ${left}`,
    captured: (redN, blackN) => `Captured — Red: ${redN} · Black: ${blackN}`,
    noCaptures: 'No captures — trap your opponent to win',
  },
  ko: {
    playerName: { A: '빨강', B: '검정' },
    toMove: (name) => `${name} 차례`,
    wins: (name) => `${name} 승리`,
    winsExclaim: (name) => `${name} 승리!`,
    draw: '무승부',
    drawExclaim: (n) => `무승부 — ${n}수 동안 잡기가 없고 남은 말 수가 같아요`,
    countWinExclaim: (name, n) => `${name} 승리! — ${n}수 동안 잡기가 없어 말이 많은 쪽이 이겼어요`,
    toMoveLimitSoon: (name, left) => `${name} 차례 · ${left}수 뒤 말 많은 쪽 승리`,
    captured: (redN, blackN) => `잡은 말 — 빨강: ${redN} · 검정: ${blackN}`,
    noCaptures: '잡기 없음 — 상대를 가두면 승리',
  },
  es: {
    playerName: { A: 'Rojo', B: 'Negro' },
    toMove: (name) => `Turno de ${name}`,
    wins: (name) => `Gana ${name}`,
    winsExclaim: (name) => `¡Gana ${name}!`,
    draw: 'Empate',
    drawExclaim: (n) => `Empate — ${n} jugadas sin capturas y las mismas fichas`,
    countWinExclaim: (name, n) => `¡Gana ${name}! — ${n} jugadas sin capturas, más fichas en el tablero`,
    toMoveLimitSoon: (name, left) => `Turno de ${name} · en ${left} gana quien tenga más fichas`,
    captured: (redN, blackN) => `Capturadas — Rojo: ${redN} · Negro: ${blackN}`,
    noCaptures: 'Sin capturas — encierra a tu rival para ganar',
  },
  ja: {
    playerName: { A: '赤', B: '黒' },
    toMove: (name) => `${name}の番`,
    wins: (name) => `${name}の勝ち`,
    winsExclaim: (name) => `${name}の勝ち！`,
    draw: '引き分け',
    drawExclaim: (n) => `引き分け — ${n}手のあいだ駒取りなし、駒の数も同じ`,
    countWinExclaim: (name, n) => `${name}の勝ち！ — ${n}手のあいだ駒取りなし、駒が多い方の勝ち`,
    toMoveLimitSoon: (name, left) => `${name}の番 · あと${left}手で駒の多い方の勝ち`,
    captured: (redN, blackN) => `取った駒 — 赤: ${redN} · 黒: ${blackN}`,
    noCaptures: '駒取りなし — 相手を閉じ込めれば勝ち',
  },
  zh: {
    playerName: { A: '红方', B: '黑方' },
    toMove: (name) => `轮到${name}`,
    wins: (name) => `${name}获胜`,
    winsExclaim: (name) => `${name}获胜！`,
    draw: '平局',
    drawExclaim: (n) => `平局 — 连续${n}步无吃子，棋子数相同`,
    countWinExclaim: (name, n) => `${name}获胜！— 连续${n}步无吃子，棋子多者胜`,
    toMoveLimitSoon: (name, left) => `轮到${name} · ${left}步后棋子多的一方获胜`,
    captured: (redN, blackN) => `吃子 — 红: ${redN} · 黑: ${blackN}`,
    noCaptures: '无吃子 — 困住对手即可获胜',
  },
};

export function getDynamicStrings(lang) {
  return DYNAMIC_STRINGS[lang] || DYNAMIC_STRINGS.en;
}
