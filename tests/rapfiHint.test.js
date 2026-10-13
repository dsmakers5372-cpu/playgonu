import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardCommand, parseSearchInfo } from '../src/ui/rapfiHint.js';
import { toIndex } from '../src/engine/gomoku.js';

test('boardCommand sends stones in played order, flagged relative to the side to move', () => {
  const moves = [toIndex(7, 7), toIndex(7, 8), toIndex(8, 7)];
  assert.equal(boardCommand(moves), 'BOARD\n7,7,2\n8,7,1\n7,8,2\nDONE');
  const even = [toIndex(7, 7), toIndex(7, 8)];
  assert.equal(boardCommand(even), 'BOARD\n7,7,1\n8,7,2\nDONE');
  assert.equal(boardCommand([]), 'BOARD\nDONE');
});

test('parseSearchInfo keeps the last line whose first PV move matches the answer', () => {
  const lines = [
    'MESSAGE Depth 11-15 | Eval 512 | Time 86ms | I6 H6 G8',
    'MESSAGE Depth 15-37 | Eval 436 | Time 1493ms | H6 H5',
    'MESSAGE Speed 53665 | Depth 15-37 | Eval 436 | Node 80K | Time 1494ms',
  ];
  const info = parseSearchInfo(lines, toIndex(9, 7));
  assert.deepEqual(info, { depth: 15, eval: '436', ms: 1493, pv: [toIndex(9, 7), toIndex(10, 7)] });
  assert.equal(parseSearchInfo(lines, 0), null);
});
