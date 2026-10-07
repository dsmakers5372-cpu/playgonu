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
import { createGameStats, formatElapsed } from './gameStats.js';

const AI_MOVE_DELAY_MS = 450;

// Traditional Gomoku/Renju stone colors — Black moves first, White second
// (matching the real convention, unlike the Gonu variants' Red/Black).
const PLAYER_COLOR = {
  [PLAYERS.A]: { fill: '#242019', stroke: '#000000' },
  [PLAYERS.B]: { fill: '#F8F4E9', stroke: '#3A332C' },
};
const PLAYER_NAME = { en: { A: 'Black', B: 'White' }, ko: { A: '검정', B: '흰돌' } };

const VIEWPORT = 420;
const MARGIN = 24;
const STEP = (VIEWPORT - MARGIN * 2) / (BOARD_SIZE - 1);
const STAR_POINTS = [3, 7, 11].flatMap((row) => [3, 7, 11].map((col) => toIndex(row, col)));

function pointPixel(index) {
  const { row, col } = toCoords(index);
  return { x: MARGIN + col * STEP, y: MARGIN + row * STEP };
}

function statusText(lang, game) {
  const name = PLAYER_NAME[lang][game.turn];
  if (game.winner === 'draw') return lang === 'ko' ? '무승부!' : "It's a draw!";
  if (game.winner) {
    const winnerName = PLAYER_NAME[lang][game.winner];
    return lang === 'ko' ? `${winnerName} 승리!` : `${winnerName} wins!`;
  }
  return lang === 'ko' ? `${name} 차례` : `${name} to move`;
}

export function mountGomokuGame(root, { lang = 'en' } = {}) {
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
  const aiDifficultySelect = root.querySelector('[data-ai-difficulty]');
  const sideSelect = root.querySelector('[data-side-select]');
  const rulesetSelect = root.querySelector('[data-ruleset]');
  const foulNote = root.querySelector('[data-foul-note]');

  let game = createInitialState({ ruleset: rulesetSelect ? rulesetSelect.value : RULESETS.FREESTYLE });
  let history = [];
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
    foulNote.textContent = lang === 'ko'
      ? '렌주룰: 그 자리는 삼삼·사사·장목 금수입니다.'
      : 'Renju rule: that point is forbidden (double-three, double-four, or overline).';
    foulNote.style.opacity = '1';
    clearTimeout(showFoulNote._t);
    showFoulNote._t = setTimeout(() => { foulNote.style.opacity = '0'; }, 2200);
  }

  function applyAction(to) {
    history.push(game);
    game = move(game, null, to);
    stats.recordMove();
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

    const legal = isHumanTurn() ? new Set(legalPlacements(game)) : null;
    game.cells.forEach((_, index) => {
      const { x, y } = pointPixel(index);
      const hit = el('circle', { cx: x, cy: y, r: STEP * 0.46, fill: 'transparent', class: 'board-point' });
      hit.addEventListener('click', () => handlePointClick(index, legal));
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
      capturedLabel.textContent = lang === 'ko'
        ? `놓은 돌 — 검정: ${blackOnBoard} · 흰돌: ${whiteOnBoard}`
        : `Stones placed — Black: ${blackOnBoard} · White: ${whiteOnBoard}`;
    }
    undoBtn.disabled = history.length === 0;
  }

  function showWinBanner() {
    if (!game.winner) return;
    stats.stop();
    winMessage.textContent = game.winner === 'draw'
      ? (lang === 'ko' ? '무승부!' : "It's a draw!")
      : (lang === 'ko' ? `${PLAYER_NAME.ko[game.winner]} 승리!` : `${PLAYER_NAME.en[game.winner]} wins!`);
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
    applyAction(index);
  }

  function newGame() {
    game = createInitialState({ ruleset: rulesetSelect ? rulesetSelect.value : RULESETS.FREESTYLE });
    history = [];
    stats.reset();
    stats.start();
    hideWinBanner();
    renderBoard();
    renderToolbar();
    maybeTriggerAI();
  }

  function undo() {
    if (history.length === 0) return;
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
    aiEnabled = opponentModeSelect.value === 'ai';
    maybeTriggerAI();
  });
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
