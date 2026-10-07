import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, allLegalMoves } from '../src/engine/umulgonu.js';
import { chooseAIMove } from '../src/engine/umulgonuAI.js';

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
