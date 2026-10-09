import {
  createInitialState,
  legalPlacements,
  forbiddenPoints,
  move,
  toIndex,
  toCoords,
  BOARD_SIZE,
  PLAYERS,
  RULESETS,
} from '../engine/gomoku.js';
import { chooseAIMove } from '../engine/gomokuAI.js';
import { THEMES, getStoredTheme, setStoredTheme, renderThemeSwatches, updateThemeSwatches } from './boardThemes.js';
import { el } from './svg.js';
import { mountShadowStone } from './shadowStone.js';
import { createGameStats, formatElapsed } from './gameStats.js';
import { playPlaceSound } from './sound.js';

const AI_MOVE_DELAY_MS = 450;

// Traditional Gomoku/Renju stone colors — Black moves first, White second
// (matching the real convention, unlike the Gonu variants' Red/Black).
const PLAYER_COLOR = {
  [PLAYERS.A]: { fill: '#242019', stroke: '#000000' },
  [PLAYERS.B]: { fill: '#F8F4E9', stroke: '#3A332C' },
};
const PLAYER_NAME = {
  en: { A: 'Black', B: 'White' },
  ko: { A: '검정', B: '흰돌' },
  es: { A: 'Negras', B: 'Blancas' },
  ja: { A: '黒', B: '白' },
  zh: { A: '黑方', B: '白方' },
};

const STRINGS = {
  en: {
    draw: "It's a draw!",
    wins: (n) => `${n} wins!`,
    toMove: (n) => `${n} to move`,
    foul: 'Renju rule: that point is forbidden (double-three, double-four, or overline).',
    placed: (b, w) => `Stones placed — Black: ${b} · White: ${w}`,
  },
  ko: {
    draw: '무승부!',
    wins: (n) => `${n} 승리!`,
    toMove: (n) => `${n} 차례`,
    foul: '렌주룰: 그 자리는 삼삼·사사·장목 금수입니다.',
    placed: (b, w) => `놓은 돌 — 검정: ${b} · 흰돌: ${w}`,
  },
  es: {
    draw: '¡Empate!',
    wins: (n) => `¡Ganan ${n}!`,
    toMove: (n) => `Turno de ${n}`,
    foul: 'Regla Renju: esa casilla está prohibida (doble tres, doble cuatro o más de cinco).',
    placed: (b, w) => `Piedras colocadas — Negras: ${b} · Blancas: ${w}`,
  },
  ja: {
    draw: '引き分け！',
    wins: (n) => `${n}の勝ち！`,
    toMove: (n) => `${n}の番`,
    foul: '連珠ルール：そこは禁じ手です（三三・四四・長連）。',
    placed: (b, w) => `置いた石 — 黒: ${b} · 白: ${w}`,
  },
  zh: {
    draw: '平局！',
    wins: (n) => `${n}获胜！`,
    toMove: (n) => `轮到${n}`,
    foul: '连珠规则：该点为禁手（三三、四四或长连）。',
    placed: (b, w) => `已落子 — 黑: ${b} · 白: ${w}`,
  },
};

const VIEWPORT = 420;
const MARGIN = 14; // just enough room for a stone/hit-circle at the edge rows/cols not to clip
const STEP = (VIEWPORT - MARGIN * 2) / (BOARD_SIZE - 1);
const STAR_POINTS = [3, 7, 11].flatMap((row) => [3, 7, 11].map((col) => toIndex(row, col)));

function pointPixel(index) {
  const { row, col } = toCoords(index);
  return { x: MARGIN + col * STEP, y: MARGIN + row * STEP };
}

function statusText(lang, game) {
  const s = STRINGS[lang];
  if (game.winner === 'draw') return s.draw;
  if (game.winner) return s.wins(PLAYER_NAME[lang][game.winner]);
  return s.toMove(PLAYER_NAME[lang][game.turn]);
}

