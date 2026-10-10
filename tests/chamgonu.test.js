import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  legalPlacements,
  legalCaptures,
  legalMovesFrom,
  allLegalMoves,
  QUIET_MOVE_LIMIT,
  FLYING_STALL_LIMIT,
  move,
  PLAYERS,
} from '../src/engine/chamgonu.js';

function emptyState(overrides = {}) {
  return {
    pieces: new Array(24).fill(null),
    phase: 'placing',
    placedCount: { A: 0, B: 0 },
    deadForPlacement: new Array(24).fill(false),
    turn: PLAYERS.A,
    winner: null,
    pendingCapture: false,
    lastMill: [],
    ...overrides,
  };
}

test('initial state: empty 24-point board, placing phase, A to move', () => {
  const state = createInitialState();
  assert.equal(state.phase, 'placing');
  assert.equal(state.turn, PLAYERS.A);
  assert.equal(state.winner, null);
});

test('the opening move may go on any of the 24 points', () => {
  const state = createInitialState();
  assert.equal(legalPlacements(state).length, 24);
  for (const p of [0, 1, 9, 16]) {
    const next = move(state, null, p);
    assert.equal(next.pieces[p], PLAYERS.A);
  }
});

test('after the opening move, every other empty point stays open', () => {
  const state = createInitialState();
  const next = move(state, null, 0);
  assert.equal(legalPlacements(next).length, 23);
  assert.deepEqual(legalPlacements(next).includes(0), false);
  assert.deepEqual(legalPlacements(next).includes(16), true);
});

test('placing on an occupied point is illegal', () => {
  const state = createInitialState();
  const next = move(state, null, 0); // a legal opening move
  assert.throws(() => move(next, null, 0), /Illegal placement/);
});

test('completing a mill triggers a pending capture without passing the turn', () => {
  let state = createInitialState();
  state = move(state, null, 0); // A (opening move)
  state = move(state, null, 12); // B
  state = move(state, null, 1); // A
  state = move(state, null, 13); // B
  state = move(state, null, 2); // A completes mill [0,1,2]

  assert.equal(state.pendingCapture, true);
  assert.equal(state.turn, PLAYERS.A);
  assert.deepEqual(state.lastMill.sort((a, b) => a - b), [0, 1, 2]);
  assert.deepEqual(legalCaptures(state).sort((a, b) => a - b), [12, 13]);
});

// The strategy guide's worked example: holding 0·2 (outer top side) and
// 8·10 (middle top side), one piece shuttling 1↔9 closes a mill on every
// move, and the point it leaves is surrounded by its own pieces, so the
// opponent can never step in to block it.
test('running mill: shuttling one piece between two mills captures every turn and cannot be blocked', () => {
  const pieces = new Array(24).fill(null);
  for (const i of [0, 1, 2, 8, 10, 16, 18]) pieces[i] = PLAYERS.A;
  for (const i of [4, 5, 6, 7, 12, 13, 14, 19, 20, 21, 22, 23]) pieces[i] = PLAYERS.B;
  let state = emptyState({ pieces, phase: 'moving', placedCount: { A: 12, B: 12 } });

  for (const [from, to] of [[1, 9], [9, 1], [1, 9]]) {
    state = move(state, from, to);
    assert.equal(state.pendingCapture, true, `${from}->${to} should close a mill`);
    state = move(state, null, legalCaptures(state)[0]);
    assert.equal(state.turn, PLAYERS.B);
    const blocks = [];
    for (let i = 0; i < 24; i++) {
      if (state.pieces[i] === PLAYERS.B && legalMovesFrom(state, i).includes(from)) blocks.push(i);
    }
    assert.deepEqual(blocks, [], `B should not be able to step into vacated point ${from}`);
    state = { ...state, turn: PLAYERS.A };
  }
  assert.equal(state.pieces.filter((p) => p === PLAYERS.B).length, 9);
});

