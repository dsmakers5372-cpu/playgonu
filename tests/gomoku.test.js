import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  legalPlacements,
  forbiddenPoints,
  analyzeMove,
  move,
  toIndex,
  PLAYERS,
  RULESETS,
  BOARD_SIZE,
} from '../src/engine/gomoku.js';

function emptyState(overrides = {}) {
  return {
    cells: new Array(BOARD_SIZE * BOARD_SIZE).fill(null),
    turn: PLAYERS.A,
    winner: null,
    winLine: [],
    lastMove: null,
    moveCount: 0,
    ruleset: RULESETS.FREESTYLE,
    ...overrides,
  };
}

test('initial state: empty 15x15 board, freestyle, A to move', () => {
  const state = createInitialState();
  assert.equal(state.ruleset, RULESETS.FREESTYLE);
  assert.equal(state.turn, PLAYERS.A);
  assert.equal(legalPlacements(state).length, 225);
});

test('placing on an occupied point is illegal', () => {
  const state = createInitialState();
  const next = move(state, null, toIndex(7, 7));
  assert.throws(() => move(next, null, toIndex(7, 7)), /Illegal placement/);
});

test('five in a row (freestyle) wins immediately', () => {
  const state = emptyState();
  state.cells[toIndex(7, 3)] = PLAYERS.A;
  state.cells[toIndex(7, 4)] = PLAYERS.A;
  state.cells[toIndex(7, 5)] = PLAYERS.A;
  state.cells[toIndex(7, 6)] = PLAYERS.A;
  const next = move(state, null, toIndex(7, 7));
  assert.equal(next.winner, PLAYERS.A);
  assert.equal(next.winLine.length, 5);
});

test('freestyle: a six-in-a-row overline still counts as a win', () => {
  const state = emptyState();
  for (let col = 2; col <= 6; col++) state.cells[toIndex(7, col)] = PLAYERS.A;
  const next = move(state, null, toIndex(7, 7));
  assert.equal(next.winner, PLAYERS.A);
  assert.equal(next.winLine.length, 6);
});

test('a full board with no five-in-a-row is a draw', () => {
  // Tiling with period 4 in both row and col keeps every run (in all four
  // directions) at length 2 or less, so filling the whole board this way
  // never produces an accidental five — safe for a pure "board is full" test.
  function tilePlayer(row, col) {
    return ((row % 4) + 2 * (col % 4)) % 4 < 2 ? PLAYERS.A : PLAYERS.B;
  }
  const cells = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) cells[toIndex(row, col)] = tilePlayer(row, col);
  }
  cells[toIndex(0, 0)] = null; // leave exactly one point open — tilePlayer(0,0) is A
  const state = emptyState({ cells, turn: PLAYERS.A, moveCount: 224 });
  const next = move(state, null, toIndex(0, 0));
  assert.equal(next.winner, 'draw');
  assert.equal(next.moveCount, 225);
});

test('renju: a move forming two open threes at once (double-three) is forbidden', () => {
  const cells = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  cells[toIndex(7, 5)] = PLAYERS.A;
  cells[toIndex(7, 6)] = PLAYERS.A; // horizontal: completes an open three with (7,7)
  cells[toIndex(5, 7)] = PLAYERS.A;
  cells[toIndex(6, 7)] = PLAYERS.A; // vertical: completes an open three with (7,7)
  cells[toIndex(7, 7)] = PLAYERS.A;
  const result = analyzeMove(cells, toIndex(7, 7), PLAYERS.A, RULESETS.RENJU);
  assert.equal(result.legal, false);
  assert.equal(result.reason, 'double-three');
});

test('renju: a move forming two live fours at once (double-four) is forbidden', () => {
  const cells = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  cells[toIndex(7, 4)] = PLAYERS.A;
  cells[toIndex(7, 5)] = PLAYERS.A;
  cells[toIndex(7, 6)] = PLAYERS.A; // horizontal: completes a live four with (7,7)
  cells[toIndex(4, 7)] = PLAYERS.A;
  cells[toIndex(5, 7)] = PLAYERS.A;
  cells[toIndex(6, 7)] = PLAYERS.A; // vertical: completes a live four with (7,7)
  cells[toIndex(7, 7)] = PLAYERS.A;
  const result = analyzeMove(cells, toIndex(7, 7), PLAYERS.A, RULESETS.RENJU);
  assert.equal(result.legal, false);
  assert.equal(result.reason, 'double-four');
});

test('renju: a six-in-a-row overline is forbidden, not a win', () => {
  const cells = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  for (let col = 2; col <= 6; col++) cells[toIndex(7, col)] = PLAYERS.A;
  cells[toIndex(7, 7)] = PLAYERS.A;
  const result = analyzeMove(cells, toIndex(7, 7), PLAYERS.A, RULESETS.RENJU);
  assert.equal(result.legal, false);
  assert.equal(result.reason, 'overline');
});

