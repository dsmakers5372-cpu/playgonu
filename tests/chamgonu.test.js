import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  legalPlacements,
  legalCaptures,
  legalMovesFrom,
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

test('the opening move is restricted to the outermost square\'s 4 corners', () => {
  const state = createInitialState();
  assert.deepEqual(legalPlacements(state).sort((a, b) => a - b), [0, 2, 4, 6]);
  assert.throws(() => move(state, null, 16), /Illegal placement/); // inner corner, not allowed as the opening move
  assert.throws(() => move(state, null, 1), /Illegal placement/); // outer-ring mid-side, not a corner
  const next = move(state, null, 2); // a legal opening move
  assert.equal(next.pieces[2], PLAYERS.A);
});

test('after the opening move, every other empty point is open again', () => {
  const state = createInitialState();
  const next = move(state, null, 0);
  assert.equal(legalPlacements(next).length, 23);
  assert.deepEqual(legalPlacements(next).includes(0), false);
  assert.deepEqual(legalPlacements(next).includes(16), true); // no longer restricted to corners
});

test('placing on an occupied point is illegal', () => {
  const state = createInitialState();
  const next = move(state, null, 0); // a legal opening move
  assert.throws(() => move(next, null, 0), /Illegal placement/);
});

test('completing a mill triggers a pending capture without passing the turn', () => {
  let state = createInitialState();
  state = move(state, null, 0); // A (opening move — a valid outer corner)
  state = move(state, null, 12); // B
  state = move(state, null, 1); // A
  state = move(state, null, 13); // B
  state = move(state, null, 2); // A completes mill [0,1,2]

  assert.equal(state.pendingCapture, true);
  assert.equal(state.turn, PLAYERS.A);
  assert.deepEqual(state.lastMill.sort((a, b) => a - b), [0, 1, 2]);
  assert.deepEqual(legalCaptures(state).sort((a, b) => a - b), [12, 13]);
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
