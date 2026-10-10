import test from 'node:test';
import assert from 'node:assert/strict';
import { chatAllowed } from '../src/durable/chatLimit.js';

test('normal chatting passes', () => {
  const conn = {};
  const t0 = 1_000_000;
  assert.equal(chatAllowed(conn, t0), true);
  assert.equal(chatAllowed(conn, t0 + 2000), true);
  assert.equal(chatAllowed(conn, t0 + 5000), true);
});

test('messages less than 0.7 s apart are dropped', () => {
  const conn = {};
  const t0 = 1_000_000;
  assert.equal(chatAllowed(conn, t0), true);
  assert.equal(chatAllowed(conn, t0 + 300), false);
  assert.equal(chatAllowed(conn, t0 + 800), true);
});

test('more than 4 messages in 10 s are dropped, then it opens up again', () => {
  const conn = {};
  const t0 = 1_000_000;
  for (let i = 0; i < 4; i++) assert.equal(chatAllowed(conn, t0 + i * 1000), true);
  assert.equal(chatAllowed(conn, t0 + 5000), false, 'fifth within 10 s');
  assert.equal(chatAllowed(conn, t0 + 9000), false, 'dropped messages do not extend the block');
  assert.equal(chatAllowed(conn, t0 + 10500), true, 'first message has left the window');
});

test('each connection is counted on its own', () => {
  const a = {};
  const b = {};
  const t0 = 1_000_000;
  for (let i = 0; i < 4; i++) chatAllowed(a, t0 + i * 1000);
  assert.equal(chatAllowed(a, t0 + 4000), false);
  assert.equal(chatAllowed(b, t0 + 4000), true);
});
