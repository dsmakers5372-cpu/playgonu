import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  legalMovesFrom,
  hasAnyLegalMove,
  move,
  countPegs,
  VALID_CELLS,
  CENTER,
} from '../src/engine/nahologonu.js';

test('initial state: 32 pegs on a 33-point cross board, center empty', () => {
  const state = createInitialState();
  assert.equal(VALID_CELLS.length, 33);
  assert.equal(countPegs(state), 32);
  assert.equal(state.pegs[CENTER], false);
  assert.equal(state.finished, false);
  assert.equal(state.moveCount, 0);
});

test('a peg two steps from an empty point, with a peg in between, can jump there', () => {
  const state = createInitialState();
  // row1,col3 (index 10) jumps over row2,col3 (index 17) into the center.
  assert.deepEqual(legalMovesFrom(state, 10), [CENTER]);
});

test('jumping removes the hopped peg and moves the jumper', () => {
  const state = createInitialState();
  const next = move(state, 10, CENTER);
  assert.equal(next.pegs[10], false);
  assert.equal(next.pegs[17], false, 'the jumped-over peg is removed');
  assert.equal(next.pegs[CENTER], true);
  assert.equal(countPegs(next), 31);
  assert.equal(next.moveCount, 1);
  assert.deepEqual(next.lastJump, { from: 10, over: 17, to: CENTER });
});

test('jumping with no peg in the middle is illegal', () => {
  const state = createInitialState();
  state.pegs[17] = false; // clear the piece that would have been jumped
  assert.throws(() => move(state, 10, CENTER), /Illegal move/);
});

test('jumping onto an already-occupied point is illegal', () => {
  const state = createInitialState();
  state.pegs[CENTER] = true; // landing point no longer empty
  assert.throws(() => move(state, 10, CENTER), /Illegal move/);
});

test('hasAnyLegalMove is false once only one peg remains', () => {
  const state = createInitialState();
  for (const i of VALID_CELLS) state.pegs[i] = false;
  state.pegs[CENTER] = true;
  assert.equal(hasAnyLegalMove(state), false);
});

test('the game marks itself finished once no jump remains', () => {
  const state = createInitialState();
  for (const i of VALID_CELLS) state.pegs[i] = false;
  state.pegs[10] = true;
  state.pegs[17] = true;
  state.pegs[CENTER] = false;
  // exactly one jump left on the whole board
  const next = move(state, 10, CENTER);
  assert.equal(next.finished, true);
  assert.equal(countPegs(next), 1);
});

test('no further moves once the puzzle is finished', () => {
  const state = createInitialState();
  state.finished = true;
  assert.throws(() => move(state, 10, CENTER), /Game already over/);
});
