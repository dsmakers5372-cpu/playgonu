import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVirtualRoster, pickVirtualLobby } from '../src/durable/virtualPlayers.js';

const HANGUL = /[가-힣]/;
// A timestamp at hh:30 Korean time (UTC+9); Date.UTC rolls negative hours back a day.
const kst = (hour) => Date.UTC(2026, 9, 8, hour - 9, 30);
const koreanShare = (roster) => roster.filter((p) => HANGUL.test(p.name)).length / roster.length;

test('overnight in Korea the online roster is mostly international', () => {
  for (const hour of [2, 4, 6]) {
    const roster = pickVirtualRoster('gomoku', kst(hour));
    assert.ok(koreanShare(roster) <= 0.25, `KST ${hour}:00 Korean share ${koreanShare(roster)}`);
  }
});

test('Korean evenings are mostly Korean', () => {
  for (const hour of [19, 21, 23]) {
    const roster = pickVirtualRoster('cham', kst(hour));
    assert.ok(koreanShare(roster) >= 0.55, `KST ${hour}:00 Korean share ${koreanShare(roster)}`);
  }
});

test('roster size stays in range, has no duplicates, and is stable within the hour', () => {
  for (let hour = 0; hour < 24; hour++) {
    const roster = pickVirtualRoster('gomoku', kst(hour));
    assert.ok(roster.length >= 18 && roster.length <= 25);
    assert.equal(new Set(roster.map((p) => p.id)).size, roster.length);
  }
  const a = pickVirtualRoster('gomoku', kst(4)).map((p) => p.id);
  const b = pickVirtualRoster('gomoku', kst(4) + 20 * 60 * 1000).map((p) => p.id);
  assert.deepEqual(a, b);
});

test('the lobby shows 5 to 10 open rooms at any hour', () => {
  for (let hour = 0; hour < 24; hour++) {
    for (const game of ['gomoku', 'cham']) {
      const { waiting } = pickVirtualLobby(game, kst(hour));
      assert.ok(waiting.length >= 5 && waiting.length <= 10, `${game} KST ${hour}:00 waiting ${waiting.length}`);
    }
  }
});

test('room titles follow the host language, so dawn lobbies read mostly English', () => {
  const { waiting } = pickVirtualLobby('gomoku', kst(4));
  const titled = waiting.filter((r) => r.title);
  assert.ok(titled.every((r) => HANGUL.test(r.title) === HANGUL.test(r.name)));
  assert.ok(titled.filter((r) => !HANGUL.test(r.title)).length > titled.length / 2);
});
