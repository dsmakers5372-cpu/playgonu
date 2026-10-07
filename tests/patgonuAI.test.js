import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, allLegalMoves, move, PLAYERS } from '../src/engine/patgonu.js';
import { chooseAIMove } from '../src/engine/patgonuAI.js';

function emptyState(turn = PLAYERS.A) {
  return { pieces: new Array(25).fill(null), turn, winner: null, lastCapture: [] };
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

test('AI takes a free capture when one is available', () => {
  const state = emptyState();
  state.pieces[0] = PLAYERS.A;
  state.pieces[5] = PLAYERS.B;
  state.pieces[20] = PLAYERS.A;
  state.pieces[23] = PLAYERS.B;
  state.pieces[24] = PLAYERS.B;

  const aiMove = chooseAIMove(state, { difficulty: 'easy' });
  assert.deepEqual(aiMove, { from: 20, to: 10 });

  const next = move(state, aiMove.from, aiMove.to);
  assert.deepEqual(next.lastCapture, [5]);
});

test('hard difficulty finishes a search from the opening position within a few seconds', () => {
  const state = createInitialState();
  const start = Date.now();
  const aiMove = chooseAIMove(state, { difficulty: 'hard' });
  const elapsed = Date.now() - start;
  assert.ok(aiMove, 'AI should return a move');
  assert.ok(elapsed < 8000, `expected under 8s, took ${elapsed}ms`);
});

test('master difficulty finishes a search from the opening position within a few seconds', () => {
  const state = createInitialState();
  const start = Date.now();
  const aiMove = chooseAIMove(state, { difficulty: 'master' });
  const elapsed = Date.now() - start;
  assert.ok(aiMove, 'AI should return a move');
  assert.ok(elapsed < 10000, `expected under 10s, took ${elapsed}ms`);
});
