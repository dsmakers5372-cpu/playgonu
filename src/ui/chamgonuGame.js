import {
  createInitialState,
  legalMovesFrom,
  legalPlacements,
  legalCaptures,
  move,
  BOARD_EDGES,
  PLAYERS,
} from '../engine/chamgonu.js';
import { chooseAIMove } from '../engine/chamgonuAI.js';
import { THEMES, getStoredTheme, setStoredTheme, renderThemeSwatches, updateThemeSwatches } from './boardThemes.js';
import { el, SVG_NS } from './svg.js';
import { createGameStats, formatElapsed } from './gameStats.js';
import { playCaptureSound } from './sound.js';

const AI_MOVE_DELAY_MS = 450;

const PLAYER_COLOR = {
  [PLAYERS.A]: { fill: '#AC3B2A', stroke: '#7A2A1E' },
  [PLAYERS.B]: { fill: '#2A2420', stroke: '#000000' },
};
const PLAYER_NAME = { en: { A: 'Red', B: 'Black' }, ko: { A: '빨강', B: '검정' } };

// Three concentric squares (outer/middle/inner), each an 8-point ring, with
// the midpoint of each side connected across all three rings — matching
// src/engine/chamgonu.js's point indices exactly.
const POINT_PIXELS = [
  { x: 40, y: 40 }, { x: 210, y: 40 }, { x: 380, y: 40 },
  { x: 380, y: 210 }, { x: 380, y: 380 }, { x: 210, y: 380 },
  { x: 40, y: 380 }, { x: 40, y: 210 },
  { x: 97, y: 97 }, { x: 210, y: 97 }, { x: 323, y: 97 },
  { x: 323, y: 210 }, { x: 323, y: 323 }, { x: 210, y: 323 },
  { x: 97, y: 323 }, { x: 97, y: 210 },
  { x: 153, y: 153 }, { x: 210, y: 153 }, { x: 267, y: 153 },
  { x: 267, y: 210 }, { x: 267, y: 267 }, { x: 210, y: 267 },
  { x: 153, y: 267 }, { x: 153, y: 210 },
];

function statusText(lang, game) {
  const name = PLAYER_NAME[lang][game.turn];
  if (game.winner) {
    const winnerName = PLAYER_NAME[lang][game.winner];
    return lang === 'ko' ? `${winnerName} 승리!` : `${winnerName} wins!`;
  }
  if (game.pendingCapture) {
    return lang === 'ko' ? `${name} — 잡을 말을 고르세요` : `${name} — pick a piece to capture`;
  }
  if (game.phase === 'placing') {
    const placed = game.placedCount[game.turn];
    return lang === 'ko' ? `${name} 차례 — 놓기 (${placed}/12)` : `${name} to place (${placed}/12)`;
  }
  return lang === 'ko' ? `${name} 차례` : `${name} to move`;
}