test('lastMove tracks the latest placement and is kept through the capture that follows a mill', () => {
  let state = createInitialState();
  assert.equal(state.lastMove, null);
  state = move(state, null, 0);
  assert.equal(state.lastMove, 0);
  state = move(state, null, 12);
  assert.equal(state.lastMove, 12);
  state = move(state, null, 1);
  state = move(state, null, 13);
  state = move(state, null, 2); // A completes mill [0,1,2]
  assert.equal(state.lastMove, 2);
  state = move(state, null, 12); // A captures — the mill-making piece stays marked
  assert.equal(state.lastMove, 2);
});

test('capturing during the placing phase removes the piece and marks the point dead', () => {
  let state = createInitialState();
  state = move(state, null, 0); // A (opening move)
  state = move(state, null, 12);
  state = move(state, null, 1);
  state = move(state, null, 13);
  state = move(state, null, 2); // mill, pending capture

  const next = move(state, null, 12);
  assert.equal(next.pieces[12], null);
  assert.equal(next.deadForPlacement[12], true);
  assert.equal(next.pendingCapture, false);
  assert.equal(next.turn, PLAYERS.B);
  assert.deepEqual(legalPlacements(next).includes(12), false);
});

test('a point marked dead during placing cannot be placed on again', () => {
  let state = createInitialState();
  state = move(state, null, 0); // A (opening move)
  state = move(state, null, 12);
  state = move(state, null, 1);
  state = move(state, null, 13);
  state = move(state, null, 2);
  state = move(state, null, 12); // capture, point 12 now dead

  assert.throws(() => move(state, null, 12), /Illegal placement/);
});

test('protected mill: a piece inside a standing mill cannot be captured while another target exists', () => {
  const state = emptyState();
  state.pieces[8] = PLAYERS.B;
  state.pieces[9] = PLAYERS.B;
  state.pieces[10] = PLAYERS.B; // mill [8,9,10]
  state.pieces[20] = PLAYERS.B; // loose piece, not in a mill
  state.pendingCapture = true;
  state.turn = PLAYERS.A;

  assert.deepEqual(legalCaptures(state), [20]);
});

test('protected mill: when every enemy piece is in a mill, any of them can be captured', () => {
  const state = emptyState();
  state.pieces[8] = PLAYERS.B;
  state.pieces[9] = PLAYERS.B;
  state.pieces[10] = PLAYERS.B; // mill [8,9,10], B's only pieces
  state.pendingCapture = true;
  state.turn = PLAYERS.A;

  assert.deepEqual(legalCaptures(state).sort((a, b) => a - b), [8, 9, 10]);
});

test('moving phase: a piece may only slide to an adjacent empty point', () => {
  const state = emptyState({ phase: 'moving', placedCount: { A: 12, B: 12 } });
  state.pieces[0] = PLAYERS.A;
  // Corner point 0 connects to its two ring neighbors (1, 7) plus the
  // diagonal spoke into the middle square's corner (8).
  assert.deepEqual(legalMovesFrom(state, 0).sort((a, b) => a - b), [1, 7, 8]);
});

test('a corner-to-corner diagonal line also forms a mill', () => {
  const state = emptyState({ phase: 'moving', placedCount: { A: 12, B: 12 } });
  state.pieces[0] = PLAYERS.A;
  state.pieces[8] = PLAYERS.A;
  state.pieces[17] = PLAYERS.A; // mover, adjacent to 16, completes [0,8,16] on arrival
  state.pieces[20] = PLAYERS.B; // something to capture
  const next = move(state, 17, 16);
  assert.equal(next.pendingCapture, true);
  assert.deepEqual(next.lastMill.sort((a, b) => a - b), [0, 8, 16]);
});

