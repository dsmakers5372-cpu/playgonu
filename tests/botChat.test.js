import test from 'node:test';
import assert from 'node:assert/strict';
import { botChatReply, botGameOverLine, isKorean } from '../src/durable/botChat.js';

const always = () => 0; // rand() = 0 → every chance passes, first line picked

test('replies in the language it was spoken to', () => {
  assert.equal(isKorean('안녕하세요'), true);
  assert.equal(isKorean('hi there'), false);
  assert.match(botChatReply('안녕하세요', {}, { rand: always }), /[가-힣]/);
  assert.doesNotMatch(botChatReply('hello', {}, { rand: always }), /[가-힣]/);
});

test('a room made in Korean gets Korean answers, an English room English', () => {
  assert.match(botChatReply('hello', {}, { rand: always, roomLang: 'ko' }), /[가-힣]/);
  assert.doesNotMatch(botChatReply('안녕하세요', {}, { rand: always, roomLang: 'en' }), /[가-힣]/);
});

test('greetings and gg get fitting answers', () => {
  assert.equal(botChatReply('ㅎㅇ', {}, { rand: always }), '안녕하세요 ㅎㅎ');
  assert.equal(botChatReply('gg', {}, { rand: always }), 'gg');
  assert.equal(botChatReply('수고하셨어요', {}, { rand: always }), 'gg 수고했어요');
});

test('it only answers game manners — never spams, often silent', () => {
  const state = {};
  const t0 = 1_000_000;
  assert.ok(botChatReply('안녕', state, { now: t0, rand: always }));
  assert.equal(botChatReply('수고했어요', state, { now: t0 + 5000, rand: always }), null, 'quiet within 30s of its last reply');
  assert.ok(botChatReply('gg', state, { now: t0 + 31000, rand: always }), 'answers again after 30s');
  assert.equal(botChatReply('hello', {}, { rand: () => 0.7 }), null, 'a greeting is not always answered');
});

test('everything that is not game manners gets no answer', () => {
  for (const q of ['너 누구니', '너 ai니', 'AI야?', '사람이야', 'are you a bot?', 'who are you', '어디 살아요', '뭐해요?', 'ㅋㅋㅋ', '저기요', 'what is your name?', '오늘 날씨 좋네요']) {
    assert.equal(botChatReply(q, {}, { rand: always, roomLang: 'ko' }), null, q);
    assert.equal(botChatReply(q, {}, { rand: always }), null, q);
  }
});

test('after the game: sometimes a gg, worded for a win or a loss', () => {
  assert.equal(botGameOverLine(true, 'ko', () => 0), 'gg 재밌었어요');
  assert.equal(botGameOverLine(false, 'en', () => 0), 'gg, well played');
  assert.equal(botGameOverLine(true, 'ko', () => 0.99), null);
});