export function mountChamgonuGame(root, { lang = 'en' } = {}) {
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
  const phaseNote = root.querySelector('[data-phase-note]');

  let game = createInitialState();
  let selected = null;
  let history = [];
  let captureEffectIndex = null; // point a piece was just swept off of, briefly highlighted
  let captureEffectTimer = null;
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

  function currentTargets() {
    if (game.winner) return [];
    if (game.pendingCapture) return legalCaptures(game);
    if (game.phase === 'placing') return legalPlacements(game);
    if (selected !== null) return legalMovesFrom(game, selected);
    return [];
  }

  function checkPhaseTransition(prevPhase) {
    if (prevPhase === 'placing' && game.phase === 'moving') showPhaseNote();
  }

  function showPhaseNote() {
    if (!phaseNote) return;
    phaseNote.textContent = lang === 'ko'
      ? '모든 말을 다 놓았습니다 — 이제부터는 말을 선으로 한 칸씩 옮기세요!'
      : 'All pieces are placed — now slide one piece per turn to an adjacent point!';
    phaseNote.style.opacity = '1';
    clearTimeout(showPhaseNote._t);
    showPhaseNote._t = setTimeout(() => { phaseNote.style.opacity = '0'; }, 4000);
  }

  function flashCapture(index) {
    captureEffectIndex = index;
    playCaptureSound();
    clearTimeout(captureEffectTimer);
    captureEffectTimer = setTimeout(() => {
      captureEffectIndex = null;
      renderBoard();
    }, 700);
  }

  function applyAction(from, to) {
    const prevPhase = game.phase;
    const wasCapture = game.pendingCapture; // `to` is the point being captured, not placed/moved
    history.push(game);
    game = move(game, from, to);
    stats.recordMove();
    selected = null;
    if (wasCapture) flashCapture(to);
    renderBoard();
    renderToolbar();
    checkPhaseTransition(prevPhase);
    showWinBanner();
    maybeTriggerAI();
  }

  function maybeTriggerAI() {
    if (!aiEnabled || game.winner || game.turn !== aiPlayer) return;
    setTimeout(() => {
      const prevPhase = game.phase;
      const wasCapture = game.pendingCapture;
      const aiMove = chooseAIMove(game, { difficulty: aiDifficultySelect.value });
      if (!aiMove) return;
      history.push(game);
      game = move(game, aiMove.from, aiMove.to);
      stats.recordMove();
      if (wasCapture) flashCapture(aiMove.to);
      renderBoard();
      renderToolbar();
      checkPhaseTransition(prevPhase);
      showWinBanner();
      maybeTriggerAI(); // chained: a mill the AI just formed means it must also capture
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
    const lineGroup = el('g', { stroke: theme.line, 'stroke-width': '3', fill: 'none' });
    for (const [a, b] of BOARD_EDGES) {
      const from = POINT_PIXELS[a];
      const to = POINT_PIXELS[b];
      lineGroup.appendChild(el('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y }));
    }
    svg.appendChild(lineGroup);

    // The mill (꼰) that was just completed — highlighted for as long as the
    // resulting capture is still pending, so it's obvious which 3 points
    // just connected before the board updates again.
    if (game.lastMill.length === 3) {
      const [ma, mb, mc] = game.lastMill;
      const pa = POINT_PIXELS[ma];
      const pb = POINT_PIXELS[mb];
      const pc = POINT_PIXELS[mc];
      const millAttrs = { stroke: '#D9A441', 'stroke-width': '6', 'stroke-linecap': 'round', opacity: '.85' };
      svg.appendChild(el('line', { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, ...millAttrs }));
      svg.appendChild(el('line', { x1: pb.x, y1: pb.y, x2: pc.x, y2: pc.y, ...millAttrs }));
    }

    // Points a capture already used up are marked with a "peg" (per the
    // source rule: "말을 따낸 교차점에는 말뚝말을 놓아 표시한다") so it's
    // visually obvious why clicking there during placement does nothing —
    // only relevant during placement; these open back up once moving starts.
    if (game.phase === 'placing') {
      game.deadForPlacement.forEach((dead, index) => {
        if (!dead || game.pieces[index] !== null) return;
        const { x, y } = POINT_PIXELS[index];
        svg.appendChild(el('rect', { x: x - 6, y: y - 6, width: 12, height: 12, fill: theme.line, opacity: '.55', transform: `rotate(45 ${x} ${y})` }));
      });
    }

    // Targets on EMPTY points (placing/moving) render as a small dot — safe
    // to draw before the pieces since nothing else occupies that point yet.
    const targets = currentTargets();
    for (const target of targets) {
      if (game.pieces[target] !== null) continue; // occupied (capture) targets render after the pieces, below
      const { x, y } = POINT_PIXELS[target];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 11, fill: '#F6F1E6', opacity: '.9' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 7, fill: '#2F6E6A' }));
    }

    if (selected !== null) {
      const { x, y } = POINT_PIXELS[selected];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 20, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '5', opacity: '.9' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 18, fill: 'none', stroke: '#2F6E6A', 'stroke-width': '3' }));
    }

    game.pieces.forEach((player, index) => {
      if (!player) return;
      const { x, y } = POINT_PIXELS[index];
      if (player === PLAYERS.B) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: 15, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '2', opacity: '.85' }));
      }
      const colors = PLAYER_COLOR[player];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 13, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '2' }));
    });

    // Capture targets sit on an opponent's stone — a filled dot drawn before
    // the piece would just get painted over, so this draws a bright ring
    // around the stone instead, on top of everything, so it's actually
    // visible (this was the bug: previously these were invisible).
    for (const target of targets) {
      if (game.pieces[target] === null) continue;
      const { x, y } = POINT_PIXELS[target];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 19, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '4', opacity: '.95' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 17, fill: 'none', stroke: '#AC3B2A', 'stroke-width': '3' }));
    }

    // A piece that was just captured gets a quick expanding-ring "swish" on
    // the now-empty point it was swept off of, so it's obvious which one
    // disappeared instead of the board just silently having one fewer piece.
    if (captureEffectIndex !== null) {
      const { x, y } = POINT_PIXELS[captureEffectIndex];
      const ring = el('circle', { cx: x, cy: y, r: 10, fill: 'none', stroke: '#AC3B2A', 'stroke-width': '3' });
      const growR = document.createElementNS(SVG_NS, 'animate');
      growR.setAttribute('attributeName', 'r');
      growR.setAttribute('from', '10');
      growR.setAttribute('to', '26');
      growR.setAttribute('dur', '0.6s');
      growR.setAttribute('fill', 'freeze');
      const fadeOut = document.createElementNS(SVG_NS, 'animate');
      fadeOut.setAttribute('attributeName', 'opacity');
      fadeOut.setAttribute('from', '.9');
      fadeOut.setAttribute('to', '0');
      fadeOut.setAttribute('dur', '0.6s');
      fadeOut.setAttribute('fill', 'freeze');
      ring.appendChild(growR);
      ring.appendChild(fadeOut);
      svg.appendChild(ring);
    }

    POINT_PIXELS.forEach((_, index) => {
      const { x, y } = POINT_PIXELS[index];
      const hit = el('circle', { cx: x, cy: y, r: 16, fill: 'transparent', class: 'board-point' });
      hit.addEventListener('click', () => handlePointClick(index));
      svg.appendChild(hit);
    });
  }

  function renderToolbar() {
    const theme = PLAYER_COLOR[game.turn];
    turnDot.style.background = theme.fill;
    turnLabel.textContent = statusText(lang, game);
    if (capturedLabel) {
      const redOnBoard = game.pieces.filter((p) => p === PLAYERS.A).length;
      const blackOnBoard = game.pieces.filter((p) => p === PLAYERS.B).length;
      capturedLabel.textContent = lang === 'ko'
        ? `남은 말 — 빨강: ${redOnBoard} · 검정: ${blackOnBoard}`
        : `On board — Red: ${redOnBoard} · Black: ${blackOnBoard}`;
    }
    undoBtn.disabled = history.length === 0;
  }

  function showWinBanner() {
    if (!game.winner) return;
    stats.stop();
    const winnerName = PLAYER_NAME[lang][game.winner];
    winMessage.textContent = lang === 'ko' ? `${winnerName} 승리!` : `${winnerName} wins!`;
    if (winMoves) winMoves.textContent = String(stats.moveCount);
    if (winTime) winTime.textContent = formatElapsed(stats.elapsedMs());
    winBanner.classList.add('is-visible');
  }

  function hideWinBanner() {
    winBanner.classList.remove('is-visible');
  }

  function handlePointClick(index) {
    if (game.winner || !isHumanTurn()) return;

    if (game.pendingCapture) {
      if (legalCaptures(game).includes(index)) applyAction(null, index);
      return;
    }

    if (game.phase === 'placing') {
      if (legalPlacements(game).includes(index)) applyAction(null, index);
      return;
    }

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
    if (legalMovesFrom(game, selected).includes(index)) {
      applyAction(selected, index);
      return;
    }
    selected = piece === game.turn ? index : null;
    renderBoard();
  }

  function newGame() {
    game = createInitialState();
    selected = null;
    history = [];
    clearTimeout(captureEffectTimer);
    captureEffectIndex = null;
    stats.reset();
    stats.start();
    hideWinBanner();
    renderBoard();
    renderToolbar();
    maybeTriggerAI();
  }

  function undo() {
    if (history.length === 0) return;
    clearTimeout(captureEffectTimer);
    captureEffectIndex = null;
    let popped = 0;
    do {
      game = history.pop();
      popped += 1;
    } while (history.length > 0 && (game.pendingCapture || (aiEnabled && game.turn === aiPlayer)));
    stats.unrecordMove(popped);
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
