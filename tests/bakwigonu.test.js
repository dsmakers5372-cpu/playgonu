import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, legalMovesFrom, move, PLAYERS, WHEEL_POINTS } from '../src/engine/bakwigonu.js';

function emptyState(turn = PLAYERS.A) {
  return { pieces: new Array(16).fill(null), turn, winner: null, lastCapture: [] };
}

test('initial state: 4 pieces each clustered at opposite corners, A to move', () => {
  const state = createInitialState();
  assert.equal(state.turn, PLAYERS.A);
  assert.equal(state.winner, null);
  assert.deepEqual(new Set([0, 1, 4, 5].map((i) => state.pieces[i])), new Set([PLAYERS.A]));
  assert.deepEqual(new Set([10, 11, 14, 15].map((i) => state.pieces[i])), new Set([PLAYERS.B]));
  assert.equal(state.pieces.filter(Boolean).length, 8);
});

test('the four corners are the wheel points', () => {
  assert.deepEqual(WHEEL_POINTS.slice().sort((a, b) => a - b), [0, 3, 12, 15]);
});

test('a non-wheel piece may only step one square', () => {
  const state = emptyState();
  state.pieces[1] = PLAYERS.A;
  assert.deepEqual(legalMovesFrom(state, 1).sort((a, b) => a - b), [0, 2, 5]);
});

test('a piece on a wheel point may slide any distance down a clear line', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  const targets = legalMovesFrom(state, 0);
  assert.ok(targets.includes(1) && targets.includes(2) && targets.includes(3), 'slides across the whole clear row');
  assert.ok(targets.includes(4) && targets.includes(8) && targets.includes(12), 'and the whole clear column');
});

test('a wheel slide is blocked by (and cannot capture) your own piece', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[2] = PLAYERS.A;
  const targets = legalMovesFrom(state, 0);
  assert.deepEqual(targets.filter((t) => [1, 2, 3].includes(t)).sort(), [1]);
});

test('a wheel slide captures the first enemy piece in its path and stops there', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[2] = PLAYERS.B;
  state.pieces[12] = PLAYERS.B; // extra pieces so B isn't down to one
  state.pieces[13] = PLAYERS.B;

  const next = move(state, 0, 2);
  assert.deepEqual(next.lastCapture, [2]);
  assert.equal(next.pieces[2], PLAYERS.A);
  assert.equal(next.pieces[0], null);
  assert.equal(next.winner, null);
});

test('a normal one-square step never captures, even onto an adjacent enemy-free spot', () => {
  const state = emptyState();
  state.pieces[1] = PLAYERS.A;
  const next = move(state, 1, 2);
  assert.deepEqual(next.lastCapture, []);
});

test('moving onto an occupied point is illegal', () => {
  const state = createInitialState();
  assert.throws(() => move(state, 0, 1), /Illegal move/);
});

test('win by leaving the opponent a single piece', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[2] = PLAYERS.B;
  state.pieces[13] = PLAYERS.B;

  const next = move(state, 0, 2);
  assert.equal(next.winner, PLAYERS.A);
});

test('win by capturing every enemy piece', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[2] = PLAYERS.B;

  const next = move(state, 0, 2);
  assert.equal(next.winner, PLAYERS.A);
});

test('win by stalemate: a boxed-in non-wheel piece with no steps loses', () => {
  const state = emptyState();
  state.pieces[5] = PLAYERS.B;
  state.pieces[1] = PLAYERS.A;
  state.pieces[4] = PLAYERS.A;
  state.pieces[6] = PLAYERS.A;
  state.pieces[9] = PLAYERS.A;
  state.pieces[12] = PLAYERS.A;

  const next = move(state, 12, 8);
  assert.deepEqual(next.lastCapture, []);
  assert.equal(next.winner, PLAYERS.A);
  assert.equal(next.turn, PLAYERS.B);
});

test('no further moves once the game has a winner', () => {
  const state = emptyState();
  state.winner = PLAYERS.A;
  state.pieces[0] = PLAYERS.A;
  assert.throws(() => move(state, 0, 1), /Game already over/);
});
