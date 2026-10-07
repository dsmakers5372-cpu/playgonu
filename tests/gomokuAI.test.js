import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, allLegalMoves, move, toIndex, PLAYERS } from '../src/engine/gomoku.js';
import { chooseAIMove } from '../src/engine/gomokuAI.js';

function midGameState() {
  // A loose scattered opening — enough stones on the board that the AI's
  // "near an existing stone" candidate filter has real width to search,
  // not just the empty board's single center move.
  let state = createInitialState();
  const moves = [
    [7, 7], [7, 8], [8, 7], [6, 6], [9, 9], [5, 8], [8, 5], [6, 9], [9, 6],
  ];
  for (const [row, col] of moves) state = move(state, null, toIndex(row, col));
  return state;
}

for (const difficulty of ['easy', 'normal', 'hard', 'master']) {
  test(`${difficulty} AI always returns one of the current player's legal moves`, () => {
    const state = midGameState();
    const aiMove = chooseAIMove(state, { difficulty });
    const legal = allLegalMoves(state, state.turn);
    assert.ok(
      legal.some((m) => m.from === aiMove.from && m.to === aiMove.to),
      `expected ${JSON.stringify(aiMove)} to be one of ${legal.length} legal placements`,
    );
  });
}

test('AI takes an immediate winning move when one is available', () => {
  let state = createInitialState();
  const redMoves = [[7, 3], [7, 4], [7, 5], [7, 6]];
  const blackMoves = [[2, 3], [2, 4], [2, 5], [2, 6]];
  for (let i = 0; i < redMoves.length; i++) {
    state = move(state, null, toIndex(...redMoves[i]));
    state = move(state, null, toIndex(...blackMoves[i]));
  }
  assert.equal(state.turn, PLAYERS.A);
  const aiMove = chooseAIMove(state, { difficulty: 'easy' });
  const next = move(state, null, aiMove.to);
  assert.equal(next.winner, PLAYERS.A);
});

test('AI blocks a one-sided four that would otherwise win next turn', () => {
  // A true *open* four (both ends empty) can't be stopped by one move —
  // that's exactly what makes it a winning shape, not a bug in the AI. So
  // this closes one end in advance, leaving a single forced block.
  let state = createInitialState();
  state = move(state, null, toIndex(2, 2)); // A: pre-closes the left end
  state = move(state, null, toIndex(2, 3)); // B
  state = move(state, null, toIndex(10, 10)); // A, somewhere irrelevant
  state = move(state, null, toIndex(2, 4)); // B
  state = move(state, null, toIndex(4, 12)); // A, somewhere irrelevant
  state = move(state, null, toIndex(2, 5)); // B
  state = move(state, null, toIndex(12, 4)); // A, somewhere irrelevant
  state = move(state, null, toIndex(2, 6)); // B: four in a row, open only at (2,7)
  assert.equal(state.turn, PLAYERS.A);
  const aiMove = chooseAIMove(state, { difficulty: 'hard' });
  assert.equal(aiMove.to, toIndex(2, 7), `expected AI to block the only open end, got ${JSON.stringify(aiMove)}`);
});

test('master difficulty finishes a mid-game search within a few seconds', () => {
  const state = midGameState();
  const start = Date.now();
  const aiMove = chooseAIMove(state, { difficulty: 'master' });
  const elapsed = Date.now() - start;
  assert.ok(aiMove, 'AI should return a move');
  assert.ok(elapsed < 10000, `expected under 10s, took ${elapsed}ms`);
});
