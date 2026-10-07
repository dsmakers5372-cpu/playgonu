import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, legalMovesFrom, move, PLAYERS } from '../src/engine/julgonu.js';

function emptyState(turn = PLAYERS.A) {
  return { pieces: new Array(16).fill(null), turn, winner: null, lastCapture: [] };
}

test('initial state: 4 pieces each on home rows, A to move', () => {
  const state = createInitialState();
  assert.equal(state.turn, PLAYERS.A);
  assert.equal(state.winner, null);
  assert.equal(state.pieces.filter((p) => p === PLAYERS.A).length, 4);
  assert.equal(state.pieces.filter((p) => p === PLAYERS.B).length, 4);
  assert.deepEqual(state.pieces.slice(0, 4), [PLAYERS.A, PLAYERS.A, PLAYERS.A, PLAYERS.A]);
  assert.deepEqual(state.pieces.slice(12, 16), [PLAYERS.B, PLAYERS.B, PLAYERS.B, PLAYERS.B]);
});

test('legal moves are orthogonal onto empty points only', () => {
  const state = createInitialState();
  assert.deepEqual(legalMovesFrom(state, 0), [4]);
});

test('moving onto an occupied point is illegal', () => {
  const state = createInitialState();
  assert.throws(() => move(state, 0, 1), /Illegal move/);
});

test("moving the opponent's piece on your turn is rejected", () => {
  const state = createInitialState();
  assert.throws(() => move(state, 12, 8), /piece/);
});

test('custodian capture: sandwiching an enemy piece removes it', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[4] = PLAYERS.B;
  state.pieces[12] = PLAYERS.A;
  // two extra, uninvolved B pieces so B stays above the 1-piece win threshold
  state.pieces[3] = PLAYERS.B;
  state.pieces[7] = PLAYERS.B;

  const next = move(state, 12, 8);
  assert.deepEqual(next.lastCapture, [4]);
  assert.equal(next.pieces[4], null);
  assert.equal(next.pieces[8], PLAYERS.A);
  assert.equal(next.winner, null);
});

test('win by reduction: capturing an opponent down to one piece ends the game', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[4] = PLAYERS.B;
  state.pieces[12] = PLAYERS.A;
  state.pieces[15] = PLAYERS.B;

  const next = move(state, 12, 8);
  assert.equal(next.winner, PLAYERS.A);
});

test('win by stalemate: a player with no legal move loses', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.B;
  state.pieces[1] = PLAYERS.A;
  state.pieces[4] = PLAYERS.A;
  state.pieces[15] = PLAYERS.B;
  state.pieces[11] = PLAYERS.A;
  state.pieces[14] = PLAYERS.A;
  state.pieces[5] = PLAYERS.A;

  const next = move(state, 5, 9);
  assert.deepEqual(next.lastCapture, []);
  assert.equal(next.winner, PLAYERS.A);
  assert.equal(next.turn, PLAYERS.B);
});

test('no further moves once the game has a winner', () => {
  const state = emptyState();
  state.winner = PLAYERS.A;
  state.pieces[0] = PLAYERS.A;
  assert.throws(() => move(state, 0, 4), /Game already over/);
});
