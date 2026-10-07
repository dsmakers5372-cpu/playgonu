import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, legalMovesFrom, move, PLAYERS } from '../src/engine/munsalgonu.js';

function emptyState(turn = PLAYERS.A) {
  return { pieces: new Array(25).fill(null), turn, winner: null, lastCapture: [], mustContinueFrom: null };
}

test('initial state: 5 pieces each on home rows, A to move', () => {
  const state = createInitialState();
  assert.equal(state.turn, PLAYERS.A);
  assert.equal(state.winner, null);
  assert.deepEqual(state.pieces.slice(0, 5), new Array(5).fill(PLAYERS.A));
  assert.deepEqual(state.pieces.slice(20, 25), new Array(5).fill(PLAYERS.B));
});

test('a simple step onto an adjacent empty point is legal', () => {
  const state = createInitialState();
  assert.ok(legalMovesFrom(state, 0).includes(5));
  const next = move(state, 0, 5);
  assert.equal(next.pieces[5], PLAYERS.A);
  assert.equal(next.pieces[0], null);
  assert.equal(next.mustContinueFrom, null);
});

test('moving onto an occupied adjacent point is illegal', () => {
  const state = createInitialState();
  assert.throws(() => move(state, 0, 1), /Illegal move/);
});

test('jumping over an enemy piece captures it', () => {
  const state = emptyState();
  state.pieces[6] = PLAYERS.A;
  state.pieces[7] = PLAYERS.B;
  state.pieces[20] = PLAYERS.B; // extra piece so B isn't wiped out this turn

  const next = move(state, 6, 8);
  assert.equal(next.pieces[7], null);
  assert.equal(next.pieces[8], PLAYERS.A);
  assert.equal(next.pieces[6], null);
  assert.deepEqual(next.lastCapture, [7]);
  assert.equal(next.mustContinueFrom, null);
  assert.equal(next.turn, PLAYERS.B);
  assert.equal(next.winner, null);
});

test('jumping over your own piece just hops it, no capture', () => {
  const state = emptyState();
  state.pieces[6] = PLAYERS.A;
  state.pieces[7] = PLAYERS.A;
  state.pieces[20] = PLAYERS.B;

  const next = move(state, 6, 8);
  assert.equal(next.pieces[7], PLAYERS.A, 'the hopped-over own piece stays on the board');
  assert.equal(next.pieces[8], PLAYERS.A);
  assert.deepEqual(next.lastCapture, []);
});

test('a capturing jump that opens another jump must continue with the same piece', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[1] = PLAYERS.B;
  state.pieces[3] = PLAYERS.B;
  state.pieces[20] = PLAYERS.B; // keeps B above 0 pieces after the first capture

  const afterFirst = move(state, 0, 2);
  assert.deepEqual(afterFirst.lastCapture, [1]);
  assert.equal(afterFirst.mustContinueFrom, 2, 'another jump is open from the landing square, so the turn is not over');
  assert.equal(afterFirst.turn, PLAYERS.A);
  assert.equal(afterFirst.winner, null);
  assert.deepEqual(legalMovesFrom(afterFirst, 2), [4]);
  assert.deepEqual(legalMovesFrom(afterFirst, 20), [], 'only the chaining piece may move');

  const afterSecond = move(afterFirst, 2, 4);
  assert.deepEqual(afterSecond.lastCapture, [3]);
  assert.equal(afterSecond.mustContinueFrom, null);
  assert.equal(afterSecond.turn, PLAYERS.B);
});

test('win by capturing every enemy piece', () => {
  const state = emptyState();
  state.pieces[6] = PLAYERS.A;
  state.pieces[7] = PLAYERS.B;

  const next = move(state, 6, 8);
  assert.equal(next.winner, PLAYERS.A);
});

test('win by stalemate: a boxed-in player with no steps or jumps loses', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.B;
  state.pieces[1] = PLAYERS.A;
  state.pieces[2] = PLAYERS.A;
  state.pieces[5] = PLAYERS.A;
  state.pieces[10] = PLAYERS.A;
  state.pieces[20] = PLAYERS.A;

  const next = move(state, 20, 15);
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
