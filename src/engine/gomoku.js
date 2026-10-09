export const PLAYERS = Object.freeze({ A: 'A', B: 'B' });
export const RULESETS = Object.freeze({ FREESTYLE: 'freestyle', RENJU: 'renju' });

export const BOARD_SIZE = 15;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const WIN_LENGTH = 5;

const DIRS4 = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

export function opponent(player) {
  return player === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
}

export function toIndex(row, col) {
  return row * BOARD_SIZE + col;
}

export function toCoords(index) {
  return { row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE };
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function createInitialState({ ruleset = RULESETS.FREESTYLE } = {}) {
  return {
    cells: new Array(CELL_COUNT).fill(null),
    turn: PLAYERS.A,
    winner: null,
    winLine: [],
    lastMove: null,
    moveCount: 0,
    ruleset,
  };
}

// The run of same-player stones through (row, col) along one axis, assuming
// `cells[toIndex(row, col)]` is already `player`. Reports total length and
// whether each flank is a genuinely empty, on-board cell (an "open" end) —
// the building block for both win detection and Renju's forbidden-move
// checks below.
function axisRun(cells, row, col, dr, dc, player) {
  const runCells = [toIndex(row, col)];
  let r = row + dr;
  let c = col + dc;
  while (inBounds(r, c) && cells[toIndex(r, c)] === player) {
    runCells.push(toIndex(r, c));
    r += dr;
    c += dc;
  }
  const openEnd = inBounds(r, c) && cells[toIndex(r, c)] === null;
  let r2 = row - dr;
  let c2 = col - dc;
  while (inBounds(r2, c2) && cells[toIndex(r2, c2)] === player) {
    runCells.unshift(toIndex(r2, c2));
    r2 -= dr;
    c2 -= dc;
  }
  const openStart = inBounds(r2, c2) && cells[toIndex(r2, c2)] === null;
  return { length: runCells.length, openStart, openEnd, cells: runCells };
}

// Points on the line through (row, col) along (dr, dc) where one more black
// stone would make exactly five *including* (row, col) — the "five points"
// of a four. Offsets are counted from (row, col).
function fivePoints(cells, row, col, dr, dc, player) {
  const points = [];
  for (let k = -4; k <= 4; k++) {
    if (k === 0) continue;
    const r = row + k * dr;
    const c = col + k * dc;
    if (!inBounds(r, c) || cells[toIndex(r, c)] !== null) continue;
    cells[toIndex(r, c)] = player;
    const run = axisRun(cells, r, c, dr, dc, player);
    cells[toIndex(r, c)] = null;
    // Exactly five (an overline doesn't count) and the run reaches (row, col).
    if (run.length === WIN_LENGTH && run.cells.includes(toIndex(row, col))) points.push(k);
  }
  return points;
}

// How many fours the stone at (row, col) makes along one line: an open
// ("straight") four ●●●● with both ends free is one four; two separate fives
// reachable in the same line (●●●_●_●●● with the stone in the middle) is two.
function foursOnLine(cells, row, col, dr, dc, player) {
  const pts = fivePoints(cells, row, col, dr, dc, player);
  if (pts.length === 2 && Math.abs(pts[0] - pts[1]) === WIN_LENGTH) return 1;
  return Math.min(pts.length, 2);
}

// Is there a "three" through (row, col) along this line — a shape one more
// stone turns into an open four, including broken shapes (●●_●, ●_●●)? Per
// the RIF rules the stone completing that open four must itself be a legal
// move, which is checked one level deep.
function threeOnLine(cells, row, col, dr, dc, player, depth) {
  for (let k = -4; k <= 4; k++) {
    if (k === 0) continue;
    const r = row + k * dr;
    const c = col + k * dc;
    if (!inBounds(r, c) || cells[toIndex(r, c)] !== null) continue;
    const q = toIndex(r, c);
    cells[q] = player;
    const pts = fivePoints(cells, row, col, dr, dc, player);
    const openFour = pts.some((a) => pts.some((b) => b - a === WIN_LENGTH));
    const ok = openFour && (depth <= 0 || renjuFoul(cells, q, player, depth - 1) === null);
    cells[q] = null;
    if (ok) return true;
  }
  return false;
}

// For black's stone just placed at index (cells includes it): 'overline' |
// 'double-four' | 'double-three' | null. Five-in-a-row is handled earlier.
function renjuFoul(cells, index, player, depth = 1) {
  const { row, col } = toCoords(index);
  const runs = DIRS4.map(({ dr, dc }) => axisRun(cells, row, col, dr, dc, player));
  if (runs.some((r) => r.length >= 6)) return 'overline';
  if (runs.some((r) => r.length === WIN_LENGTH)) return null;
  // Only lines with another black stone within reach can make a three or a
  // four; a single such line can still hold two fours (●●●_●_●●●) but never
  // two threes, so the (costly) three check needs at least two lines.
  const lines = DIRS4.filter(({ dr, dc }) => {
    for (let k = -4; k <= 4; k++) {
      if (k === 0) continue;
      const r = row + k * dr;
      const c = col + k * dc;
      if (inBounds(r, c) && cells[toIndex(r, c)] === player) return true;
    }
    return false;
  });
  let fours = 0;
  const noFour = [];
  for (const { dr, dc } of lines) {
    const f = foursOnLine(cells, row, col, dr, dc, player);
    if (f) fours += f;
    else noFour.push({ dr, dc });
  }
  if (fours >= 2) return 'double-four';
  if (noFour.length < 2) return null;
  let threes = 0;
  for (const { dr, dc } of noFour) {
    if (threeOnLine(cells, row, col, dr, dc, player, depth) && ++threes >= 2) return 'double-three';
  }
  return null;
}

const CENTER = toIndex(Math.floor(BOARD_SIZE / 2), Math.floor(BOARD_SIZE / 2));

// Evaluates the stone just placed at `index` (cells already includes it).
// Returns { legal, win, winLine?, reason? }. A genuine five-in-a-row always
// wins outright — that exception (straight from tournament Renju rules) is
// checked before any forbidden-move logic, so a winning move is never
// blocked by an incidental double-three elsewhere on the board.
//
// Renju forbidden points follow the RIF definitions: a "four" is any shape
// one stone from an exact five (●●●●, ●●●_●, ●●_●●), a "three" any shape one
// stone from an open four (●●●, ●●_●, ●_●●) whose completing stone would be
// legal; two of either, or six-plus in a row, is forbidden for black.
export function analyzeMove(cells, index, player, ruleset) {
  const { row, col } = toCoords(index);
  const runs = DIRS4.map(({ dr, dc }) => axisRun(cells, row, col, dr, dc, player));

  const exactFive = runs.find((r) => r.length === WIN_LENGTH);
  if (exactFive) return { legal: true, win: true, winLine: exactFive.cells };

  if (ruleset !== RULESETS.RENJU || player !== PLAYERS.A) {
    const anyWin = runs.find((r) => r.length >= WIN_LENGTH);
    if (anyWin) return { legal: true, win: true, winLine: anyWin.cells };
    return { legal: true, win: false };
  }

  // Renju forbidden-move checks — first player (A) only, and only once we
  // know this move isn't an outright win.
  const reason = renjuFoul(cells.slice(), index, player);
  return reason ? { legal: false, reason } : { legal: true, win: false };
}

// Renju (RIF): black's first stone goes on the center point.
const mustTakeCenter = (state) => state.ruleset === RULESETS.RENJU && state.moveCount === 0;

export function legalPlacements(state) {
  if (state.winner) return [];
  if (mustTakeCenter(state)) return [CENTER];
  const targets = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (state.cells[i] !== null) continue;
    if (state.ruleset === RULESETS.RENJU && state.turn === PLAYERS.A) {
      const trial = state.cells.slice();
      trial[i] = PLAYERS.A;
      if (!analyzeMove(trial, i, PLAYERS.A, state.ruleset).legal) continue;
    }
    targets.push(i);
  }
  return targets;
}

