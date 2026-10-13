import { BOARD_SIZE } from '../engine/gomoku.js';
import { labelToIndex } from '../engine/gomokuRecord.js';

// The WASM build needs SIMD; probe with a tiny module that uses a v128 op.
const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);

export function rapfiSupported() {
  try {
    return typeof Worker !== 'undefined' && typeof WebAssembly === 'object' && WebAssembly.validate(SIMD_PROBE);
  } catch {
    return false;
  }
}

const INFO_LINE = /Depth (\d+)-(\d+) \| Eval (\S+) \| Time (\d+)ms \| (.+)$/;

// Picks the last search line whose principal variation starts with the move
// the engine finally played, so the shown line agrees with the answer.
export function parseSearchInfo(lines, moveIndex) {
  let found = null;
  for (const line of lines) {
    const m = INFO_LINE.exec(line);
    if (!m) continue;
    const pv = m[5].split(/\s+/).map(labelToIndex).filter((i) => i !== null);
    if (pv.length && pv[0] === moveIndex) found = { depth: Number(m[1]), eval: m[3], ms: Number(m[4]), pv };
  }
  return found;
}

export function boardCommand(moves) {
  const toMove = moves.length % 2;
  const lines = ['BOARD'];
  // Stones must go in the order they were played, flagged own/opponent
  // relative to the side to move — RAPFI inserts passes if they disagree.
  moves.forEach((idx, k) => lines.push(`${idx % BOARD_SIZE},${Math.floor(idx / BOARD_SIZE)},${k % 2 === toMove ? 1 : 2}`));
  lines.push('DONE');
  return lines.join('\n');
}

export function createRapfiHint({ searchMs = 3000, loadTimeoutMs = 90000 } = {}) {
  let worker = null;
  let readyPromise = null;
  let nextId = 0;
  const waiting = new Map();
  const preparing = new Map();

  function fail(message) {
    for (const { reject } of waiting.values()) reject(new Error(message));
    waiting.clear();
    for (const { reject } of preparing.values()) reject(new Error(message));
    preparing.clear();
    if (worker) worker.terminate();
    worker = null;
    readyPromise = null;
  }

  function ensureWorker() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { reject(new Error('timeout')); fail('timeout'); }, loadTimeoutMs);
      try {
        worker = new Worker(new URL('../../engine/rapfi/worker.js', import.meta.url));
      } catch (err) {
        clearTimeout(timer);
        readyPromise = null;
        reject(err);
        return;
      }
      worker.onerror = () => { clearTimeout(timer); reject(new Error('worker')); fail('worker'); };
      worker.onmessage = (e) => {
        const d = e.data;
        if (d.t === 'ready') { clearTimeout(timer); resolve(); return; }
        if (d.t === 'error') { clearTimeout(timer); reject(new Error(d.message)); fail(d.message); return; }
        if (d.t === 'prepared' || d.t === 'fail') {
          const entry = preparing.get(d.id) || waiting.get(d.id);
          if (!entry) return;
          preparing.delete(d.id);
          waiting.delete(d.id);
          if (d.t === 'fail') entry.reject(new Error(d.message));
          else entry.resolve();
          return;
        }
        if (d.t === 'move') {
          const entry = waiting.get(d.id);
          if (!entry) return;
          waiting.delete(d.id);
          const [x, y] = d.move.split(',').map(Number);
          const index = y * BOARD_SIZE + x;
          entry.resolve({ index, ...(parseSearchInfo(d.info, index) || {}) });
        }
      };
    });
    return readyPromise;
  }

  // Resolves with { index, depth?, eval?, ms?, pv? }; an answer to a request
  // that was superseded by a newer one is dropped (rejects with 'superseded').
  async function ask(moves, ruleset = 'freestyle') {
    await ensureWorker();
    for (const { reject } of waiting.values()) reject(new Error('superseded'));
    waiting.clear();
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      waiting.set(id, { resolve, reject });
      worker.postMessage({ t: 'ask', id, rule: ruleset === 'renju' ? 4 : 0, ms: searchMs, board: boardCommand(moves) });
    });
  }

  // Loads the engine and, for Renju, its extra weight files (fetched on demand).
  // Resolves true when the engine is ready for that ruleset, false otherwise.
  async function preload(ruleset = 'freestyle') {
    try {
      await ensureWorker();
      if (ruleset !== 'renju') return true;
      const id = ++nextId;
      await new Promise((resolve, reject) => {
        preparing.set(id, { resolve, reject });
        worker.postMessage({ t: 'prepare', id, rule: 4 });
      });
      return true;
    } catch {
      return false;
    }
  }

  return { ask, preload, isStarted: () => readyPromise !== null };
}
