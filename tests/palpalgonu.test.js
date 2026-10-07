import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, legalMovesFrom, move, PLAYERS } from '../src/engine/palpalgonu.js';

function emptyState(turn = PLAYERS.A) {
  return { pieces: new Array(64).fill(null), turn, winner: null, lastCapture: [] };
}

test('initial state: 8 pieces each on home rows, A to move', () => {
  const state = createInitialState();
  assert.equal(state.turn, PLAYERS.A);
  assert.equal(state.winner, null);
  assert.equal(state.pieces.filter((p) => p === PLAYERS.A).length, 8);
  assert.equal(state.pieces.filter((p) => p === PLAYERS.B).length, 8);
  assert.deepEqual(state.pieces.slice(0, 8), new Array(8).fill(PLAYERS.A));
  assert.deepEqual(state.pieces.slice(56, 64), new Array(8).fill(PLAYERS.B));
});

test('legal moves are orthogonal onto empty points only', () => {
  const state = createInitialState();
  assert.deepEqual(legalMovesFrom(state, 0), [8]);
});

test('moving onto an occupied point is illegal', () => {
  const state = createInitialState();
  assert.throws(() => move(state, 0, 1), /Illegal move/);
});

test("moving the opponent's piece on your turn is rejected", () => {
  const state = createInitialState();
  assert.throws(() => move(state, 56, 48), /piece/);
});

test('custodian capture: sandwiching an enemy piece removes it', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[8] = PLAYERS.B;
  state.pieces[24] = PLAYERS.A;
  state.pieces[7] = PLAYERS.B;
  state.pieces[15] = PLAYERS.B;

  const next = move(state, 24, 16);
  assert.deepEqual(next.lastCapture, [8]);
  assert.equal(next.pieces[8], null);
  assert.equal(next.pieces[16], PLAYERS.A);
  assert.equal(next.winner, null);
});

test('win by reduction: capturing an opponent down to one piece ends the game', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[8] = PLAYERS.B;
  state.pieces[24] = PLAYERS.A;
  state.pieces[63] = PLAYERS.B;

  const next = move(state, 24, 16);
  assert.equal(next.winner, PLAYERS.A);
});

test('win by stalemate: a player whose every piece is boxed in loses', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.B;
  state.pieces[1] = PLAYERS.A;
  state.pieces[8] = PLAYERS.A;
  state.pieces[63] = PLAYERS.B;
  state.pieces[62] = PLAYERS.A;
  state.pieces[55] = PLAYERS.A;
  state.pieces[2] = PLAYERS.A;

  const next = move(state, 2, 10);
  assert.deepEqual(next.lastCapture, []);
  assert.equal(next.winner, PLAYERS.A);
  assert.equal(next.turn, PLAYERS.B);
});

test('no further moves once the game has a winner', () => {
  const state = emptyState();
  state.winner = PLAYERS.A;
  state.pieces[0] = PLAYERS.A;
  assert.throws(() => move(state, 0, 8), /Game already over/);
});
