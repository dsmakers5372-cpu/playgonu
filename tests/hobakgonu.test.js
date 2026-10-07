import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, legalMovesFrom, move, PLAYERS } from '../src/engine/hobakgonu.js';

function emptyState(turn = PLAYERS.A) {
  return {
    pieces: new Array(11).fill(null),
    turn,
    winner: null,
    blockedStart: new Array(11).fill(false),
  };
}

test('initial state: 3 pieces each on the two start lines', () => {
  const state = createInitialState();
  assert.equal(state.turn, PLAYERS.A);
  assert.equal(state.winner, null);
  assert.deepEqual(state.pieces.slice(0, 3), [PLAYERS.A, PLAYERS.A, PLAYERS.A]);
  assert.deepEqual(state.pieces.slice(8, 11), [PLAYERS.B, PLAYERS.B, PLAYERS.B]);
  assert.ok(state.pieces.slice(3, 8).every((p) => p === null));
});

test('legal moves follow the drawn lines onto empty, unblocked points', () => {
  const state = createInitialState();
  // 1's neighbors are 0, 2 and 3; the first two are still held by A's own
  // pieces at the start, so only the move down into the wheel is legal.
  assert.deepEqual(legalMovesFrom(state, 1), [3]);
});

test('moving onto an occupied point is illegal', () => {
  const state = createInitialState();
  assert.throws(() => move(state, 1, 0), /Illegal move/);
});

test("moving the opponent's piece on your turn is rejected", () => {
  const state = createInitialState();
  assert.throws(() => move(state, 9, 7), /piece/);
});

test('a start point is permanently blocked once its piece leaves', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[1] = PLAYERS.A;

  const next = move(state, 1, 3);
  assert.equal(next.blockedStart[1], true);
  assert.deepEqual(legalMovesFrom(next, 0), []); // 0's only neighbor (1) is now blocked
});

test('win by blockade: no captures, only trapping the opponent', () => {
  const state = emptyState();
  // B's two reachable pieces (9's neighbors are 7, 8, 10) get boxed in; a
  // filler A move elsewhere triggers the post-move win check.
  state.pieces[7] = PLAYERS.A;
  state.pieces[8] = PLAYERS.A;
  state.pieces[10] = PLAYERS.A;
  state.pieces[9] = PLAYERS.B;
  state.pieces[1] = PLAYERS.A; // filler, moves to 3

  const next = move(state, 1, 3);
  assert.equal(next.winner, PLAYERS.A);
});

test('no further moves once the game has a winner', () => {
  const state = emptyState();
  state.winner = PLAYERS.A;
  state.pieces[1] = PLAYERS.A;
  assert.throws(() => move(state, 1, 3), /Game already over/);
});
