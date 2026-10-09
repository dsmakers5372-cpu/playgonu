import { createInitialState, legalMovesFrom, move, bakwigonuGrid, WHEEL_POINTS, PLAYERS, QUIET_MOVE_LIMIT } from '../engine/bakwigonu.js';
import { chooseAIMove } from '../engine/bakwigonuAI.js';
import { THEMES, getStoredTheme, setStoredTheme, renderThemeSwatches, updateThemeSwatches } from './boardThemes.js';
import { el, startAnimations, captureFlipEffect, CAPTURE_FLIP_MS } from './svg.js';
import { getDynamicStrings } from '../i18n/dynamicStrings.js';
import { createGameStats, formatElapsed } from './gameStats.js';
import { playCaptureSound } from './sound.js';

const AI_MOVE_DELAY_MS = 450;

const PLAYER_COLOR = {
  [PLAYERS.A]: { fill: '#AC3B2A', stroke: '#7A2A1E' },
  [PLAYERS.B]: { fill: '#2A2420', stroke: '#000000' },
};

const VIEWPORT = 420;
const MARGIN = 60;
const STEP = (VIEWPORT - MARGIN * 2) / (bakwigonuGrid.cols - 1);
const WHEEL_RADIUS = 26;

function pointPixel(index) {
  const { row, col } = bakwigonuGrid.toCoords(index);
  return { x: MARGIN + col * STEP, y: MARGIN + row * STEP };
}

export function mountBakwigonuGame(root, { lang = 'en' } = {}) {
  const t = getDynamicStrings(lang);
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

  let game = createInitialState();
  let selected = null;
  let history = [];
  // Pieces just captured: drawn flipping over to silver and fading out, so a
  // capture is seen rather than the piece simply vanishing.
  let captureEffect = null;
  let captureEffectTimer = null;
  function flashCaptures(prev, next) {
    if (!next.lastCapture || next.lastCapture.length === 0) return;
    captureEffect = { points: next.lastCapture.slice(), player: prev.turn === PLAYERS.A ? PLAYERS.B : PLAYERS.A, start: performance.now() };
    clearTimeout(captureEffectTimer);
    captureEffectTimer = setTimeout(() => { captureEffect = null; renderBoard(); }, CAPTURE_FLIP_MS + 100);
  }
  function clearCaptureEffect() {
    captureEffect = null;
    clearTimeout(captureEffectTimer);
  }
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
      flashCaptures(history[history.length - 1], game);
      stats.recordMove();
      if (game.lastCapture.length > 0) playCaptureSound();
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
    const lineGroup = el('g', { stroke: theme.line, 'stroke-width': '2.6', fill: 'none' });
    for (let i = 0; i < bakwigonuGrid.rows; i++) {
      const y = MARGIN + i * STEP;
      lineGroup.appendChild(el('line', { x1: MARGIN, y1: y, x2: VIEWPORT - MARGIN, y2: y }));
    }
    for (let i = 0; i < bakwigonuGrid.cols; i++) {
      const x = MARGIN + i * STEP;
      lineGroup.appendChild(el('line', { x1: x, y1: MARGIN, x2: x, y2: VIEWPORT - MARGIN }));
    }
    svg.appendChild(lineGroup);

    // The four wheel corners get their own ring so it's obvious they're special.
    for (const idx of WHEEL_POINTS) {
      const { x, y } = pointPixel(idx);
      svg.appendChild(el('circle', { cx: x, cy: y, r: WHEEL_RADIUS, fill: 'none', stroke: theme.line, 'stroke-width': '2.4', opacity: '.6' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: WHEEL_RADIUS * 0.55, fill: 'none', stroke: theme.line, 'stroke-width': '1.6', opacity: '.4' }));
    }

    const targets = legalTargets();
    for (const target of targets) {
      const { x, y } = pointPixel(target);
      svg.appendChild(el('circle', { cx: x, cy: y, r: 10, fill: '#F6F1E6', opacity: '.9' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 6, fill: '#2F6E6A' }));
    }

    if (selected !== null) {
      const { x, y } = pointPixel(selected);
      svg.appendChild(el('circle', { cx: x, cy: y, r: 18, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '4', opacity: '.9' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 16, fill: 'none', stroke: '#2F6E6A', 'stroke-width': '2.5' }));
    }

    game.pieces.forEach((player, index) => {
      if (!player) return;
      const { x, y } = pointPixel(index);
      if (player === PLAYERS.B) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: 14, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '2', opacity: '.85' }));
      }
      const colors = PLAYER_COLOR[player];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 12, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '2' }));
    });

    if (captureEffect) {
      for (const index of captureEffect.points) {
        const { x, y } = pointPixel(index);
        svg.appendChild(captureFlipEffect(x, y, PLAYER_COLOR[captureEffect.player], captureEffect.start, 12));
      }
    }

    game.pieces.forEach((_, index) => {
      const { x, y } = pointPixel(index);
      const hit = el('circle', { cx: x, cy: y, r: 18, fill: 'transparent', class: 'board-point' });
      hit.addEventListener('click', () => handlePointClick(index));
      svg.appendChild(hit);
    });
    startAnimations(svg);
  }

  function renderToolbar() {
    const theme = PLAYER_COLOR[game.turn];
    turnDot.style.background = theme.fill;
    const quietLeft = QUIET_MOVE_LIMIT - (game.quietMoves ?? 0);
    if (game.winner === 'draw') turnLabel.textContent = t.draw;
    else if (game.winner) turnLabel.textContent = t.wins(t.playerName[game.winner]);
    else if (quietLeft <= 10) turnLabel.textContent = t.toMoveLimitSoon(t.playerName[game.turn], quietLeft);
    else turnLabel.textContent = t.toMove(t.playerName[game.turn]);
    const redCaptured = 4 - game.pieces.filter((p) => p === PLAYERS.B).length;
    const blackCaptured = 4 - game.pieces.filter((p) => p === PLAYERS.A).length;
    capturedLabel.textContent = t.captured(redCaptured, blackCaptured);
    undoBtn.disabled = history.length === 0;
  }

  function showWinBanner() {
    if (!game.winner) return;
    stats.stop();
    winMessage.textContent = game.winner === 'draw' ? t.drawExclaim(QUIET_MOVE_LIMIT)
      : game.decidedByCount ? t.countWinExclaim(t.playerName[game.winner], QUIET_MOVE_LIMIT)
      : t.winsExclaim(t.playerName[game.winner]);
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
      flashCaptures(history[history.length - 1], game);
      stats.recordMove();
      if (game.lastCapture.length > 0) playCaptureSound();
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
    clearCaptureEffect();
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
    clearCaptureEffect();
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