test('renju: an outright five-in-a-row wins even if it also forms an open three elsewhere', () => {
  const cells = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  cells[toIndex(7, 3)] = PLAYERS.A;
  cells[toIndex(7, 4)] = PLAYERS.A;
  cells[toIndex(7, 5)] = PLAYERS.A;
  cells[toIndex(7, 6)] = PLAYERS.A; // horizontal: exact five with (7,7)
  cells[toIndex(5, 7)] = PLAYERS.A;
  cells[toIndex(6, 7)] = PLAYERS.A; // vertical: would also be an open three with (7,7)
  cells[toIndex(7, 7)] = PLAYERS.A;
  const result = analyzeMove(cells, toIndex(7, 7), PLAYERS.A, RULESETS.RENJU);
  assert.equal(result.legal, true);
  assert.equal(result.win, true);
  assert.equal(result.winLine.length, 5);
});

test('renju: the forbidden-point restriction only applies to the first player (A)', () => {
  const cells = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  cells[toIndex(7, 5)] = PLAYERS.B;
  cells[toIndex(7, 6)] = PLAYERS.B;
  cells[toIndex(5, 7)] = PLAYERS.B;
  cells[toIndex(6, 7)] = PLAYERS.B;
  cells[toIndex(7, 7)] = PLAYERS.B;
  const result = analyzeMove(cells, toIndex(7, 7), PLAYERS.B, RULESETS.RENJU);
  assert.equal(result.legal, true);
});

test('renju: legalPlacements and forbiddenPoints agree on the one blocked point', () => {
  const cells = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  cells[toIndex(7, 5)] = PLAYERS.A;
  cells[toIndex(7, 6)] = PLAYERS.A;
  cells[toIndex(5, 7)] = PLAYERS.A;
  cells[toIndex(6, 7)] = PLAYERS.A;
  const state = emptyState({ cells, turn: PLAYERS.A, ruleset: RULESETS.RENJU, moveCount: 4 });
  const forbidden = forbiddenPoints(state);
  assert.deepEqual(forbidden, [toIndex(7, 7)]);
  assert.equal(legalPlacements(state).includes(toIndex(7, 7)), false);
  assert.throws(() => move(state, null, toIndex(7, 7)), /double-three/);
});

test('no further moves once the game has a winner', () => {
  const state = emptyState({ winner: PLAYERS.A });
  assert.throws(() => move(state, null, toIndex(0, 0)), /Game already over/);
});

const renjuState = (black, white = [], extra = {}) => {
  const cells = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  for (const [r, c] of black) cells[toIndex(r, c)] = PLAYERS.A;
  for (const [r, c] of white) cells[toIndex(r, c)] = PLAYERS.B;
  return emptyState({ cells, turn: PLAYERS.A, ruleset: RULESETS.RENJU, moveCount: black.length + white.length, ...extra });
};

test('renju: a broken three (●●_●) counts toward double-three', () => {
  // Row 6: ●_● around (6,9) -> ●●● ; column 9: (5,9) ● (6,9) _ (8,9) ● -> ●●_●
  const state = renjuState([[5, 9], [6, 8], [6, 10], [7, 7], [8, 9]], [[3, 11], [8, 5], [8, 6], [8, 7], [8, 8]]);
  assert.deepEqual(forbiddenPoints(state), [toIndex(6, 9)]);
  assert.throws(() => move(state, null, toIndex(6, 9)), /double-three/);
});

test('renju: a broken three blocked on one side is not a three', () => {
  // Same shape but white caps the column above, so it can't become an open four.
  const state = renjuState([[5, 9], [6, 8], [6, 10], [8, 9]], [[4, 9]]);
  assert.equal(forbiddenPoints(state).includes(toIndex(6, 9)), false);
});

test('renju: two broken fours (●●●_●) at once are a double-four', () => {
  // (7,7) makes ●●●_● along row 7 (gap at 7,6) and down column 7 (gap at 6,7).
  const state = renjuState([[7, 3], [7, 4], [7, 5], [3, 7], [4, 7], [5, 7]]);
  assert.equal(forbiddenPoints(state).includes(toIndex(7, 7)), true);
  assert.throws(() => move(state, null, toIndex(7, 7)), /double-four/);
});

test("renju: black's first stone must go on the center point", () => {
  const state = createInitialState({ ruleset: RULESETS.RENJU });
  assert.deepEqual(legalPlacements(state), [toIndex(7, 7)]);
  assert.throws(() => move(state, null, toIndex(0, 0)), /center/);
  const free = createInitialState({ ruleset: RULESETS.FREESTYLE });
  assert.equal(legalPlacements(free).length, BOARD_SIZE * BOARD_SIZE);
});