// Renju-forbidden points for the player about to move (empty outside of
// Renju, or when it's not A's turn) — purely informational, for the UI to
// mark with an "x" the way reference Gomoku sites do.
export function forbiddenPoints(state) {
  if (state.winner || state.ruleset !== RULESETS.RENJU || state.turn !== PLAYERS.A) return [];
  const forbidden = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (state.cells[i] !== null) continue;
    const trial = state.cells.slice();
    trial[i] = PLAYERS.A;
    if (!analyzeMove(trial, i, PLAYERS.A, state.ruleset).legal) forbidden.push(i);
  }
  return forbidden;
}

export function allLegalMoves(state, player) {
  if (state.winner || player !== state.turn) return [];
  return legalPlacements(state).map((to) => ({ from: null, to }));
}

export function move(state, _from, to) {
  if (state.winner) throw new Error('Game already over');
  if (to < 0 || to >= CELL_COUNT || state.cells[to] !== null) throw new Error('Illegal placement');
  if (mustTakeCenter(state) && to !== CENTER) throw new Error('Illegal placement: the first stone goes on the center point');
  const player = state.turn;
  const cells = state.cells.slice();
  cells[to] = player;

  const analysis = analyzeMove(cells, to, player, state.ruleset);
  if (!analysis.legal) throw new Error(`Illegal placement: ${analysis.reason}`);

  const moveCount = state.moveCount + 1;
  if (analysis.win) {
    return { ...state, cells, turn: opponent(player), winner: player, winLine: analysis.winLine, lastMove: to, moveCount };
  }
  if (moveCount >= CELL_COUNT) {
    return { ...state, cells, turn: opponent(player), winner: 'draw', winLine: [], lastMove: to, moveCount };
  }
  return { ...state, cells, turn: opponent(player), winner: null, winLine: [], lastMove: to, moveCount };
}