export function mountGomokuGame(root, { lang: requestedLang = 'en' } = {}) {
  const lang = STRINGS[requestedLang] ? requestedLang : 'en';
  const svg = root.querySelector('[data-board-svg]');
  const boardFrame = root.querySelector('[data-board-frame]');
  const turnDot = root.querySelector('[data-turn-dot]');
  const turnLabel = root.querySelector('[data-turn-label]');
  const capturedLabel = root.querySelector('[data-captured-label]');
  const newGameBtn = root.querySelector('[data-new-game]');
  const undoBtn = root.querySelector('[data-undo]');
  const winBanner = root.querySelector('[data-win-banner]');
  const winMessage = root.querySelector('[data-win-message]');
  const winPlayAgain = root.querySelector('[data-win-play-again]');
  const winMoves = root.querySelector('[data-win-moves]');
  const winTime = root.querySelector('[data-win-time]');
  const timerLabel = root.querySelector('[data-timer]');
  const swatchRow = root.querySelector('[data-theme-row]');
  const opponentModeSelect = root.querySelector('[data-opponent-mode]');
  const modeBanner = root.querySelector('[data-mode-banner]');
  const modeBannerLocal = root.querySelector('[data-mode-local]');
  const modeBannerOnline = root.querySelector('[data-mode-online]');
  const modeBannerCancel = root.querySelector('[data-mode-cancel]');
  const aiDifficultySelect = root.querySelector('[data-ai-difficulty]');
  const sideSelect = root.querySelector('[data-side-select]');
  const rulesetSelect = root.querySelector('[data-ruleset]');
  const foulNote = root.querySelector('[data-foul-note]');

  let game = createInitialState({ ruleset: rulesetSelect ? rulesetSelect.value : RULESETS.FREESTYLE });
  let history = [];
  // On a dense 15x15 board, a mis-tap is easy on mobile — the first tap on
  // a point just previews a faint stone there; tapping that same point
  // again is what actually commits the move. A mouse sees a shadow stone
  // while hovering instead, so one click places the stone.
  let previewIndex = null;
  const hover = { index: null };
  let lastPointerType = 'mouse';
  svg.addEventListener('pointerdown', (e) => { lastPointerType = e.pointerType || 'mouse'; });
  let aiEnabled = opponentModeSelect.value === 'ai';
  let aiPlayer = sideSelect && sideSelect.value === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
  const stats = createGameStats({ onTick: (ms) => { if (timerLabel) timerLabel.textContent = formatElapsed(ms); } });

  function updateAiPlayer() {
    if (!sideSelect) return;
    aiPlayer = sideSelect.value === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
  }

  function isHumanTurn() {
    return !aiEnabled || game.turn !== aiPlayer;
  }

  function showFoulNote() {
    if (!foulNote) return;
    foulNote.textContent = STRINGS[lang].foul;
    foulNote.style.opacity = '1';
    clearTimeout(showFoulNote._t);
    showFoulNote._t = setTimeout(() => { foulNote.style.opacity = '0'; }, 2200);
  }

  function applyAction(to) {
    history.push(game);
    game = move(game, null, to);
    stats.recordMove();
    playPlaceSound();
    renderBoard();
    renderToolbar();
    showWinBanner();
    maybeTriggerAI();
  }

  function maybeTriggerAI() {
    if (!aiEnabled || game.winner || game.turn !== aiPlayer) return;
    setTimeout(() => {
      const aiMove = chooseAIMove(game, { difficulty: aiDifficultySelect.value });
      if (!aiMove) return;
      history.push(game);
      game = move(game, null, aiMove.to);
      stats.recordMove();
      playPlaceSound();
      renderBoard();
      renderToolbar();
      showWinBanner();
    }, AI_MOVE_DELAY_MS);
  }

  function applyTheme(key) {
    const theme = THEMES[key];
    boardFrame.style.background = theme.fill;
    boardFrame.style.borderColor = theme.border;
    boardFrame.dataset.theme = key;
    updateThemeSwatches(swatchRow, key);
    renderBoard();
  }

  function renderBoard() {
    svg.innerHTML = '';
    const theme = THEMES[boardFrame.dataset.theme || 'wood'];
    const lineGroup = el('g', { stroke: theme.line, 'stroke-width': '1.4', fill: 'none' });
    for (let i = 0; i < BOARD_SIZE; i++) {
      const y = MARGIN + i * STEP;
      lineGroup.appendChild(el('line', { x1: MARGIN, y1: y, x2: VIEWPORT - MARGIN, y2: y }));
      const x = MARGIN + i * STEP;
      lineGroup.appendChild(el('line', { x1: x, y1: MARGIN, x2: x, y2: VIEWPORT - MARGIN }));
    }
    svg.appendChild(lineGroup);

    for (const idx of STAR_POINTS) {
      const { x, y } = pointPixel(idx);
      svg.appendChild(el('circle', { cx: x, cy: y, r: 3, fill: theme.line }));
    }

    if (game.winLine.length >= 2) {
      const from = pointPixel(game.winLine[0]);
      const to = pointPixel(game.winLine[game.winLine.length - 1]);
      svg.appendChild(el('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: '#D9A441', 'stroke-width': '5', 'stroke-linecap': 'round', opacity: '.8' }));
    }

    if (rulesetSelect && rulesetSelect.value === RULESETS.RENJU) {
      for (const idx of forbiddenPoints(game)) {
        const { x, y } = pointPixel(idx);
        const r = STEP * 0.26;
        const strokeAttrs = { stroke: '#AC3B2A', 'stroke-width': '2.2', 'stroke-linecap': 'round' };
        svg.appendChild(el('line', { x1: x - r, y1: y - r, x2: x + r, y2: y + r, ...strokeAttrs }));
        svg.appendChild(el('line', { x1: x - r, y1: y + r, x2: x + r, y2: y - r, ...strokeAttrs }));
      }
    }

    const winSet = new Set(game.winLine);
    game.cells.forEach((player, index) => {
      if (!player) return;
      const { x, y } = pointPixel(index);
      const colors = PLAYER_COLOR[player];
      if (winSet.has(index)) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.46, fill: 'none', stroke: '#D9A441', 'stroke-width': '2.5' }));
      }
      if (player === PLAYERS.A) {
        // A black stone can get lost against a dark board theme (e.g.
        // "Ink") without a light ring to separate it from the background.
        svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.4, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '1.4', opacity: '.8' }));
      }
      svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.38, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '1.4' }));
      if (index === game.lastMove) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.12, fill: player === PLAYERS.B ? '#3A332C' : '#F6F1E6' }));
      }
    });

    if (previewIndex !== null && game.cells[previewIndex] === null) {
      const { x, y } = pointPixel(previewIndex);
      const colors = PLAYER_COLOR[game.turn];
      svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.38, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '1.4', opacity: '.4' }));
    }

    const legal = isHumanTurn() ? new Set(legalPlacements(game)) : null;
    const shadow = mountShadowStone(svg, {
      r: STEP * 0.38,
      pointPixel,
      canPlace: (index) => !game.winner && isHumanTurn() && game.cells[index] === null && index !== previewIndex && (!legal || legal.has(index)),
      colors: () => (game.turn === PLAYERS.A ? { ...PLAYER_COLOR[game.turn], stroke: '#F6F1E6' } : PLAYER_COLOR[game.turn]),
      hover,
    });
    game.cells.forEach((_, index) => {
      const { x, y } = pointPixel(index);
      const hit = el('circle', { cx: x, cy: y, r: STEP * 0.46, fill: 'transparent', class: 'board-point' });
      hit.addEventListener('click', () => handlePointClick(index, legal));
      shadow.wire(hit, index);
      svg.appendChild(hit);
    });
  }

  function renderToolbar() {
    const theme = PLAYER_COLOR[game.turn];
    turnDot.style.background = game.winner === 'draw' ? '#6B5F53' : theme.fill;
    turnLabel.textContent = statusText(lang, game);
    if (capturedLabel) {
      const blackOnBoard = game.cells.filter((p) => p === PLAYERS.A).length;
      const whiteOnBoard = game.cells.filter((p) => p === PLAYERS.B).length;
      capturedLabel.textContent = STRINGS[lang].placed(blackOnBoard, whiteOnBoard);
    }
    undoBtn.disabled = history.length === 0;
  }

  function showWinBanner() {
    if (!game.winner) return;
    stats.stop();
    winMessage.textContent = statusText(lang, game);
    if (winMoves) winMoves.textContent = String(stats.moveCount);
    if (winTime) winTime.textContent = formatElapsed(stats.elapsedMs());
    winBanner.classList.add('is-visible');
  }

  function hideWinBanner() {
    winBanner.classList.remove('is-visible');
  }

  function handlePointClick(index, legalSet) {
    if (game.winner || !isHumanTurn()) return;
    if (game.cells[index] !== null) return;
    if (legalSet && !legalSet.has(index)) {
      showFoulNote();
      return;
    }
    if (lastPointerType === 'mouse' || previewIndex === index) {
      previewIndex = null;
      applyAction(index);
      return;
    }
    previewIndex = index;
    renderBoard();
  }

  function newGame() {
    game = createInitialState({ ruleset: rulesetSelect ? rulesetSelect.value : RULESETS.FREESTYLE });
    history = [];
    previewIndex = null;
    stats.reset();
    stats.start();
    hideWinBanner();
    renderBoard();
    renderToolbar();
    maybeTriggerAI();
  }

  function undo() {
    if (history.length === 0) return;
    previewIndex = null;
    game = history.pop();
    let undone = 1;
    if (aiEnabled && history.length > 0 && game.turn === aiPlayer) {
      game = history.pop();
      undone = 2;
    }
    stats.unrecordMove(undone);
    stats.start();
    hideWinBanner();
    renderBoard();
    renderToolbar();
  }

  newGameBtn.addEventListener('click', newGame);
  undoBtn.addEventListener('click', undo);
  winPlayAgain.addEventListener('click', newGame);
  opponentModeSelect.addEventListener('change', () => {
    if (opponentModeSelect.value === 'local') {
      if (modeBanner) modeBanner.classList.add('is-visible');
      return;
    }
    aiEnabled = opponentModeSelect.value === 'ai';
    maybeTriggerAI();
  });
  if (modeBannerLocal) {
    modeBannerLocal.addEventListener('click', () => {
      aiEnabled = false;
      modeBanner.classList.remove('is-visible');
    });
  }
  if (modeBannerOnline) {
    modeBannerOnline.addEventListener('click', () => {
      location.href = `online.html?game=gomoku`;
    });
  }
  if (modeBannerCancel) {
    modeBannerCancel.addEventListener('click', (e) => {
      e.preventDefault();
      opponentModeSelect.value = aiEnabled ? 'ai' : 'local';
      modeBanner.classList.remove('is-visible');
    });
  }
  if (sideSelect) {
    sideSelect.addEventListener('change', () => {
      updateAiPlayer();
      newGame();
    });
  }
  if (rulesetSelect) {
    rulesetSelect.addEventListener('change', newGame);
  }

  renderThemeSwatches(swatchRow, { current: getStoredTheme(), onSelect: (key) => { setStoredTheme(key); applyTheme(key); } });
  applyTheme(getStoredTheme());
  renderToolbar();
  stats.start();
}
