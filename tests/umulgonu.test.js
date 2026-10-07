import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, legalMovesFrom, move, PLAYERS } from '../src/engine/umulgonu.js';

function emptyState(turn = PLAYERS.A) {
  return { pieces: new Array(9).fill(null), turn, winner: null };
}

test('initial state: 2 pieces each, A on top, B on bottom, well empty', () => {
  const state = createInitialState();
  assert.equal(state.turn, PLAYERS.A);
  assert.equal(state.winner, null);
  assert.equal(state.pieces.filter((p) => p === PLAYERS.A).length, 2);
  assert.equal(state.pieces.filter((p) => p === PLAYERS.B).length, 2);
  assert.equal(state.pieces[3], null); // the well (label 4) is never occupied
});

test('legal moves only follow the drawn lines onto empty points', () => {
  const state = createInitialState();
  assert.deepEqual(legalMovesFrom(state, 1).sort(), [0, 2]);
});

test('the well is never a legal destination', () => {
  const state = emptyState();
  state.pieces[1] = PLAYERS.A;
  assert.ok(!legalMovesFrom(state, 1).includes(3));
});

test('moving onto an occupied point is illegal', () => {
  const state = createInitialState();
  assert.throws(() => move(state, 1, 4), /Illegal move/);
});

test("moving the opponent's piece on your turn is rejected", () => {
  const state = createInitialState();
  assert.throws(() => move(state, 6, 2), /piece/);
});

test('win by blockade: no captures, only trapping the opponent', () => {
  const state = emptyState();
  // Pre-built blockade: B's two pieces (1, 4) each have both neighbors
  // already held by A (0 and 2 for point 1; 0 and 5 for point 4).
  state.pieces[0] = PLAYERS.A;
  state.pieces[2] = PLAYERS.A;
  state.pieces[5] = PLAYERS.A;
  state.pieces[6] = PLAYERS.A; // filler piece that makes the triggering move
  state.pieces[1] = PLAYERS.B;
  state.pieces[4] = PLAYERS.B;

  const next = move(state, 6, 8);
  assert.equal(next.winner, PLAYERS.A);
  assert.equal(next.pieces[1], PLAYERS.B);
  assert.equal(next.pieces[4], PLAYERS.B);
});

test('no further moves once the game has a winner', () => {
  const state = emptyState();
  state.winner = PLAYERS.A;
  state.pieces[1] = PLAYERS.A;
  assert.throws(() => move(state, 1, 0), /Game already over/);
});
