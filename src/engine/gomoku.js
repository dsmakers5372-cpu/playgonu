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

// Evaluates the stone just placed at `index` (cells already includes it).
// Returns { legal, win, winLine?, reason? }. A genuine five-in-a-row always
// wins outright — that exception (straight from tournament Renju rules) is
// checked before any forbidden-move logic, so a winning move is never
// blocked by an incidental double-three elsewhere on the board.
//
// NOTE: this implements the common simplified version of Renju's forbidden
// points (contiguous open-three / simple-four / overline patterns only). It
// does not detect "broken" three/four shapes a tournament referee would
// also catch — good enough for a casual web opponent, not a certified judge.
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
  const overline = runs.find((r) => r.length >= 6);
  if (overline) return { legal: false, reason: 'overline' };

  const openThrees = runs.filter((r) => r.length === 3 && r.openStart && r.openEnd).length;
  if (openThrees >= 2) return { legal: false, reason: 'double-three' };

  const liveFours = runs.filter((r) => r.length === 4 && (r.openStart || r.openEnd)).length;
  if (liveFours >= 2) return { legal: false, reason: 'double-four' };

  return { legal: true, win: false };
}

export function legalPlacements(state) {
  if (state.winner) return [];
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
