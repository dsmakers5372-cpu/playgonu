import { createGrid } from './board.js';

// 문살고누 (Munsal-gonu, "lattice-door gonu") — distinct from the custodian-
// capture 줄고누 family: pieces step one square orthogonally, OR jump over
// an adjacent piece (friend or foe) into the empty point directly beyond it
// in a straight line. Jumping an opponent's piece captures it; jumping your
// own just hops over it. A piece that captures by jumping must keep jumping
// with that same piece if another jump is immediately available (checkers-
// style chain), matching the one source found: "뛰어넘고 따 먹을 수 있고
// 계속해서 넘을 수 있다". Board size (5x5 points) and the exact chaining
// rule are extrapolated — low confidence, see tasks/main.md.
export const PLAYERS = Object.freeze({ A: 'A', B: 'B' });

const ROWS = 5;
const COLS = 5;
const grid = createGrid(ROWS, COLS);

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

export function opponent(player) {
  return player === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
}

export function createInitialState() {
  const pieces = new Array(grid.size).fill(null);
  for (let col = 0; col < COLS; col++) {
    pieces[grid.toIndex(0, col)] = PLAYERS.A;
    pieces[grid.toIndex(ROWS - 1, col)] = PLAYERS.B;
  }
  return { pieces, turn: PLAYERS.A, winner: null, lastCapture: [], mustContinueFrom: null };
}

function countPieces(state, player) {
  return state.pieces.reduce((n, p) => (p === player ? n + 1 : n), 0);
}

// Jumps available FROM `index` for whoever owns that piece — each entry is
// { to, over, captures } where `over` is the hopped point and `captures` is
// true only when `over` holds an opponent piece.
function jumpsFrom(state, index) {
  const player = state.pieces[index];
  if (!player) return [];
  const { row, col } = grid.toCoords(index);
  const results = [];
  for (const { dr, dc } of DIRECTIONS) {
    const overRow = row + dr;
    const overCol = col + dc;
    const toRow = row + dr * 2;
    const toCol = col + dc * 2;
    if (toRow < 0 || toRow >= ROWS || toCol < 0 || toCol >= COLS) continue;
    const overIndex = grid.toIndex(overRow, overCol);
    const toIndex = grid.toIndex(toRow, toCol);
    const overPiece = state.pieces[overIndex];
    if (!overPiece || state.pieces[toIndex] !== null) continue;
    results.push({ to: toIndex, over: overIndex, captures: overPiece === opponent(player) });
  }
  return results;
}

function stepsFrom(state, index) {
  const player = state.pieces[index];
  if (!player) return [];
  return grid.orthogonalNeighbors(index).filter((n) => state.pieces[n] === null);
}

// Simple steps are only offered when not in the middle of a forced jump
// chain; jumps are always offered for the piece that's chaining.
export function legalMovesFrom(state, index) {
  if (state.mustContinueFrom !== null) {
    return state.mustContinueFrom === index ? jumpsFrom(state, index).map((j) => j.to) : [];
  }
  const jumps = jumpsFrom(state, index).map((j) => j.to);
  return [...jumps, ...stepsFrom(state, index)];
}

export function allLegalMoves(state, player) {
  const moves = [];
  for (let i = 0; i < state.pieces.length; i++) {
    if (state.pieces[i] !== player) continue;
    for (const to of legalMovesFrom(state, i)) moves.push({ from: i, to });
  }
  return moves;
}

export function hasAnyLegalMove(state, player) {
  for (let i = 0; i < state.pieces.length; i++) {
    if (state.pieces[i] === player && legalMovesFrom(state, i).length > 0) return true;
  }
  return false;
}

export function move(state, from, to) {
  if (state.winner) throw new Error('Game already over');
  const player = state.pieces[from];
  if (player !== state.turn) throw new Error("Not this player's piece");
  if (!legalMovesFrom(state, from).includes(to)) throw new Error('Illegal move');

  const next = { pieces: state.pieces.slice(), turn: state.turn, winner: null, lastCapture: [], mustContinueFrom: null };
  const jump = jumpsFrom(state, from).find((j) => j.to === to);

  next.pieces[to] = player;
  next.pieces[from] = null;
  if (jump) {
    if (jump.captures) {
      next.pieces[jump.over] = null;
      next.lastCapture = [jump.over];
    }
    // Chain: the same piece must keep jumping if another jump is open to it.
    if (jumpsFrom(next, to).length > 0) {
      next.mustContinueFrom = to;
      return next;
    }
  }

  const opp = opponent(player);
  if (countPieces(next, opp) === 0) {
    next.turn = opp;
    next.winner = player;
    return next;
  }
  next.turn = opp;
  if (!hasAnyLegalMove(next, opp)) next.winner = player;
  return next;
}

export { grid as munsalgonuGrid };
