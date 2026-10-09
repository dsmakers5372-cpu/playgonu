import { createGrid, QUIET_MOVE_LIMIT, decideByCount } from './board.js';

// 바퀴고누 (Bakwi-gonu, "wheel gonu") — confirmed by two independent sources
// (namu.wiki, artplay.co.kr): a square grid with a "wheel" at each of the 4
// corners. A piece normally steps one square orthogonally; a piece sitting
// ON a corner wheel point may instead "spin" and slide any distance in a
// straight line, capturing the first enemy piece it meets along the way
// (landing on that square) — the only way to capture in this variant.
export const PLAYERS = Object.freeze({ A: 'A', B: 'B' });

const ROWS = 4;
const COLS = 4;
const grid = createGrid(ROWS, COLS);
const WHEEL_POINTS = Object.freeze([
  grid.toIndex(0, 0),
  grid.toIndex(0, COLS - 1),
  grid.toIndex(ROWS - 1, 0),
  grid.toIndex(ROWS - 1, COLS - 1),
]);

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

export function opponent(player) {
  return player === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
}

// A's 4 pieces cluster at the top-left corner, B's at the bottom-right
// corner — "starting at opposite diagonal corners" per the sourced rules.
export function createInitialState() {
  const pieces = new Array(grid.size).fill(null);
  pieces[grid.toIndex(0, 0)] = PLAYERS.A;
  pieces[grid.toIndex(0, 1)] = PLAYERS.A;
  pieces[grid.toIndex(1, 0)] = PLAYERS.A;
  pieces[grid.toIndex(1, 1)] = PLAYERS.A;
  pieces[grid.toIndex(ROWS - 2, COLS - 2)] = PLAYERS.B;
  pieces[grid.toIndex(ROWS - 2, COLS - 1)] = PLAYERS.B;
  pieces[grid.toIndex(ROWS - 1, COLS - 2)] = PLAYERS.B;
  pieces[grid.toIndex(ROWS - 1, COLS - 1)] = PLAYERS.B;
  return { pieces, turn: PLAYERS.A, winner: null, lastCapture: [], quietMoves: 0 };
}

function countPieces(state, player) {
  return state.pieces.reduce((n, p) => (p === player ? n + 1 : n), 0);
}

// Every legal destination from `index`, tagged with whether landing there
// captures (and what). Steps are always available; a wheel slide is only
// available when the mover is currently standing on a wheel point.
function movesFrom(state, index) {
  const player = state.pieces[index];
  if (!player) return [];
  const results = grid.orthogonalNeighbors(index)
    .filter((n) => state.pieces[n] === null)
    .map((to) => ({ to, captures: null }));

  if (WHEEL_POINTS.includes(index)) {
    const { row, col } = grid.toCoords(index);
    for (const { dr, dc } of DIRECTIONS) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        const idx = grid.toIndex(r, c);
        const occupant = state.pieces[idx];
        if (occupant === null) {
          results.push({ to: idx, captures: null });
        } else {
          if (occupant === opponent(player)) results.push({ to: idx, captures: idx });
          break; // blocked either way — own piece, or just captured an enemy
        }
        r += dr;
        c += dc;
      }
    }
  }
  return results;
}

export function legalMovesFrom(state, index) {
  // A wheel point's own square is also a normal step neighbor of itself in
  // some direction, so dedupe — the slide loop and the step list can both
  // produce the immediately-adjacent empty square.
  return [...new Set(movesFrom(state, index).map((m) => m.to))];
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
  const candidates = movesFrom(state, from);
  const chosen = candidates.find((m) => m.to === to);
  if (!chosen) throw new Error('Illegal move');

  const next = { pieces: state.pieces.slice(), turn: state.turn, winner: null, lastCapture: [] };
  if (chosen.captures !== null) {
    next.pieces[chosen.captures] = null;
    next.lastCapture = [chosen.captures];
  }
  next.pieces[to] = player;
  next.pieces[from] = null;

  const opp = opponent(player);
  if (countPieces(next, opp) === 0) {
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

export { grid as bakwigonuGrid, WHEEL_POINTS };
