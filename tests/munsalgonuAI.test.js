import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, allLegalMoves, move, PLAYERS } from '../src/engine/munsalgonu.js';
import { chooseAIMove } from '../src/engine/munsalgonuAI.js';

function emptyState(turn = PLAYERS.A) {
  return { pieces: new Array(25).fill(null), turn, winner: null, lastCapture: [], mustContinueFrom: null };
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

test('AI takes a free capturing jump when one is available', () => {
  const state = emptyState();
  state.pieces[6] = PLAYERS.A;
  state.pieces[7] = PLAYERS.B;
  state.pieces[20] = PLAYERS.B;

  const aiMove = chooseAIMove(state, { difficulty: 'easy' });
  assert.deepEqual(aiMove, { from: 6, to: 8 });

  const next = move(state, aiMove.from, aiMove.to);
  assert.deepEqual(next.lastCapture, [7]);
});

test('hard difficulty finishes a search from the opening position quickly', () => {
  const state = createInitialState();
  const start = Date.now();
  const aiMove = chooseAIMove(state, { difficulty: 'hard' });
  const elapsed = Date.now() - start;
  assert.ok(aiMove, 'AI should return a move');
  assert.ok(elapsed < 3000, `expected under 3s, took ${elapsed}ms`);
});
