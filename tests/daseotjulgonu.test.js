import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, legalMovesFrom, move, PLAYERS } from '../src/engine/daseotjulgonu.js';

function emptyState(turn = PLAYERS.A) {
  return { pieces: new Array(25).fill(null), turn, winner: null, lastCapture: [] };
}

test('initial state: 5 pieces each on home rows, A to move', () => {
  const state = createInitialState();
  assert.equal(state.turn, PLAYERS.A);
  assert.equal(state.winner, null);
  assert.equal(state.pieces.filter((p) => p === PLAYERS.A).length, 5);
  assert.equal(state.pieces.filter((p) => p === PLAYERS.B).length, 5);
  assert.deepEqual(state.pieces.slice(0, 5), [PLAYERS.A, PLAYERS.A, PLAYERS.A, PLAYERS.A, PLAYERS.A]);
  assert.deepEqual(state.pieces.slice(20, 25), [PLAYERS.B, PLAYERS.B, PLAYERS.B, PLAYERS.B, PLAYERS.B]);
});

test('legal moves are orthogonal onto empty points only', () => {
  const state = createInitialState();
  assert.deepEqual(legalMovesFrom(state, 0), [5]);
});

test('moving onto an occupied point is illegal', () => {
  const state = createInitialState();
  assert.throws(() => move(state, 0, 1), /Illegal move/);
});

test("moving the opponent's piece on your turn is rejected", () => {
  const state = createInitialState();
  assert.throws(() => move(state, 20, 15), /piece/);
});

test('custodian capture: sandwiching an enemy piece removes it', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[5] = PLAYERS.B;
  state.pieces[15] = PLAYERS.A;
  state.pieces[4] = PLAYERS.B;
  state.pieces[9] = PLAYERS.B;

  const next = move(state, 15, 10);
  assert.deepEqual(next.lastCapture, [5]);
  assert.equal(next.pieces[5], null);
  assert.equal(next.pieces[10], PLAYERS.A);
  assert.equal(next.winner, null);
});

test('win by reduction: capturing an opponent down to one piece ends the game', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[5] = PLAYERS.B;
  state.pieces[15] = PLAYERS.A;
  state.pieces[24] = PLAYERS.B;

  const next = move(state, 15, 10);
  assert.equal(next.winner, PLAYERS.A);
});

test('win by stalemate: a player whose every piece is boxed in loses', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.B;
  state.pieces[1] = PLAYERS.A;
  state.pieces[5] = PLAYERS.A;
  state.pieces[24] = PLAYERS.B;
  state.pieces[19] = PLAYERS.A;
  state.pieces[23] = PLAYERS.A;
  state.pieces[2] = PLAYERS.A;

  const next = move(state, 2, 7);
  assert.deepEqual(next.lastCapture, []);
  assert.equal(next.winner, PLAYERS.A);
  assert.equal(next.turn, PLAYERS.B);
});

test('no further moves once the game has a winner', () => {
  const state = emptyState();
  state.winner = PLAYERS.A;
  state.pieces[0] = PLAYERS.A;
  assert.throws(() => move(state, 0, 5), /Game already over/);
});
