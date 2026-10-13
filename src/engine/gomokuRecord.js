import { createInitialState, move, BOARD_SIZE, RULESETS } from './gomoku.js';

const CELLS = BOARD_SIZE * BOARD_SIZE;
const COLS = 'ABCDEFGHIJKLMNO';
const FORMAT_VERSION = 1;

// "H6": column letter, then the row counted from the bottom (the convention
// RAPFI and Gomocup tools use). Board index = row * 15 + col, row 0 on top.
export function pointLabel(index) {
  return `${COLS[index % BOARD_SIZE]}${BOARD_SIZE - Math.floor(index / BOARD_SIZE)}`;
}

export function labelToIndex(label) {
  const m = /^([A-O])(\d{1,2})$/i.exec(String(label).trim());
  if (!m) return null;
  const row = BOARD_SIZE - Number(m[2]);
  if (row < 0 || row >= BOARD_SIZE) return null;
  return row * BOARD_SIZE + COLS.indexOf(m[1].toUpperCase());
}

// Plays the moves from an empty board. Returns every position (states[0] is
// the empty board, states[n] the board after n moves); stops at the first
// move the rules reject and reports how many were valid.
export function replay(moves, ruleset = RULESETS.FREESTYLE) {
  const states = [createInitialState({ ruleset })];
  let valid = 0;
  for (const to of moves) {
    const last = states[states.length - 1];
    if (last.winner) break;
    try {
      states.push(move(last, null, to));
      valid++;
    } catch {
      break;
    }
  }
  return { states, valid, ok: valid === moves.length };
}

export function resultOf(moves, ruleset) {
  const { states } = replay(moves, ruleset);
  return states[states.length - 1].winner;
}

const toBase64Url = (bytes) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text) => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const s = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

// One header byte (format version + ruleset) followed by one byte per move;
// 100 moves come out near 140 characters, short enough to paste in a chat.
export function encodeRecord({ moves, ruleset = RULESETS.FREESTYLE }) {
  const bytes = new Uint8Array(moves.length + 1);
  bytes[0] = (FORMAT_VERSION << 4) | (ruleset === RULESETS.RENJU ? 1 : 0);
  moves.forEach((m, i) => { bytes[i + 1] = m; });
  return toBase64Url(bytes);
}

export function decodeRecord(text) {
  try {
    const bytes = fromBase64Url(String(text).trim());
    if (bytes.length < 2 || bytes.length > CELLS + 1) return null;
    if (bytes[0] >> 4 !== FORMAT_VERSION) return null;
    const ruleset = bytes[0] & 1 ? RULESETS.RENJU : RULESETS.FREESTYLE;
    const moves = Array.from(bytes.slice(1));
    if (new Set(moves).size !== moves.length || moves.some((m) => m >= CELLS)) return null;
    if (!replay(moves, ruleset).ok) return null;
    return { moves, ruleset };
  } catch {
    return null;
  }
}

// Piskvork .psq: header line, then "x,y,time-ms" with 1-based coordinates.
export function toPsq({ moves }) {
  const lines = [`Piskvorky ${BOARD_SIZE}x${BOARD_SIZE}, 0:0, 0`];
  for (const m of moves) lines.push(`${(m % BOARD_SIZE) + 1},${Math.floor(m / BOARD_SIZE) + 1},0`);
  lines.push('');
  return lines.join('\r\n');
}

export function fromPsq(text, ruleset = RULESETS.FREESTYLE) {
  const lines = String(text).split(/\r?\n/);
  const header = /Piskvorky\s+(\d+)x(\d+)/i.exec(lines[0] || '');
  if (header && (Number(header[1]) !== BOARD_SIZE || Number(header[2]) !== BOARD_SIZE)) return null;
  const moves = [];
  for (const line of lines) {
    const m = /^\s*(\d{1,2})\s*,\s*(\d{1,2})(?:\s*,\s*\d+)?\s*$/.exec(line);
    if (!m) continue;
    const x = Number(m[1]);
    const y = Number(m[2]);
    if (x < 1 || x > BOARD_SIZE || y < 1 || y > BOARD_SIZE) return null;
    moves.push((y - 1) * BOARD_SIZE + (x - 1));
  }
  if (moves.length === 0 || new Set(moves).size !== moves.length) return null;
  if (!replay(moves, ruleset).ok) return null;
  return { moves, ruleset };
}

const STORAGE_KEY = 'playgonu:gomokuRecords';
const MAX_RECORDS = 100;

const defaultStorage = () => {
  try { return globalThis.localStorage || null; } catch { return null; }
};

export function loadRecords(storage = defaultStorage()) {
  try {
    const list = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(list) ? list.filter((r) => r && Array.isArray(r.moves)) : [];
  } catch {
    return [];
  }
}

// Upserts by id, so finishing the same game twice (undo, then win again)
// keeps one entry. Newest first, oldest dropped past the cap.
export function saveRecord(record, storage = defaultStorage()) {
  if (!storage) return false;
  try {
    const list = loadRecords(storage).filter((r) => r.id !== record.id);
    list.unshift(record);
    storage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECORDS)));
    return true;
  } catch {
    return false;
  }
}

export function deleteRecord(id, storage = defaultStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(loadRecords(storage).filter((r) => r.id !== id)));
    return true;
  } catch {
    return false;
  }
}
