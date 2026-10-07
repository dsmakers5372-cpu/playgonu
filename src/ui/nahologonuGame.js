import { createInitialState, legalMovesFrom, move, countPegs, VALID_CELLS, toCoords, SIZE } from '../engine/nahologonu.js';
import { THEMES, getStoredTheme, setStoredTheme, renderThemeSwatches, updateThemeSwatches } from './boardThemes.js';
import { el } from './svg.js';
import { playPlaceSound, playCaptureSound } from './sound.js';

const PEG_COLOR = { fill: '#AC3B2A', stroke: '#7A2A1E' };

const VIEWPORT = 420;
const MARGIN = 40;
const STEP = (VIEWPORT - MARGIN * 2) / (SIZE - 1);
const VALID_SET = new Set(VALID_CELLS);

function pointPixel(index) {
  const { row, col } = toCoords(index);
  return { x: MARGIN + col * STEP, y: MARGIN + row * STEP };
}

const T = {
  en: {
    pegsLeft: (n) => `Pegs left: ${n}`,
    moves: (n) => `Moves: ${n}`,
    doneBest: 'Perfect clear! 🎉',
    doneGood: (n) => `No more jumps — finished with ${n} pegs left.`,
    playAgain: 'Play again',
    home: 'Back to Home',
  },
  ko: {
    pegsLeft: (n) => `남은 말: ${n}개`,
    moves: (n) => `이동: ${n}회`,
    doneBest: '완벽하게 클리어했습니다! 🎉',
    doneGood: (n) => `더 이상 넘을 수 없습니다 — 말 ${n}개 남기고 종료.`,
    playAgain: '다시 하기',
    home: '홈으로 돌아가기',
  },
};

export function mountNahologonuGame(root, { lang = 'en' } = {}) {
  const t = T[lang] || T.en;
  const svg = root.querySelector('[data-board-svg]');
  const boardFrame = root.querySelector('[data-board-frame]');
  const statusLabel = root.querySelector('[data-turn-label]');
  const capturedLabel = root.querySelector('[data-captured-label]');
  const newGameBtn = root.querySelector('[data-new-game]');
  const undoBtn = root.querySelector('[data-undo]');
  const winBanner = root.querySelector('[data-win-banner]');
  const winMessage = root.querySelector('[data-win-message]');
  const winPlayAgain = root.querySelector('[data-win-play-again]');
  const swatchRow = root.querySelector('[data-theme-row]');
  const turnDot = root.querySelector('[data-turn-dot]');

  let game = createInitialState();
  let selected = null;
  let history = [];

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
    for (const i of VALID_CELLS) {
      const { row, col } = toCoords(i);
      const rightIndex = row * SIZE + col + 1;
      const downIndex = (row + 1) * SIZE + col;
      if (col < SIZE - 1 && VALID_SET.has(rightIndex)) {
        const a = pointPixel(i);
        const b = pointPixel(rightIndex);
        lineGroup.appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
      }
      if (row < SIZE - 1 && VALID_SET.has(downIndex)) {
        const a = pointPixel(i);
        const b = pointPixel(downIndex);
        lineGroup.appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
      }
    }
    svg.appendChild(lineGroup);

    const targets = legalTargets();
    for (const target of targets) {
      const { x, y } = pointPixel(target);
      svg.appendChild(el('circle', { cx: x, cy: y, r: 10, fill: '#F6F1E6', opacity: '.9' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 6, fill: '#2F6E6A' }));
    }

    if (selected !== null) {
      const { x, y } = pointPixel(selected);
      svg.appendChild(el('circle', { cx: x, cy: y, r: 17, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '4', opacity: '.9' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 15, fill: 'none', stroke: '#2F6E6A', 'stroke-width': '2.5' }));
    }

    for (const i of VALID_CELLS) {
      const { x, y } = pointPixel(i);
      if (game.pegs[i] === true) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: 12, fill: PEG_COLOR.fill, stroke: PEG_COLOR.stroke, 'stroke-width': '2' }));
      } else {
        svg.appendChild(el('circle', { cx: x, cy: y, r: 4, fill: theme.line, opacity: '.5' }));
      }
      const hit = el('circle', { cx: x, cy: y, r: 17, fill: 'transparent', class: 'board-point' });
      hit.addEventListener('click', () => handlePointClick(i));
      svg.appendChild(hit);
    }
  }

  function renderToolbar() {
    if (turnDot) turnDot.style.background = PEG_COLOR.fill;
    statusLabel.textContent = game.finished
      ? (countPegs(game) === 1 ? t.doneBest : t.doneGood(countPegs(game)))
      : t.pegsLeft(countPegs(game));
    if (capturedLabel) capturedLabel.textContent = t.moves(game.moveCount);
    undoBtn.disabled = history.length === 0;
  }

  function showWinBanner() {
    if (!game.finished) return;
    winMessage.textContent = countPegs(game) === 1 ? t.doneBest : t.doneGood(countPegs(game));
    winBanner.classList.add('is-visible');
  }

  function hideWinBanner() {
    winBanner.classList.remove('is-visible');
  }

  function handlePointClick(index) {
    if (game.finished) return;
    const hasPeg = game.pegs[index] === true;

    if (selected === null) {
      if (hasPeg) {
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
      playCaptureSound();
      selected = null;
      renderBoard();
      renderToolbar();
      showWinBanner();
      return;
    }

    selected = hasPeg ? index : null;
    renderBoard();
  }

  function newGame() {
    game = createInitialState();
    selected = null;
    history = [];
    hideWinBanner();
    renderBoard();
    renderToolbar();
    playPlaceSound();
  }

  function undo() {
    if (history.length === 0) return;
    game = history.pop();
    selected = null;
    hideWinBanner();
    renderBoard();
    renderToolbar();
  }

  newGameBtn.addEventListener('click', newGame);
  undoBtn.addEventListener('click', undo);
  winPlayAgain.addEventListener('click', newGame);

  renderThemeSwatches(swatchRow, { current: getStoredTheme(), onSelect: (key) => { setStoredTheme(key); applyTheme(key); } });
  applyTheme(getStoredTheme());
  renderToolbar();
}
