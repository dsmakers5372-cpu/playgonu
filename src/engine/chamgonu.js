import { decideByCount } from './board.js';

export const PLAYERS = Object.freeze({ A: 'A', B: 'B' });
// Moving phase only: this many moves in a row with no capture (both sides)
// and the game goes to whoever has more pieces left — equal is a draw.
// A PlayGonu rule (not from a historical source), so Cham-gonu keeps its own value.
export const QUIET_MOVE_LIMIT = 20;

// Two rule sets. 'korean' is the default (captured points stay unusable while
// placing, 20-move count rule). 'western' follows Twelve Men's Morris: no dead
// points, a player down to exactly 3 pieces may fly to any empty point, and
// the 20-move count rule is replaced by a draw when someone is stuck on 3
// pieces and no capture happens for FLYING_STALL_LIMIT moves (both sides
// combined, i.e. 10 each).
export const RULESETS = Object.freeze(['korean', 'western']);
export const FLYING_STALL_LIMIT = 20;
export const FLYING_AT = 3;

const POINT_COUNT = 24;
const PIECES_PER_PLAYER = 12;
const WIN_AT_OR_BELOW = 2;

// Cham-gonu's board — three concentric squares (8 points each), confirmed
// against a reference diagram (user-supplied, 2026-10-07): the midpoint of
// each side connects straight across all three squares (as in standard
// Nine Men's Morris), AND — unlike the standard Western game — the
// corners also connect diagonally across all three squares. That second
// set of diagonals is what distinguishes this board.
export const BOARD_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
  [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 8],
  [16, 17], [17, 18], [18, 19], [19, 20], [20, 21], [21, 22], [22, 23], [23, 16],
  // orthogonal spokes, through the mid-side points
  [1, 9], [9, 17],
  [3, 11], [11, 19],
  [5, 13], [13, 21],
  [7, 15], [15, 23],
  // diagonal spokes, through the corner points
  [0, 8], [8, 16],
  [2, 10], [10, 18],
  [4, 12], [12, 20],
  [6, 14], [14, 22],
];

const MILLS = [
  [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
  [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
  [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
  [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23],
  [0, 8, 16], [2, 10, 18], [4, 12, 20], [6, 14, 22],
];

function buildAdjacency(edges) {
  const adjacency = Array.from({ length: POINT_COUNT }, () => []);
  for (const [a, b] of edges) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }
  return adjacency;
}
const ADJACENCY = buildAdjacency(BOARD_EDGES);
const MILLS_BY_POINT = Array.from({ length: POINT_COUNT }, (_, i) => MILLS.filter((m) => m.includes(i)));

export function opponent(player) {
  return player === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
}

export function normalizeRuleset(ruleset) {
  return ruleset === 'western' ? 'western' : 'korean';
}

export function createInitialState({ ruleset } = {}) {
  return {
    ruleset: normalizeRuleset(ruleset),
    pieces: new Array(POINT_COUNT).fill(null),
    phase: 'placing',
    placedCount: { [PLAYERS.A]: 0, [PLAYERS.B]: 0 },
    deadForPlacement: new Array(POINT_COUNT).fill(false),
    turn: PLAYERS.A,
    winner: null,
    pendingCapture: false,
    lastMill: [],
    lastMove: null,
    quietMoves: 0,
  };
}

function countPieces(state, player) {
  return state.pieces.reduce((n, p) => (p === player ? n + 1 : n), 0);
}

function formsMill(pieces, point, player) {
  return MILLS_BY_POINT[point].some((mill) => mill.every((i) => pieces[i] === player));
}

function millAt(pieces, point, player) {
  return MILLS_BY_POINT[point].find((mill) => mill.every((i) => pieces[i] === player)) || [];
}

// Standard "protected mill" rule: you may not break up an opponent's
// standing mill by capturing from it, unless every one of their pieces is
// in some mill (then any piece is fair game).
function capturablePoints(state, player) {
  const opp = opponent(player);
  const oppPoints = [];
  for (let i = 0; i < POINT_COUNT; i++) if (state.pieces[i] === opp) oppPoints.push(i);
  const notInMill = oppPoints.filter((i) => !formsMill(state.pieces, i, opp));
  return notInMill.length > 0 ? notInMill : oppPoints;
}

// Plain one-step slides, ignoring flying (used by the AI's mobility score).
export function slideTargetsFrom(state, index) {
  return ADJACENCY[index].filter((n) => state.pieces[n] === null);
}

export function legalMovesFrom(state, index) {
  if (state.winner || state.pendingCapture || state.phase !== 'moving') return [];
  if (state.pieces[index] !== state.turn) return [];
  if (state.ruleset === 'western' && countPieces(state, state.turn) === FLYING_AT) {
    const targets = [];
    for (let i = 0; i < POINT_COUNT; i++) if (state.pieces[i] === null) targets.push(i);
    return targets;
  }
  return slideTargetsFrom(state, index);
}

export function legalPlacements(state) {
  if (state.winner || state.pendingCapture || state.phase !== 'placing') return [];
  const targets = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    if (state.pieces[i] === null && !state.deadForPlacement[i]) targets.push(i);
  }
  return targets;
}

export function legalCaptures(state) {
  if (state.winner || !state.pendingCapture) return [];
  return capturablePoints(state, state.turn);
}

export function allLegalMoves(state, player) {
  if (state.winner || player !== state.turn) return [];
  if (state.pendingCapture) return legalCaptures(state).map((to) => ({ from: null, to }));
  if (state.phase === 'placing') return legalPlacements(state).map((to) => ({ from: null, to }));
  const moves = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    if (state.pieces[i] !== player) continue;
    for (const to of legalMovesFrom(state, i)) moves.push({ from: i, to });
  }
  return moves;
}