test('win by reduction: the opponent dropping to 2 pieces ends the game', () => {
  const state = emptyState({ phase: 'moving', placedCount: { A: 12, B: 12 } });
  state.pieces[1] = PLAYERS.A;
  state.pieces[9] = PLAYERS.A;
  state.pieces[18] = PLAYERS.A; // mover: 18 is adjacent to 17, completes mill [1,9,17] on arrival
  state.pieces[16] = PLAYERS.B;
  state.pieces[20] = PLAYERS.B;
  state.pieces[22] = PLAYERS.B; // B's 3 pieces, none forming a mill together
  state.turn = PLAYERS.A;

  const next = move(state, 18, 17);
  assert.equal(next.pendingCapture, true);
  assert.deepEqual(next.lastMill.sort((a, b) => a - b), [1, 9, 17]);
  const afterCapture = move(next, null, 20);
  assert.equal(afterCapture.winner, PLAYERS.A);
});

test('no further moves once the game has a winner', () => {
  const state = emptyState({ winner: PLAYERS.A });
  assert.throws(() => move(state, null, 3), /Game already over/);
});

test('a board filled while placing, with no mill ever made, is a draw', () => {
  // Both sides always pick the first placement that doesn't make a mill.
  let state = createInitialState();
  while (state.phase === 'placing' && !state.winner) {
    const quiet = allLegalMoves(state, state.turn).find((m) => !move(state, m.from, m.to).pendingCapture);
    assert.ok(quiet, 'a mill-free placement exists');
    state = move(state, quiet.from, quiet.to);
  }
  assert.ok(state.pieces.every((p) => p !== null));
  assert.equal(state.winner, 'draw');
});

test('moving phase: after the quiet-move limit, more pieces wins', () => {
  const state = emptyState({ phase: 'moving', placedCount: { A: 12, B: 12 }, quietMoves: QUIET_MOVE_LIMIT - 1 });
  for (const p of [0, 5, 19]) state.pieces[p] = PLAYERS.A;
  for (const p of [10, 12, 14, 22]) state.pieces[p] = PLAYERS.B;
  const next = move(state, 0, 7);
  assert.equal(next.pendingCapture, false);
  assert.equal(next.winner, PLAYERS.B);
  assert.equal(next.decidedByCount, true);
});

test('moving phase: a capture resets the quiet-move count', () => {
  const state = emptyState({ phase: 'moving', placedCount: { A: 12, B: 12 }, quietMoves: 20 });
  for (const p of [0, 1, 3]) state.pieces[p] = PLAYERS.A;
  for (const p of [10, 12, 14, 22]) state.pieces[p] = PLAYERS.B;
  const milled = move(state, 3, 2); // 0-1-2 mill
  assert.equal(milled.pendingCapture, true);
  const next = move(milled, null, 10);
  assert.equal(next.quietMoves, 0);
  assert.equal(next.winner, null);
});

// ---- Western rules (Twelve Men's Morris style) ----

test('ruleset defaults to korean and survives moves; unknown values fall back to korean', () => {
  assert.equal(createInitialState().ruleset, 'korean');
  assert.equal(createInitialState({ ruleset: 'bogus' }).ruleset, 'korean');
  const w = createInitialState({ ruleset: 'western' });
  assert.equal(w.ruleset, 'western');
  assert.equal(move(w, null, 0).ruleset, 'western');
  assert.equal(move(createInitialState(), null, 0).ruleset, 'korean');
});

test('western: a captured point is not blocked while placing', () => {
  let state = createInitialState({ ruleset: 'western' });
  state = move(state, null, 0);
  state = move(state, null, 12);
  state = move(state, null, 1);
  state = move(state, null, 13);
  state = move(state, null, 2);
  state = move(state, null, 12); // capture
  assert.equal(state.deadForPlacement[12], false);
  assert.ok(legalPlacements(state).includes(12));
});

test('western: a side with exactly 3 pieces may fly to any empty point; others still slide', () => {
  const state = emptyState({ ruleset: 'western', phase: 'moving', placedCount: { A: 12, B: 12 } });
  for (const p of [0, 5, 19]) state.pieces[p] = PLAYERS.A;
  for (const p of [10, 12, 14, 22]) state.pieces[p] = PLAYERS.B;
  assert.equal(legalMovesFrom(state, 0).length, 24 - 7);
  const next = move(state, 0, 20);
  assert.equal(next.pieces[20], PLAYERS.A);
  assert.equal(next.pieces[0], null);
  const bTurn = { ...next, turn: PLAYERS.B };
  assert.deepEqual(legalMovesFrom(bTurn, 10).sort((a, b) => a - b), [2, 9, 11, 18]);
});

