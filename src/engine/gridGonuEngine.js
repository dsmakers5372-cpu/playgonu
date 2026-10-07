import { createGrid } from './board.js';

export const PLAYERS = Object.freeze({ A: 'A', B: 'B' });

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];
const DIAGONALS = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];

// A factory for the "line gonu" family (Jul-gonu, and — per Korean sources —
// 다섯줄고누/여섯줄고누/아홉줄고누 etc, which "play the exact same way, just
// with more lines"): an N×M grid, each side fills its home row, pieces step
// (or slide) along the grid lines, and a moved piece captures by sandwiching
// an enemy between itself and another of the mover's own pieces.
export function createGridGonuEngine({ rows, cols, diagonals = false, slide = false, winAt = 1 }) {
  const grid = createGrid(rows, cols);
  const directions = diagonals ? [...DIRECTIONS, ...DIAGONALS] : DIRECTIONS;

  function opponent(player) {
    return player === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
  }

  function createInitialState() {
    const pieces = new Array(grid.size).fill(null);
    for (let col = 0; col < cols; col++) {
      pieces[grid.toIndex(0, col)] = PLAYERS.A;
      pieces[grid.toIndex(rows - 1, col)] = PLAYERS.B;
    }
    return { pieces, turn: PLAYERS.A, winner: null, lastCapture: [] };
  }

  function legalMovesFrom(state, index) {
    const player = state.pieces[index];
    if (!player) return [];
    const { row, col } = grid.toCoords(index);
    const moves = [];
    for (const { dr, dc } of directions) {
      if (!slide) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        const idx = grid.toIndex(r, c);
        if (state.pieces[idx] === null) moves.push(idx);
        continue;
      }
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < rows && c >= 0 && c < cols) {
        const idx = grid.toIndex(r, c);
        if (state.pieces[idx] !== null) break;
        moves.push(idx);
        r += dr;
        c += dc;
      }
    }
    return moves;
  }

  function allLegalMoves(state, player) {
    const moves = [];
    for (let i = 0; i < state.pieces.length; i++) {
      if (state.pieces[i] !== player) continue;
      for (const to of legalMovesFrom(state, i)) moves.push({ from: i, to });
    }
    return moves;
  }

  function hasAnyLegalMove(state, player) {
    for (let i = 0; i < state.pieces.length; i++) {
      if (state.pieces[i] === player && legalMovesFrom(state, i).length > 0) return true;
    }
    return false;
  }

  function countPieces(state, player) {
    return state.pieces.reduce((n, p) => (p === player ? n + 1 : n), 0);
  }

  function applyCustodianCaptures(state, movedTo, player) {
    const { row, col } = grid.toCoords(movedTo);
    const captured = [];
    for (const { dr, dc } of directions) {
      const midRow = row + dr;
      const midCol = col + dc;
      const farRow = row + dr * 2;
      const farCol = col + dc * 2;
      if (midRow < 0 || midRow >= rows || midCol < 0 || midCol >= cols) continue;
      if (farRow < 0 || farRow >= rows || farCol < 0 || farCol >= cols) continue;
      const midIndex = grid.toIndex(midRow, midCol);
      const farIndex = grid.toIndex(farRow, farCol);
      if (state.pieces[midIndex] === opponent(player) && state.pieces[farIndex] === player) {
        captured.push(midIndex);
      }
    }
    for (const index of captured) state.pieces[index] = null;
    return captured;
  }

  function move(state, from, to) {
    if (state.winner) throw new Error('Game already over');
    const player = state.pieces[from];
    if (player !== state.turn) throw new Error("Not this player's piece");
    if (!legalMovesFrom(state, from).includes(to)) throw new Error('Illegal move');

    const next = { pieces: state.pieces.slice(), turn: state.turn, winner: null, lastCapture: [] };
    next.pieces[to] = player;
    next.pieces[from] = null;
    next.lastCapture = applyCustodianCaptures(next, to, player);

    const opp = opponent(player);
    if (countPieces(next, opp) <= winAt) {
      next.turn = opp;
      next.winner = player;
      return next;
    }

    next.turn = opp;
    if (!hasAnyLegalMove(next, opp)) next.winner = player;
    return next;
  }

  return { PLAYERS, grid, opponent, createInitialState, legalMovesFrom, allLegalMoves, hasAnyLegalMove, move };
}