export function hasAnyLegalMove(state, player) {
  return allLegalMoves(state, player).length > 0;
}

function cloneState(state) {
  return {
    ruleset: normalizeRuleset(state.ruleset),
    pieces: state.pieces.slice(),
    phase: state.phase,
    placedCount: { ...state.placedCount },
    deadForPlacement: state.deadForPlacement.slice(),
    turn: state.turn,
    winner: null,
    pendingCapture: false,
    lastMill: [],
    lastMove: state.lastMove ?? null,
    quietMoves: state.quietMoves ?? 0,
  };
}

function advanceTurnAndCheckEnd(next, mover) {
  const opp = opponent(mover);
  // The "reduced to 2" loss only applies once the opponent has placed all
  // 12 of their pieces — otherwise they just haven't put any on the board
  // yet, which isn't the same as having lost them to capture.
  if (next.placedCount[opp] >= PIECES_PER_PLAYER && countPieces(next, opp) <= WIN_AT_OR_BELOW) {
    next.winner = mover;
    next.turn = opp;
    return;
  }
  next.turn = opp;
  if (next.phase === 'placing' && next.placedCount[PLAYERS.A] >= PIECES_PER_PLAYER && next.placedCount[PLAYERS.B] >= PIECES_PER_PLAYER) {
    next.phase = 'moving';
    // Every point taken and nothing captured while placing: nobody can move.
    // That's a draw, not a loss for whoever happens to move first.
    if (next.pieces.every((p) => p !== null)) {
      next.winner = 'draw';
      return;
    }
  }
  if (next.phase === 'moving' && !hasAnyLegalMove(next, opp)) {
    next.winner = mover;
    return;
  }
  if (next.phase !== 'moving') return;
  if (next.ruleset === 'western') {
    const stuckOnThree = countPieces(next, PLAYERS.A) === FLYING_AT || countPieces(next, PLAYERS.B) === FLYING_AT;
    if (stuckOnThree && next.quietMoves >= FLYING_STALL_LIMIT) {
      next.winner = 'draw';
      next.decidedByStall = true;
    }
  } else if (next.quietMoves >= QUIET_MOVE_LIMIT) {
    next.winner = decideByCount(next.pieces, PLAYERS.A, PLAYERS.B);
    next.decidedByCount = true;
  }
}

// A placement or move that completes a mill puts the mover into a
// "pendingCapture" state — their turn doesn't pass until they remove one
// enemy piece (see legalCaptures' protected-mill rule).
function finishTurnOrCapture(next, player, justPlacedOrMovedTo) {
  if (formsMill(next.pieces, justPlacedOrMovedTo, player)) {
    next.lastMill = millAt(next.pieces, justPlacedOrMovedTo, player);
    if (capturablePoints(next, player).length > 0) {
      next.pendingCapture = true;
      next.turn = player;
      return next;
    }
  }
  advanceTurnAndCheckEnd(next, player);
  return next;
}

function applyPlacement(state, to) {
  const player = state.turn;
  const next = cloneState(state);
  next.pieces[to] = player;
  next.placedCount[player] = state.placedCount[player] + 1;
  next.lastMove = to;
  return finishTurnOrCapture(next, player, to);
}

function applyMovement(state, from, to) {
  const player = state.turn;
  const next = cloneState(state);
  next.pieces[to] = player;
  next.pieces[from] = null;
  next.lastMove = to;
  next.quietMoves = (state.quietMoves ?? 0) + 1;
  return finishTurnOrCapture(next, player, to);
}

function applyCapture(state, point) {
  const player = state.turn;
  const next = cloneState(state);
  next.pieces[point] = null;
  if (next.phase === 'placing' && next.ruleset !== 'western') next.deadForPlacement[point] = true;
  next.pendingCapture = false;
  next.quietMoves = 0;
  advanceTurnAndCheckEnd(next, player);
  return next;
}

// Unified entry point so this plugs into the same minimax AI driver as the
// other variants: `from` is ignored for placements and captures (both are
// single-target actions), used only during the moving phase.
export function move(state, from, to) {
  if (state.winner) throw new Error('Game already over');
  if (state.pendingCapture) {
    if (!legalCaptures(state).includes(to)) throw new Error('Illegal capture');
    return applyCapture(state, to);
  }
  if (state.phase === 'placing') {
    if (!legalPlacements(state).includes(to)) throw new Error('Illegal placement');
    return applyPlacement(state, to);
  }
  const player = state.pieces[from];
  if (player !== state.turn) throw new Error("Not this player's piece");
  if (!legalMovesFrom(state, from).includes(to)) throw new Error('Illegal move');
  return applyMovement(state, from, to);
}
