import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, allLegalMoves, move, PLAYERS } from '../src/engine/bakwigonu.js';
import { chooseAIMove } from '../src/engine/bakwigonuAI.js';

function emptyState(turn = PLAYERS.A) {
  return { pieces: new Array(16).fill(null), turn, winner: null, lastCapture: [] };
}

for (const difficulty of ['easy', 'normal', 'hard', 'master']) {
  test(`${difficulty} AI always returns one of the current player's legal moves`, () => {
    const state = createInitialState();
    const aiMove = chooseAIMove(state, { difficulty });
    const legal = allLegalMoves(state, state.turn);
    assert.ok(
      legal.some((m) => m.from === aiMove.from && m.to === aiMove.to),
      `expected ${JSON.stringify(aiMove)} to be one of ${JSON.stringify(legal)}`,
    );
  });
}

test('AI takes a free wheel capture when one is available', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[2] = PLAYERS.B;

  const aiMove = chooseAIMove(state, { difficulty: 'easy' });
  assert.deepEqual(aiMove, { from: 0, to: 2 });

  const next = move(state, aiMove.from, aiMove.to);
  assert.deepEqual(next.lastCapture, [2]);
  assert.equal(next.winner, PLAYERS.A);
});

test('hard difficulty finishes a search from the opening position quickly', () => {
  const state = createInitialState();
  const start = Date.now();
  const aiMove = chooseAIMove(state, { difficulty: 'hard' });
  const elapsed = Date.now() - start;
  assert.ok(aiMove, 'AI should return a move');
  assert.ok(elapsed < 3000, `expected under 3s, took ${elapsed}ms`);
});
