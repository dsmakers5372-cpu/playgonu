export const PLAYERS = Object.freeze({ A: 'A', B: 'B' });

// Points follow the traditional 9-point "well" board: label 1 is the top
// apex, label 9 the bottom apex, label 4 the blocked center "well".
// Internally points are 0-indexed (index = label - 1).
export const WELL_INDEX = 3; // label 4

// Every drawn line on the board, well included — for rendering only.
export const BOARD_EDGES = [
  [0, 1], [0, 4],
  [1, 2], [1, 3],
  [4, 3], [4, 5],
  [2, 3], [3, 5],
  [6, 2], [6, 3],
  [7, 3], [7, 5],
  [8, 6], [8, 7],
];

function buildAdjacency(edges, excludePoint) {
  const adjacency = Array.from({ length: 9 }, () => []);
  for (const [a, b] of edges) {
    if (a === excludePoint || b === excludePoint) continue;
    adjacency[a].push(b);
    adjacency[b].push(a);
  }
  return adjacency;
}

// The well is drawn but never enters play, so it has no usable edges.
const MOVE_ADJACENCY = buildAdjacency(BOARD_EDGES, WELL_INDEX);

export function opponent(player) {
  return player === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
}

export function createInitialState() {
  const pieces = new Array(9).fill(null);
  pieces[1] = PLAYERS.A; // label 2
  pieces[4] = PLAYERS.A; // label 5
  pieces[6] = PLAYERS.B; // label 7
  pieces[7] = PLAYERS.B; // label 8
  return { pieces, turn: PLAYERS.A, winner: null };
}

export function legalMovesFrom(state, index) {
  const player = state.pieces[index];
  if (!player) return [];
  return MOVE_ADJACENCY[index].filter((n) => state.pieces[n] === null);
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
  return allLegalMoves(state, player).length > 0;
}

export function move(state, from, to) {
  if (state.winner) throw new Error('Game already over');
  const player = state.pieces[from];
  if (player !== state.turn) throw new Error("Not this player's piece");
  if (!legalMovesFrom(state, from).includes(to)) throw new Error('Illegal move');

  const next = { pieces: state.pieces.slice(), turn: state.turn, winner: null };
  next.pieces[to] = player;
  next.pieces[from] = null;

  // Umul-gonu has no captures at all: the only way to win is to leave the
  // opponent with no legal move. (namu.wiki/w/우물고누 — "필승법이 존재하지 않는다")
  const opp = opponent(player);
  next.turn = opp;
  if (!hasAnyLegalMove(next, opp)) next.winner = player;
  return next;
}
