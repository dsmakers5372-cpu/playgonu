import {
  createInitialState,
  legalMovesFrom,
  legalPlacements,
  legalCaptures,
  move,
  BOARD_EDGES,
  PLAYERS,
  QUIET_MOVE_LIMIT,
  FLYING_AT,
} from '../engine/chamgonu.js';
import { getDynamicStrings } from '../i18n/dynamicStrings.js';
import { chooseAIMove } from '../engine/chamgonuAI.js';
import { THEMES, getStoredTheme, setStoredTheme, renderThemeSwatches, updateThemeSwatches } from './boardThemes.js';
import { el, animate, startAnimations, captureFlipEffect, CAPTURE_FLIP_MS } from './svg.js';
import { createGameStats, formatElapsed } from './gameStats.js';
import { playCaptureSound } from './sound.js';

const AI_MOVE_DELAY_MS = 450;

const PLAYER_COLOR = {
  [PLAYERS.A]: { fill: '#AC3B2A', stroke: '#7A2A1E' },
  [PLAYERS.B]: { fill: '#2C5F8A', stroke: '#1D4360' },
};
const PLAYER_NAME = {
  en: { A: 'Red', B: 'Blue' },
  ko: { A: '빨강', B: '파랑' },
  es: { A: 'Rojo', B: 'Azul' },
  ja: { A: '赤', B: '青' },
  zh: { A: '红方', B: '蓝方' },
};

const STRINGS = {
  en: {
    wins: (n) => `${n} wins!`,
    drawFull: 'Draw — the board filled up with no mill',
    pickCapture: (n) => `${n} — pick a piece to capture`,
    toPlace: (n, placed) => `${n} to place (${placed}/12)`,
    toMove: (n) => `${n} to move`,
    onBoard: (r, b) => `On board — Red: ${r} · Blue: ${b}`,
    flying: (n) => `${n} to move — flying (3 pieces)`,
    drawStall: 'Draw — a side stuck on 3 pieces and no capture for 10 moves each',
  },
  ko: {
    wins: (n) => `${n} 승리!`,
    drawFull: '무승부 — 꼰 없이 판이 꽉 찼어요',
    pickCapture: (n) => `${n} — 잡을 말을 고르세요`,
    toPlace: (n, placed) => `${n} 차례 — 놓기 (${placed}/12)`,
    toMove: (n) => `${n} 차례`,
    onBoard: (r, b) => `남은 말 — 빨강: ${r} · 파랑: ${b}`,
    flying: (n) => `${n} 차례 — 날기 가능 (말 3개)`,
    drawStall: '무승부 — 말 3개인 쪽이 있고 양쪽 10수씩 잡기가 없었어요',
  },
  es: {
    wins: (n) => `¡Gana ${n}!`,
    drawFull: 'Empate — el tablero se llenó sin ningún molino',
    pickCapture: (n) => `${n} — elige una pieza para capturar`,
    toPlace: (n, placed) => `${n} coloca (${placed}/12)`,
    toMove: (n) => `Turno de ${n}`,
    onBoard: (r, b) => `En el tablero — Rojo: ${r} · Azul: ${b}`,
    flying: (n) => `Turno de ${n} — puede volar (3 fichas)`,
    drawStall: 'Empate — un bando con 3 fichas y 10 jugadas cada uno sin capturas',
  },
  ja: {
    wins: (n) => `${n}の勝ち！`,
    drawFull: '引き分け — ゴンなしで盤が埋まりました',
    pickCapture: (n) => `${n} — 取る駒を選んでください`,
    toPlace: (n, placed) => `${n}の番 — 配置 (${placed}/12)`,
    toMove: (n) => `${n}の番`,
    onBoard: (r, b) => `盤上の駒 — 赤: ${r} · 青: ${b}`,
    flying: (n) => `${n}の番 — 飛べます（駒3つ）`,
    drawStall: '引き分け — 駒3つの側がいて、双方10手ずつ駒取りなし',
  },
  zh: {
    wins: (n) => `${n}获胜！`,
    drawFull: '平局 — 没有成三，棋盘已满',
    pickCapture: (n) => `${n} — 请选择要吃掉的棋子`,
    toPlace: (n, placed) => `${n}落子 (${placed}/12)`,
    toMove: (n) => `轮到${n}`,
    onBoard: (r, b) => `棋盘上 — 红: ${r} · 蓝: ${b}`,
    flying: (n) => `轮到${n} — 可飞子（仅剩3枚）`,
    drawStall: '平局 — 有一方仅剩3枚，且双方各10步无吃子',
  },
};

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
  const s = STRINGS[lang];
  const name = PLAYER_NAME[lang][game.turn];
  if (game.winner) return resultText(lang, game);
  if (game.pendingCapture) return s.pickCapture(name);
  if (game.phase === 'placing') return s.toPlace(name, game.placedCount[game.turn]);
  if (game.ruleset === 'western') {
    const onThree = game.pieces.filter((x) => x === game.turn).length === FLYING_AT;
    return onThree ? s.flying(name) : s.toMove(name);
  }
  const quietLeft = QUIET_MOVE_LIMIT - (game.quietMoves ?? 0);
  if (quietLeft <= 10) return getDynamicStrings(lang).toMoveLimitSoon(name, quietLeft);
  return s.toMove(name);
}

