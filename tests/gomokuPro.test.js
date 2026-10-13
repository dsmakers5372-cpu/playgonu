import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, move, toIndex, forbiddenPoints } from '../src/engine/gomoku.js';
import { chooseAIMove } from '../src/engine/gomokuAI.js';
import { chooseProMove, PRO_VERSION } from '../src/engine/gomokuPro.js';

function position(ruleset, a, b, turn) {
  const s = createInitialState({ ruleset });
  const cells = s.cells.slice();
  for (const [r, c] of a) cells[toIndex(r, c)] = 'A';
  for (const [r, c] of b) cells[toIndex(r, c)] = 'B';
  return { ...s, cells, turn, moveCount: a.length + b.length };
}

const quick = { nodeBudget: 20000, timeMs: 20000 };

test('pro takes the center on an empty board', () => {
  assert.equal(chooseProMove(createInitialState(), quick).to, toIndex(7, 7));
});

test('pro completes its own five before anything else', () => {
  const s = position('freestyle', [[7, 3], [7, 4], [7, 5], [7, 6]], [[6, 3], [6, 4], [6, 5]], 'A');
  assert.ok([toIndex(7, 2), toIndex(7, 7)].includes(chooseProMove(s, quick).to));
});

test('pro blocks a four', () => {
  const s = position('freestyle', [[7, 3], [7, 4], [7, 5], [7, 6]], [[6, 3], [6, 4], [5, 5]], 'B');
  assert.equal(chooseProMove(s, quick).to, toIndex(7, 2));
});

test('pro blocks an open three', () => {
  const s = position('freestyle', [[7, 5], [7, 6], [7, 7]], [[6, 6], [8, 8]], 'B');
  assert.ok([toIndex(7, 4), toIndex(7, 8)].includes(chooseProMove(s, quick).to));
});

test('pro finds a forced win made of fours', () => {
  // A: row 7 cols 5-7 plus diagonal and column stones; 7,8 makes a four and a second four threat.
  let s = position('freestyle', [[7, 5], [7, 6], [7, 7], [8, 8], [9, 9], [10, 7], [9, 7]], [[7, 4], [6, 6], [8, 6], [5, 5], [3, 3]], 'A');
  const pick = chooseProMove(s, quick);
  s = move(s, null, pick.to);
  assert.ok(s.winner || pick.to === toIndex(7, 8));
});

test('pro never plays a renju forbidden point as black', () => {
  let s = createInitialState({ ruleset: 'renju' });
  for (const [r, c] of [[7, 7], [7, 8], [8, 8], [8, 7], [6, 6], [9, 9], [6, 7], [5, 7]]) s = move(s, null, toIndex(r, c));
  const pick = chooseProMove(s, quick);
  assert.ok(!forbiddenPoints(s).includes(pick.to));
  assert.doesNotThrow(() => move(s, null, pick.to));
});

test('chooseAIMove routes the "pro" difficulty to the pro engine', () => {
  const s = position('freestyle', [[7, 3], [7, 4], [7, 5], [7, 6]], [[6, 3], [6, 4], [5, 5]], 'B');
  assert.equal(chooseAIMove(s, { difficulty: 'pro', nodeBudget: 20000 }).to, toIndex(7, 2));
});

test('pro finds a double-three win through the threat search even at depth 2', () => {
  const s = position('freestyle', [[7, 6], [7, 7], [5, 8], [6, 8]], [[2, 2], [12, 2], [2, 12], [12, 12]], 'A');
  assert.equal(chooseProMove(s, { nodeBudget: 20000, maxDepth: 2 }).to, toIndex(7, 8));
});

test('pro reports its engine version', () => {
  assert.equal(PRO_VERSION, '1.3');
});
