export const PLAYERS = Object.freeze({ A: 'A', B: 'B' });

// Board reconstructed from the diagram at namu.wiki/w/호박고누 (2026-10-07):
// a 3-point "start line" above and below a wheel (center + 4 rim points,
// connected both by the two spokes through the center and by the rim
// itself). Labels follow the wiki's ㄱㄴㄷ / ㄹㅁㅂ naming.
//
//   0(ㄱ)-1(ㄴ)-2(ㄷ)        top start line
//          |
//          3(top) --- 5(left)
//         /|  \      /  |
//        / |   \    /   |
//       6(right)-4(center)
//        \ |   /    \   |
//         \|  /      \  |
//          7(bottom) -- (rim closes 5-7 and 6-7)
//          |
//   8(ㄹ)-9(ㅁ)-10(ㅂ)      bottom start line
//
// Confidence note: the wiki page states the rules in prose but never gives
// exact coordinates, so this topology is a best-effort reading of its
// diagram, not a verified transcription — revisit before treating it as
// authoritative.
export const BOARD_EDGES = [
  [0, 1], [1, 2],
  [1, 3],
  [3, 4], [4, 7],
  [4, 5], [4, 6],
  [3, 5], [3, 6],
  [5, 7], [6, 7],
  [7, 9],
  [8, 9], [9, 10],
];

export const START_POINTS = {
  [PLAYERS.A]: [0, 1, 2],
  [PLAYERS.B]: [8, 9, 10],
};
const ALL_START_POINTS = [...START_POINTS[PLAYERS.A], ...START_POINTS[PLAYERS.B]];
const POINT_COUNT = 11;

function buildAdjacency(edges) {
  const adjacency = Array.from({ length: POINT_COUNT }, () => []);
  for (const [a, b] of edges) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }
  return adjacency;
}

const ADJACENCY = buildAdjacency(BOARD_EDGES);

export function opponent(player) {
  return player === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
}

export function createInitialState() {
  const pieces = new Array(POINT_COUNT).fill(null);
  for (const i of START_POINTS[PLAYERS.A]) pieces[i] = PLAYERS.A;
  for (const i of START_POINTS[PLAYERS.B]) pieces[i] = PLAYERS.B;
  return { pieces, turn: PLAYERS.A, winner: null, blockedStart: new Array(POINT_COUNT).fill(false) };
}

export function legalMovesFrom(state, index) {
  const player = state.pieces[index];
  if (!player) return [];
  return ADJACENCY[index].filter((n) => state.pieces[n] === null && !state.blockedStart[n]);
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

  const next = {
    pieces: state.pieces.slice(),
    turn: state.turn,
    winner: null,
    blockedStart: state.blockedStart.slice(),
  };
  next.pieces[to] = player;
  next.pieces[from] = null;
  // A piece can only ever sit on a start point if it hasn't moved yet (once
  // vacated, a start point is blocked below), so leaving one always means
  // "first move off start" — and that square goes out of play for good.
  if (ALL_START_POINTS.includes(from)) next.blockedStart[from] = true;

  // No captures in Hobak-gonu either: win only by leaving the opponent with
  // no legal move. (namu.wiki/w/호박고누)
  const opp = opponent(player);
  next.turn = opp;
  if (!hasAnyLegalMove(next, opp)) next.winner = player;
  return next;
}
