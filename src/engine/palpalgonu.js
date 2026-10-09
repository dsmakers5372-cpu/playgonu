import { createGrid, QUIET_MOVE_LIMIT, decideByCount } from './board.js';

// 팔팔고누 (Palpal-gonu, "eight-eight gonu") — same 줄고누-family rules as
// Jul-gonu/Daseotjul-gonu (custodian capture, reduce-to-one-or-stalemate
// win); a dictionary entry confirms 8 pieces per player lined up on their
// own back row, which only fits an 8-wide board, so this uses an 8x8-point
// grid. Board size/movement step beyond the piece count are extrapolated
// from the rest of the family (low-medium confidence — see tasks/main.md).
export const PLAYERS = Object.freeze({ A: 'A', B: 'B' });

const ROWS = 8;
const COLS = 8;
const grid = createGrid(ROWS, COLS);

export function opponent(player) {
  return player === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
}

export function createInitialState() {
  const pieces = new Array(grid.size).fill(null);
  for (let col = 0; col < COLS; col++) {
    pieces[grid.toIndex(0, col)] = PLAYERS.A;
    pieces[grid.toIndex(ROWS - 1, col)] = PLAYERS.B;
  }
  return { pieces, turn: PLAYERS.A, winner: null, lastCapture: [], quietMoves: 0 };
}

export function legalMovesFrom(state, index) {
  const player = state.pieces[index];
  if (!player) return [];
  return grid.orthogonalNeighbors(index).filter((n) => state.pieces[n] === null);
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

function countPieces(state, player) {
  return state.pieces.reduce((n, p) => (p === player ? n + 1 : n), 0);
}

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

function applyCustodianCaptures(state, movedTo, player) {
  const { row, col } = grid.toCoords(movedTo);
  const captured = [];
  for (const { dr, dc } of DIRECTIONS) {
    const midRow = row + dr;
    const midCol = col + dc;
    const farRow = row + dr * 2;
    const farCol = col + dc * 2;
    if (midRow < 0 || midRow >= ROWS || midCol < 0 || midCol >= COLS) continue;
    if (farRow < 0 || farRow >= ROWS || farCol < 0 || farCol >= COLS) continue;
    const midIndex = grid.toIndex(midRow, midCol);
    const farIndex = grid.toIndex(farRow, farCol);
    if (state.pieces[midIndex] === opponent(player) && state.pieces[farIndex] === player) {
      captured.push(midIndex);
    }
  }
  for (const index of captured) state.pieces[index] = null;
  return captured;
}

export function move(state, from, to) {
  if (state.winner) throw new Error('Game already over');
  const player = state.pieces[from];
  if (player !== state.turn) throw new Error("Not this player's piece");
  if (!legalMovesFrom(state, from).includes(to)) throw new Error('Illegal move');

  const next = { pieces: state.pieces.slice(), turn: state.turn, winner: null, lastCapture: [] };
  next.pieces[to] = player;
  next.pieces[from] = null;
  next.lastCapture = applyCustodianCaptures(next, to, player);

  const opp = opponent(player);
  if (countPieces(next, opp) <= 1) {
    next.turn = opp;
    next.winner = player;
    return next;
  }

  next.turn = opp;
  next.quietMoves = next.lastCapture.length > 0 ? 0 : (state.quietMoves ?? 0) + 1;
  if (!hasAnyLegalMove(next, opp)) next.winner = player;
  else if (next.quietMoves >= QUIET_MOVE_LIMIT) {
    next.winner = decideByCount(next.pieces, PLAYERS.A, PLAYERS.B);
    next.decidedByCount = true;
  }
  return next;
}

export { grid as palpalgonuGrid };
