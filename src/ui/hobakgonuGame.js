import { createInitialState, legalMovesFrom, move, BOARD_EDGES, PLAYERS } from '../engine/hobakgonu.js';
import { chooseAIMove } from '../engine/hobakgonuAI.js';
import { THEMES, getStoredTheme, setStoredTheme, renderThemeSwatches, updateThemeSwatches } from './boardThemes.js';
import { el } from './svg.js';
import { getDynamicStrings } from '../i18n/dynamicStrings.js';
import { createGameStats, formatElapsed } from './gameStats.js';

const AI_MOVE_DELAY_MS = 450;

const PLAYER_COLOR = {
  [PLAYERS.A]: { fill: '#AC3B2A', stroke: '#7A2A1E' },
  [PLAYERS.B]: { fill: '#2A2420', stroke: '#000000' },
};

// Fixed layout: a 3-point start line above and below a wheel (center + 4
// rim points), matching src/engine/hobakgonu.js's point indices.
const POINT_PIXELS = [
  { x: 110, y: 40 },
  { x: 210, y: 40 },
  { x: 310, y: 40 },
  { x: 210, y: 120 },
  { x: 210, y: 210 },
  { x: 130, y: 210 },
  { x: 290, y: 210 },
  { x: 210, y: 300 },
  { x: 110, y: 380 },
  { x: 210, y: 380 },
  { x: 310, y: 380 },
];

export function mountHobakgonuGame(root, { lang = 'en' } = {}) {
  const t = getDynamicStrings(lang);
  const svg = root.querySelector('[data-board-svg]');
  const boardFrame = root.querySelector('[data-board-frame]');
  const turnDot = root.querySelector('[data-turn-dot]');
  const turnLabel = root.querySelector('[data-turn-label]');
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

  let game = createInitialState();
  let selected = null;
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

  function maybeTriggerAI() {
    if (!aiEnabled || game.winner || game.turn !== aiPlayer) return;
    setTimeout(() => {
      const aiMove = chooseAIMove(game, { difficulty: aiDifficultySelect.value });
      if (!aiMove) return;
      history.push(game);
      game = move(game, aiMove.from, aiMove.to);
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

  function legalTargets() {
    return selected === null ? [] : legalMovesFrom(game, selected);
  }

  function renderBoard() {
    svg.innerHTML = '';
    const theme = THEMES[boardFrame.dataset.theme || 'wood'];
    const lineGroup = el('g', { stroke: theme.line, 'stroke-width': '3', fill: 'none' });
    for (const [a, b] of BOARD_EDGES) {
      const from = POINT_PIXELS[a];
      const to = POINT_PIXELS[b];
      lineGroup.appendChild(el('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y }));
    }
    svg.appendChild(lineGroup);

    const targets = legalTargets();
    for (const target of targets) {
      const { x, y } = POINT_PIXELS[target];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 11, fill: '#F6F1E6', opacity: '.9' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 7, fill: '#2F6E6A' }));
    }

    if (selected !== null) {
      const { x, y } = POINT_PIXELS[selected];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 23, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '5', opacity: '.9' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 21, fill: 'none', stroke: '#2F6E6A', 'stroke-width': '3' }));
    }

    game.pieces.forEach((player, index) => {
      if (!player) return;
      const { x, y } = POINT_PIXELS[index];
      if (player === PLAYERS.B) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: 18, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '2', opacity: '.85' }));
      }
      const colors = PLAYER_COLOR[player];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 16, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '2' }));
    });

    // A blocked start point (vacated, now permanently out of play) gets a
    // faint cross so it reads as "dead" rather than just empty.
    game.blockedStart.forEach((blocked, index) => {
      if (!blocked) return;
      const { x, y } = POINT_PIXELS[index];
      svg.appendChild(el('line', { x1: x - 7, y1: y - 7, x2: x + 7, y2: y + 7, stroke: theme.line, 'stroke-width': '2', opacity: '.5' }));
      svg.appendChild(el('line', { x1: x - 7, y1: y + 7, x2: x + 7, y2: y - 7, stroke: theme.line, 'stroke-width': '2', opacity: '.5' }));
    });

    POINT_PIXELS.forEach((_, index) => {
      const { x, y } = POINT_PIXELS[index];
      const hit = el('circle', { cx: x, cy: y, r: 24, fill: 'transparent', class: 'board-point' });
      hit.addEventListener('click', () => handlePointClick(index));
      svg.appendChild(hit);
    });
  }

  function renderToolbar() {
    const theme = PLAYER_COLOR[game.turn];
    turnDot.style.background = theme.fill;
    turnLabel.textContent = game.winner ? t.wins(t.playerName[game.winner]) : t.toMove(t.playerName[game.turn]);
    undoBtn.disabled = history.length === 0;
  }

  function showWinBanner() {
    if (!game.winner) return;
    stats.stop();
    winMessage.textContent = t.winsExclaim(t.playerName[game.winner]);
    if (winMoves) winMoves.textContent = String(stats.moveCount);
    if (winTime) winTime.textContent = formatElapsed(stats.elapsedMs());
    winBanner.classList.add('is-visible');
  }

  function hideWinBanner() {
    winBanner.classList.remove('is-visible');
  }

  function handlePointClick(index) {
    if (game.winner || !isHumanTurn()) return;
    const piece = game.pieces[index];

    if (selected === null) {
      if (piece === game.turn) {
        selected = index;
        renderBoard();
      }
      return;
    }

    if (index === selected) {
      selected = null;
      renderBoard();
      return;
    }

    if (legalTargets().includes(index)) {
      history.push(game);
      game = move(game, selected, index);
      stats.recordMove();
      selected = null;
      renderBoard();
      renderToolbar();
      showWinBanner();
      maybeTriggerAI();
      return;
    }

    selected = piece === game.turn ? index : null;
    renderBoard();
  }

  function newGame() {
    game = createInitialState();
    selected = null;
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
    selected = null;
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

  renderThemeSwatches(swatchRow, { current: getStoredTheme(), onSelect: (key) => { setStoredTheme(key); applyTheme(key); } });
  applyTheme(getStoredTheme());
  renderToolbar();
  stats.start();
}
