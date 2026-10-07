import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, allLegalMoves } from '../src/engine/chamgonu.js';
import { chooseAIMove } from '../src/engine/chamgonuAI.js';

for (const difficulty of ['easy', 'normal', 'hard', 'master']) {
  test(`${difficulty} AI always returns one of the current player's legal moves`, () => {
    const state = createInitialState();
    const aiMove = chooseAIMove(state, { difficulty });
    const legal = allLegalMoves(state, state.turn);
    assert.ok(
      legal.some((m) => m.from === aiMove.from && m.to === aiMove.to),
      `expected ${JSON.stringify(aiMove)} to be one of ${legal.length} legal placements`,
    );
  });
}

test('master difficulty finishes a search from the opening position within a few seconds', () => {
  const state = createInitialState();
  const start = Date.now();
  const aiMove = chooseAIMove(state, { difficulty: 'master' });
  const elapsed = Date.now() - start;
  assert.ok(aiMove, 'AI should return a move');
  assert.ok(elapsed < 10000, `expected under 10s, took ${elapsed}ms`);
});
