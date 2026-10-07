import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, legalMovesFrom, move, PLAYERS } from '../src/engine/patgonu.js';

function emptyState(turn = PLAYERS.A) {
  return { pieces: new Array(25).fill(null), turn, winner: null, lastCapture: [] };
}

test('initial state: 5 pieces each on home rows, A to move', () => {
  const state = createInitialState();
  assert.equal(state.turn, PLAYERS.A);
  assert.equal(state.pieces.filter((p) => p === PLAYERS.A).length, 5);
  assert.equal(state.pieces.filter((p) => p === PLAYERS.B).length, 5);
  assert.deepEqual(state.pieces.slice(0, 5), new Array(5).fill(PLAYERS.A));
  assert.deepEqual(state.pieces.slice(20, 25), new Array(5).fill(PLAYERS.B));
});

test('pieces slide any number of empty squares, stopping before the first obstruction', () => {
  const state = createInitialState();
  // Column 0: rows 1-3 are empty, row 4 is held by B — the slide can reach
  // every empty square in between but not land on, or jump past, row 4.
  assert.deepEqual(legalMovesFrom(state, 0), [5, 10, 15]);
});

test('moving onto an occupied point is illegal', () => {
  const state = createInitialState();
  assert.throws(() => move(state, 0, 1), /Illegal move/);
});

test("moving the opponent's piece on your turn is rejected", () => {
  const state = createInitialState();
  assert.throws(() => move(state, 20, 15), /piece/);
});

test('a slide that lands in a sandwich captures the enemy piece in between', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A; // anchor
  state.pieces[5] = PLAYERS.B; // victim, column 0 row 1
  state.pieces[20] = PLAYERS.A; // mover, column 0 row 4
  state.pieces[23] = PLAYERS.B; // uninvolved, keeps B above 0 pieces
  state.pieces[24] = PLAYERS.B;

  const next = move(state, 20, 10); // slides 2 squares up, landing just past the victim
  assert.deepEqual(next.lastCapture, [5]);
  assert.equal(next.pieces[5], null);
  assert.equal(next.pieces[10], PLAYERS.A);
});

test('win by elimination: capturing the last enemy piece ends the game', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[5] = PLAYERS.B;
  state.pieces[20] = PLAYERS.A;

  const next = move(state, 20, 10);
  assert.equal(next.winner, PLAYERS.A);
});

test('win by stalemate: a player boxed in on all four sides loses', () => {
  const state = emptyState();
  state.pieces[12] = PLAYERS.B; // center, fully boxed in
  state.pieces[7] = PLAYERS.A;
  state.pieces[17] = PLAYERS.A;
  state.pieces[11] = PLAYERS.A;
  state.pieces[13] = PLAYERS.A;
  state.pieces[0] = PLAYERS.A; // filler, makes the triggering move

  const next = move(state, 0, 1);
  assert.deepEqual(next.lastCapture, []);
  assert.equal(next.winner, PLAYERS.A);
});

test('no further moves once the game has a winner', () => {
  const state = emptyState();
  state.winner = PLAYERS.A;
  state.pieces[0] = PLAYERS.A;
  assert.throws(() => move(state, 0, 5), /Game already over/);
});
