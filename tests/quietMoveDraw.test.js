import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAW_AFTER_QUIET_MOVES } from '../src/engine/board.js';
import * as julgonu from '../src/engine/julgonu.js';
import * as daseotjulgonu from '../src/engine/daseotjulgonu.js';
import * as palpalgonu from '../src/engine/palpalgonu.js';
import * as bakwigonu from '../src/engine/bakwigonu.js';

const ENGINES = { julgonu, daseotjulgonu, palpalgonu, bakwigonu };

// Plays the first legal move that neither captures nor ends the game.
function quietMove(engine, state) {
  for (const m of engine.allLegalMoves(state, state.turn)) {
    const next = engine.move(state, m.from, m.to);
    if (next.lastCapture.length === 0 && next.winner !== state.turn && next.winner !== engine.opponent(state.turn)) return next;
  }
  return null;
}

for (const [name, engine] of Object.entries(ENGINES)) {
  test(`${name}: ${DRAW_AFTER_QUIET_MOVES} consecutive moves without a capture is a draw`, () => {
    let state = engine.createInitialState();
    for (let i = 1; i <= DRAW_AFTER_QUIET_MOVES; i++) {
      state = quietMove(engine, state);
      assert.ok(state, `no quiet move available at ply ${i}`);
      assert.equal(state.quietMoves, i);
      if (i < DRAW_AFTER_QUIET_MOVES) assert.equal(state.winner, null, `game ended early at ply ${i}`);
    }
    assert.equal(state.winner, 'draw');
    assert.throws(() => engine.move(state, 0, 1), /Game already over/);
  });
}

test('julgonu: a capture resets the quiet-move count', () => {
  const { PLAYERS } = julgonu;
  const pieces = new Array(16).fill(null);
  pieces[0] = PLAYERS.A; // (0,0)
  pieces[4] = PLAYERS.B; // (1,0) — sandwiched once A lands on (2,0)
  pieces[9] = PLAYERS.A; // (2,1) -> moves to (2,0)
  pieces[15] = PLAYERS.B;
  pieces[14] = PLAYERS.B;
  const state = { pieces, turn: PLAYERS.A, winner: null, lastCapture: [], quietMoves: 35 };
  const next = julgonu.move(state, 9, 8);
  assert.deepEqual(next.lastCapture, [4]);
  assert.equal(next.quietMoves, 0);
  assert.equal(next.winner, null);
});