// How the game ended: a full board with no mill (draw), the quiet-move limit
// (decided on pieces left), or an ordinary win.
function resultText(lang, game) {
  const s = STRINGS[lang];
  const d = getDynamicStrings(lang);
  if (game.decidedByStall) return s.drawStall;
  if (game.decidedByCount) return game.winner === 'draw' ? d.drawExclaim(QUIET_MOVE_LIMIT) : d.countWinExclaim(PLAYER_NAME[lang][game.winner], QUIET_MOVE_LIMIT);
  if (game.winner === 'draw') return s.drawFull;
  return s.wins(PLAYER_NAME[lang][game.winner]);
}

export function mountChamgonuGame(root, { lang: requestedLang = 'en' } = {}) {
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
  const phaseBanner = root.querySelector('[data-phase-banner]');
  const phaseBannerOk = root.querySelector('[data-phase-banner-ok]');

  const currentRuleset = () => (rulesetSelect ? rulesetSelect.value : 'korean');
  let game = createInitialState({ ruleset: currentRuleset() });
  let selected = null;
  let history = [];
  let captureEffectIndex = null; // point a piece was just swept off of, briefly highlighted
  let captureEffectPlayer = null; // whose piece it was, so the flipping piece is the right color
  let captureEffectTimer = null;
  let captureEffectStart = 0;
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
    if (prevPhase === 'placing' && game.phase === 'moving') showPhaseBanner();
  }

  function showPhaseBanner() {
    if (!phaseBanner) return;
    phaseBanner.classList.add('is-visible');
  }

  function hidePhaseBanner() {
    if (!phaseBanner) return;
    phaseBanner.classList.remove('is-visible');
  }

  // Slow and deliberate on purpose — the capture itself matters, so it
  // shouldn't flash by in under a second.
  const CAPTURE_EFFECT_MS = CAPTURE_FLIP_MS + 100;

  function flashCapture(index, player) {
    captureEffectIndex = index;
    captureEffectPlayer = player;
    captureEffectStart = performance.now();
    playCaptureSound();
    clearTimeout(captureEffectTimer);
    captureEffectTimer = setTimeout(() => {
      captureEffectIndex = null;
      captureEffectPlayer = null;
      renderBoard();
    }, CAPTURE_EFFECT_MS);
  }

  function applyAction(from, to) {
    const prevPhase = game.phase;
    const wasCapture = game.pendingCapture; // `to` is the point being captured, not placed/moved
    const capturedPlayer = wasCapture ? game.pieces[to] : null;
    history.push(game);
    game = move(game, from, to);
    stats.recordMove();
    selected = null;
    if (wasCapture) flashCapture(to, capturedPlayer);
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
      const capturedPlayer = wasCapture ? game.pieces[aiMove.to] : null;
      history.push(game);
      game = move(game, aiMove.from, aiMove.to);
      stats.recordMove();
      if (wasCapture) flashCapture(aiMove.to, capturedPlayer);
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
      const millAttrs = { stroke: '#D9A441', 'stroke-width': '6', 'stroke-linecap': 'round', opacity: '0' };
      const fadeIn = { attributeName: 'opacity', from: '0', to: '.85', dur: '.6s', fill: 'freeze' };
      svg.appendChild(animate(el('line', { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, ...millAttrs }), fadeIn));
      svg.appendChild(animate(el('line', { x1: pb.x, y1: pb.y, x2: pc.x, y2: pc.y, ...millAttrs }), fadeIn));
    }

    // Points a capture already used up are marked with a "peg" (per the
    // source rule: "말을 따낸 교차점에는 말뚝말을 놓아 표시한다") so it's
    // visually obvious why clicking there during placement does nothing —
    // only relevant during placement; these open back up once moving starts.
    // Fixed colors (not theme.line) so the mark stays legible against every
    // board color, not just the ones it happens to contrast with.
    if (game.phase === 'placing') {
      game.deadForPlacement.forEach((dead, index) => {
        if (!dead || game.pieces[index] !== null) return;
        const { x, y } = POINT_PIXELS[index];
        svg.appendChild(el('circle', { cx: x, cy: y, r: 9, fill: '#F6F1E6', opacity: '.9' }));
        const r = 6;
        const xAttrs = { stroke: '#8B2E21', 'stroke-width': '2.4', 'stroke-linecap': 'round' };
        svg.appendChild(el('line', { x1: x - r, y1: y - r, x2: x + r, y2: y + r, ...xAttrs }));
        svg.appendChild(el('line', { x1: x - r, y1: y + r, x2: x + r, y2: y - r, ...xAttrs }));
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
      if (index === game.lastMove) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: 4, fill: '#F6F1E6' }));
      }
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

    // A piece that was just captured fades out in place (rather than just
    // vanishing the instant the state updates) while an expanding ring
    // sweeps outward from it — slow and deliberate on purpose, so a capture
    // reads as an event worth noticing, not a blink-and-you-miss-it flicker.
    if (captureEffectIndex !== null) {
      const { x, y } = POINT_PIXELS[captureEffectIndex];
      if (captureEffectPlayer) {
        svg.appendChild(captureFlipEffect(x, y, PLAYER_COLOR[captureEffectPlayer], captureEffectStart));
      }
      const ring = el('circle', { cx: x, cy: y, r: 10, fill: 'none', stroke: '#AC3B2A', 'stroke-width': '3' });
      animate(ring, { attributeName: 'r', from: '10', to: '28', dur: '1.6s', fill: 'freeze' }, captureEffectStart);
      animate(ring, { attributeName: 'opacity', from: '.9', to: '0', dur: '1.6s', fill: 'freeze' }, captureEffectStart);
      svg.appendChild(ring);
    }

    POINT_PIXELS.forEach((_, index) => {
      const { x, y } = POINT_PIXELS[index];
      const hit = el('circle', { cx: x, cy: y, r: 16, fill: 'transparent', class: 'board-point' });
      hit.addEventListener('click', () => handlePointClick(index));
      svg.appendChild(hit);
    });
    startAnimations(svg);
  }

  function renderToolbar() {
    const theme = PLAYER_COLOR[game.turn];
    turnDot.style.background = theme.fill;
    turnLabel.textContent = statusText(lang, game);
    if (capturedLabel) {
      const redOnBoard = game.pieces.filter((p) => p === PLAYERS.A).length;
      const blueOnBoard = game.pieces.filter((p) => p === PLAYERS.B).length;
      capturedLabel.textContent = STRINGS[lang].onBoard(redOnBoard, blueOnBoard);
    }
    undoBtn.disabled = history.length === 0;
  }

  function showWinBanner() {
    if (!game.winner) return;
    stats.stop();
    winMessage.textContent = resultText(lang, game);
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
    game = createInitialState({ ruleset: currentRuleset() });
    selected = null;
    history = [];
    clearTimeout(captureEffectTimer);
    captureEffectIndex = null;
    captureEffectPlayer = null;
    stats.reset();
    stats.start();
    hideWinBanner();
    hidePhaseBanner();
    renderBoard();
    renderToolbar();
    maybeTriggerAI();
  }

  function undo() {
    if (history.length === 0) return;
    clearTimeout(captureEffectTimer);
    captureEffectIndex = null;
    captureEffectPlayer = null;
    hidePhaseBanner();
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
  if (phaseBannerOk) phaseBannerOk.addEventListener('click', hidePhaseBanner);
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
      location.href = `online.html?game=cham&ruleset=${currentRuleset()}`;
    });
  }
  if (modeBannerCancel) {
    modeBannerCancel.addEventListener('click', (e) => {
      e.preventDefault();
      opponentModeSelect.value = aiEnabled ? 'ai' : 'local';
      modeBanner.classList.remove('is-visible');
    });
  }
  if (rulesetSelect) rulesetSelect.addEventListener('change', newGame);
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