test('western: 4 pieces do not fly, and korean 3-piece side does not fly', () => {
  const four = emptyState({ ruleset: 'western', phase: 'moving', placedCount: { A: 12, B: 12 } });
  for (const p of [0, 5, 19, 22]) four.pieces[p] = PLAYERS.A;
  for (const p of [10, 12, 14, 21]) four.pieces[p] = PLAYERS.B;
  assert.deepEqual(legalMovesFrom(four, 0).sort((a, b) => a - b), [1, 7, 8]);
  const korean = emptyState({ phase: 'moving', placedCount: { A: 12, B: 12 } });
  for (const p of [0, 5, 19]) korean.pieces[p] = PLAYERS.A;
  for (const p of [10, 12, 14, 22]) korean.pieces[p] = PLAYERS.B;
  assert.deepEqual(legalMovesFrom(korean, 0).sort((a, b) => a - b), [1, 7, 8]);
});

test('western: a flying piece can close a mill from anywhere', () => {
  const state = emptyState({ ruleset: 'western', phase: 'moving', placedCount: { A: 12, B: 12 } });
  for (const p of [0, 1, 20]) state.pieces[p] = PLAYERS.A;
  for (const p of [10, 12, 14, 16]) state.pieces[p] = PLAYERS.B;
  const next = move(state, 20, 2);
  assert.equal(next.pendingCapture, true);
  assert.deepEqual(next.lastMill.sort((a, b) => a - b), [0, 1, 2]);
});

test('western: no 20-move count win; stuck on 3 pieces with no capture is a draw', () => {
  const nearLimit = emptyState({ ruleset: 'western', phase: 'moving', placedCount: { A: 12, B: 12 }, quietMoves: QUIET_MOVE_LIMIT - 1 });
  for (const p of [0, 5, 19, 3]) nearLimit.pieces[p] = PLAYERS.A;
  for (const p of [10, 12, 14, 22]) nearLimit.pieces[p] = PLAYERS.B;
  const keepGoing = move(nearLimit, 0, 7);
  assert.equal(keepGoing.winner, null);

  const stall = emptyState({ ruleset: 'western', phase: 'moving', placedCount: { A: 12, B: 12 }, quietMoves: FLYING_STALL_LIMIT - 1 });
  for (const p of [0, 5, 19]) stall.pieces[p] = PLAYERS.A;
  for (const p of [10, 12, 14, 22]) stall.pieces[p] = PLAYERS.B;
  const drawn = move(stall, 0, 20);
  assert.equal(drawn.winner, 'draw');
  assert.equal(drawn.decidedByStall, true);
  assert.notEqual(drawn.decidedByCount, true);
});

test('western: the stall draw does not trigger when nobody is on exactly 3 pieces', () => {
  const state = emptyState({ ruleset: 'western', phase: 'moving', placedCount: { A: 12, B: 12 }, quietMoves: FLYING_STALL_LIMIT + 5 });
  for (const p of [0, 5, 19, 3]) state.pieces[p] = PLAYERS.A;
  for (const p of [10, 12, 14, 22]) state.pieces[p] = PLAYERS.B;
  assert.equal(move(state, 0, 7).winner, null);
});

test('western: reducing the opponent to 2 still wins', () => {
  const state = emptyState({ ruleset: 'western', phase: 'moving', placedCount: { A: 12, B: 12 } });
  state.pieces[1] = PLAYERS.A;
  state.pieces[9] = PLAYERS.A;
  state.pieces[18] = PLAYERS.A;
  state.pieces[16] = PLAYERS.B;
  state.pieces[20] = PLAYERS.B;
  state.pieces[22] = PLAYERS.B;
  const next = move(state, 18, 17);
  assert.equal(move(next, null, 20).winner, PLAYERS.A);
});
