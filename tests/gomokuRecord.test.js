import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pointLabel,
  labelToIndex,
  replay,
  resultOf,
  encodeRecord,
  decodeRecord,
  toPsq,
  fromPsq,
  loadRecords,
  saveRecord,
  deleteRecord,
} from '../src/engine/gomokuRecord.js';
import { toIndex, RULESETS } from '../src/engine/gomoku.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};

// Black: row 7, cols 3..7 — White answers on row 8.
const blackWins = [3, 4, 5, 6, 7].flatMap((c, i) => (i < 4 ? [toIndex(7, c), toIndex(8, c)] : [toIndex(7, c)]));

test('point labels: column letter plus row counted from the bottom', () => {
  assert.equal(pointLabel(toIndex(7, 7)), 'H8');
  assert.equal(pointLabel(toIndex(0, 0)), 'A15');
  assert.equal(pointLabel(toIndex(14, 14)), 'O1');
  assert.equal(labelToIndex('H6'), toIndex(9, 7));
  assert.equal(labelToIndex('o1'), toIndex(14, 14));
  assert.equal(labelToIndex('P3'), null);
  assert.equal(labelToIndex('A16'), null);
});

test('replay stops at the winning move and reports the result', () => {
  const r = replay(blackWins);
  assert.equal(r.ok, true);
  assert.equal(r.states.length, blackWins.length + 1);
  assert.equal(resultOf(blackWins), 'A');
  assert.equal(replay([...blackWins, 0]).ok, false);
});

test('replay rejects an occupied point', () => {
  assert.equal(replay([10, 10]).ok, false);
});

test('link encoding round-trips moves and ruleset', () => {
  const text = encodeRecord({ moves: blackWins, ruleset: RULESETS.FREESTYLE });
  assert.match(text, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeRecord(text), { moves: blackWins, ruleset: RULESETS.FREESTYLE });
  const renju = encodeRecord({ moves: [toIndex(7, 7), toIndex(7, 8)], ruleset: RULESETS.RENJU });
  assert.equal(decodeRecord(renju).ruleset, RULESETS.RENJU);
});

test('decodeRecord rejects garbage, duplicates and out-of-range moves', () => {
  assert.equal(decodeRecord(''), null);
  assert.equal(decodeRecord('!!!'), null);
  assert.equal(decodeRecord(encodeRecord({ moves: [5, 5] })), null);
  assert.equal(decodeRecord(encodeRecord({ moves: [5, 250] })), null);
});

test('psq export/import round-trips and rejects other board sizes', () => {
  const text = toPsq({ moves: blackWins });
  assert.match(text, /^Piskvorky 15x15/);
  assert.deepEqual(fromPsq(text).moves, blackWins);
  assert.equal(fromPsq('Piskvorky 19x19, 0:0, 0\n1,1,0\n'), null);
  assert.equal(fromPsq('nothing here'), null);
  assert.equal(fromPsq('1,1,0\n16,3,0\n'), null);
});

test('record store: upsert by id, newest first, delete', () => {
  const storage = memoryStorage();
  assert.deepEqual(loadRecords(storage), []);
  saveRecord({ id: 1, moves: [1, 2] }, storage);
  saveRecord({ id: 2, moves: [3, 4] }, storage);
  saveRecord({ id: 1, moves: [1, 2, 3] }, storage);
  assert.deepEqual(loadRecords(storage).map((r) => r.id), [1, 2]);
  assert.equal(loadRecords(storage)[0].moves.length, 3);
  deleteRecord(1, storage);
  assert.deepEqual(loadRecords(storage).map((r) => r.id), [2]);
});

test('record store survives missing or broken storage', () => {
  assert.deepEqual(loadRecords(null), []);
  assert.equal(saveRecord({ id: 1, moves: [1] }, null), false);
  assert.deepEqual(loadRecords({ getItem: () => 'not json' }), []);
});
