import { analyzeMove, BOARD_SIZE, RULESETS } from './gomoku.js';

// "Pro" Gomoku engine. Differs from gomokuAI.js (plain alpha-beta over a
// density-ranked candidate list) in four ways:
//  1. Evaluation and move ordering come from incrementally maintained
//     five-cell windows, so a node costs ~20 window updates instead of a
//     full-board rescan.
//  2. A VCF search (chain of fours) runs at the root and at the search
//     horizon, so forced wins and the opponent's forced wins are seen far
//     beyond the nominal depth.
//  3. Iterative-deepening PVS with a transposition table, bounded by a node
//     budget (Date.now() does not advance inside a Cloudflare Worker, so the
//     clock is only a secondary limit).
//  4. Renju: black's forbidden points are enforced during search through the
//     same analyzeMove used by the game engine, only for moves actually tried.
//  5. (v1.3) A threat-space search (VCT-lite) on top of VCF: the attacker may
//     also play a move that makes a three, as long as it wins against every
//     block of that three. Used at the root to find wins and to drop root
//     moves that hand the opponent such a win.

export const PRO_VERSION = '1.3';

const N = BOARD_SIZE;
const CELLS = N * N;
const CENTER = (N >> 1) * N + (N >> 1);
const WIN = 1_000_000;
const INF = 10_000_000;
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

const ROW = new Uint8Array(CELLS);
const COL = new Uint8Array(CELLS);
for (let i = 0; i < CELLS; i++) { ROW[i] = Math.floor(i / N); COL[i] = i % N; }

const WIN_CELLS = [];
const CELL_WINS = Array.from({ length: CELLS }, () => []);
for (const [dr, dc] of DIRS) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const er = r + 4 * dr;
      const ec = c + 4 * dc;
      if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
      const id = WIN_CELLS.length / 5;
      for (let k = 0; k < 5; k++) {
        const cell = (r + k * dr) * N + (c + k * dc);
        WIN_CELLS.push(cell);
        CELL_WINS[cell].push(id);
      }
    }
  }
}
const W = WIN_CELLS.length / 5;

const NEAR2 = Array.from({ length: CELLS }, (_, i) => {
  const out = [];
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (!dr && !dc) continue;
      const r = ROW[i] + dr;
      const c = COL[i] + dc;
      if (r >= 0 && r < N && c >= 0 && c < N) out.push(r * N + c);
    }
  }
  return out;
});

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) | 0;
  };
}
const zr = mulberry32(0x50524f);
const Z1 = new Int32Array(CELLS * 2).map(() => zr());
const Z2 = new Int32Array(CELLS * 2).map(() => zr());

// Window value by stone count (a window holding stones of one colour only).
const V = [0, 1, 10, 110, 1200, 100000];
// Move-ordering value by existing count in a window the move would extend.
const T = [1, 8, 70, 900, 100000];
const WIDTH = [24, 14, 12, 9, 8, 7, 6];
const EXACT = 0;
const LOWER = 1;
const UPPER = 2;

const b = new Uint8Array(CELLS);
const cnt = [new Uint8Array(W), new Uint8Array(W)];
const nb = new Uint8Array(CELLS);
const sc = [0, 0];
const fourCnt = [0, 0];
const threeCnt = [0, 0];
const scoreArr = new Float64Array(CELLS);
const stamp = new Int32Array(CELLS);
let stampId = 0;
let legacy = null;
let renju = false;
let h1 = 0;
let h2 = 0;
let stones = 0;
let tt = new Map();
let nodes = 0;
let nodeLimit = 0;
let deadline = 0;
let aborted = false;
let vcfLeft = 0;
let vcfMove = -1;
let vctLeft = 0;
let vctMove = -1;
let lastInfo = { depth: 0, score: 0 };

function applyWin(w, sign) {
  const a = cnt[0][w];
  const d = cnt[1][w];
  if (a > 0 && d === 0) {
    sc[0] += sign * V[a];
    if (a === 4) fourCnt[0] += sign; else if (a === 3) threeCnt[0] += sign;
  } else if (d > 0 && a === 0) {
    sc[1] += sign * V[d];
    if (d === 4) fourCnt[1] += sign; else if (d === 3) threeCnt[1] += sign;
  }
}

function place(x, s) {
  b[x] = s + 1;
  if (legacy) legacy[x] = s ? 'B' : 'A';
  const ws = CELL_WINS[x];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i];
    applyWin(w, -1);
    cnt[s][w]++;
    applyWin(w, 1);
  }
  const near = NEAR2[x];
  for (let i = 0; i < near.length; i++) nb[near[i]]++;
  h1 ^= Z1[x * 2 + s];
  h2 ^= Z2[x * 2 + s];
  stones++;
}

function unplace(x, s) {
  b[x] = 0;
  if (legacy) legacy[x] = null;
  const ws = CELL_WINS[x];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i];
    applyWin(w, -1);
    cnt[s][w]--;
    applyWin(w, 1);
  }
  const near = NEAR2[x];
  for (let i = 0; i < near.length; i++) nb[near[i]]--;
  h1 ^= Z1[x * 2 + s];
  h2 ^= Z2[x * 2 + s];
  stones--;
}

function makesFive(x, piece, exact) {
  const r0 = ROW[x];
  const c0 = COL[x];
  for (let d = 0; d < 4; d++) {
    const dr = DIRS[d][0];
    const dc = DIRS[d][1];
    let len = 1;
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === piece) { len++; r += dr; c += dc; }
    r = r0 - dr;
    c = c0 - dc;
    while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === piece) { len++; r -= dr; c -= dc; }
    if (exact ? len === 5 : len >= 5) return true;
  }
  return false;
}

// 0 = illegal (renju foul for black, nothing placed), 1 = placed, 2 = placed and wins.
function tryPlace(x, s) {
  place(x, s);
  if (renju && s === 0) {
    const r = analyzeMove(legacy, x, 'A', RULESETS.RENJU);
    if (!r.legal) { unplace(x, s); return 0; }
    return r.win ? 2 : 1;
  }
  return makesFive(x, s + 1, false) ? 2 : 1;
}

function wouldWin(e, s) {
  b[e] = s + 1;
  const r = makesFive(e, s + 1, renju && s === 0);
  b[e] = 0;
  return r;
}

function emptyIn(w) {
  for (let k = 0; k < 5; k++) {
    const c = WIN_CELLS[w * 5 + k];
    if (b[c] === 0) return c;
  }
  return -1;
}

function findCompletions(s) {
  const out = [];
  const o = 1 - s;
  for (let w = 0; w < W; w++) {
    if (cnt[s][w] !== 4 || cnt[o][w] !== 0) continue;
    const e = emptyIn(w);
    if (e >= 0 && !out.includes(e) && wouldWin(e, s)) out.push(e);
  }
  return out;
}

function completionsThrough(x, s) {
  const out = [];
  const o = 1 - s;
  const ws = CELL_WINS[x];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i];
    if (cnt[s][w] !== 4 || cnt[o][w] !== 0) continue;
    const e = emptyIn(w);
    if (e >= 0 && !out.includes(e) && wouldWin(e, s)) out.push(e);
  }
  return out;
}

function collectFourMakers(s) {
  const out = [];
  const o = 1 - s;
  stampId++;
  for (let w = 0; w < W; w++) {
    if (cnt[s][w] !== 3 || cnt[o][w] !== 0) continue;
    for (let k = 0; k < 5; k++) {
      const c = WIN_CELLS[w * 5 + k];
      if (b[c] === 0 && stamp[c] !== stampId) { stamp[c] = stampId; out.push(c); }
    }
  }
  return out;
}

// Does `s` (to move) have a forced win by making fours only?
function vcf(s, depth, isRoot) {
  if (vcfLeft <= 0) return false;
  vcfLeft--;
  const o = 1 - s;
  if (fourCnt[s] > 0 && findCompletions(s).length) return true;
  let cands = null;
  if (fourCnt[o] > 0) {
    const comps = findCompletions(o);
    if (comps.length > 1) return false;
    if (comps.length === 1) cands = comps;
  }
  if (depth <= 0) return false;
  if (!cands) {
    if (threeCnt[s] === 0) return false;
    cands = collectFourMakers(s);
  }
  for (const x of cands) {
    const r = tryPlace(x, s);
    if (!r) continue;
    if (r === 2) { unplace(x, s); if (isRoot) vcfMove = x; return true; }
    const comps = completionsThrough(x, s);
    let win = false;
    if (comps.length >= 2) {
      win = true;
    } else if (comps.length === 1) {
      const c = comps[0];
      const rr = tryPlace(c, o);
      if (!rr) {
        win = true;
      } else if (rr === 2) {
        unplace(c, o);
      } else {
        win = vcf(s, depth - 1, false);
        unplace(c, o);
      }
    }
    unplace(x, s);
    if (win) { if (isRoot) vcfMove = x; return true; }
  }
  return false;
}

// Empty cells that would turn a two into a three for `s`, best first.
function threeMakers(s, limit) {
  const o = 1 - s;
  const out = [];
  stampId++;
  for (let w = 0; w < W; w++) {
    if (cnt[s][w] !== 2 || cnt[o][w] !== 0) continue;
    for (let k = 0; k < 5; k++) {
      const c = WIN_CELLS[w * 5 + k];
      if (b[c] === 0 && stamp[c] !== stampId) { stamp[c] = stampId; scoreArr[c] = cellScore(c, s); out.push(c); }
    }
  }
  out.sort((p, q) => scoreArr[q] - scoreArr[p]);
  return out.length > limit ? out.slice(0, limit) : out;
}

// Cells the defender can use against the threat `s` currently holds: the
// completion of a four, otherwise every empty cell of a free three-window.
function threatReplies(s) {
  if (fourCnt[s] > 0) return findCompletions(s);
  const o = 1 - s;
  const out = [];
  stampId++;
  for (let w = 0; w < W; w++) {
    if (cnt[s][w] !== 3 || cnt[o][w] !== 0) continue;
    for (let k = 0; k < 5; k++) {
      const c = WIN_CELLS[w * 5 + k];
      if (b[c] === 0 && stamp[c] !== stampId) { stamp[c] = stampId; out.push(c); }
    }
  }
  return out;
}

// Threat-space search for `s` to move: does s win by fours and threes? A
// three-move only counts when s wins even if the defender ignores it (VCF)
// and also against every block of it. Skipped while the defender holds a
// three of their own, because their fours could break the attack.
function vct(s, depth, isRoot) {
  const o = 1 - s;
  if (depth <= 0 || vctLeft <= 0 || threeCnt[o] > 0 || fourCnt[o] > 0) return false;
  const cands = threeMakers(s, isRoot ? 14 : 8);
  for (const x of cands) {
    if (--vctLeft <= 0) return false;
    const r = tryPlace(x, s);
    if (!r) continue;
    let win = false;
    vcfLeft = 60;
    if (r !== 2 && vcf(s, 8, false)) {
      const reps = threatReplies(s);
      win = reps.length > 0;
      for (const d of reps) {
        const rr = tryPlace(d, o);
        if (!rr) continue;
        if (rr === 2) { unplace(d, o); win = false; break; }
        vcfLeft = 60;
        const ok = vcf(s, 8, false) || vct(s, depth - 1, false);
        unplace(d, o);
        if (!ok) { win = false; break; }
      }
    } else if (r === 2) {
      win = true;
    }
    unplace(x, s);
    if (win) { if (isRoot) vctMove = x; return true; }
  }
  return false;
}

function cellScore(x, s) {
  const o = 1 - s;
  let att = 0;
  let def = 0;
  const ws = CELL_WINS[x];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i];
    const a = cnt[s][w];
    const d = cnt[o][w];
    if (d === 0) att += T[a];
    if (a === 0) def += T[d];
  }
  return att + def * 0.85;
}

const poolBuf = new Int32Array(CELLS);

function bestRemaining(pool, from, n) {
  let m = -1;
  for (let i = from; i < n; i++) if (scoreArr[pool[i]] > m) m = scoreArr[pool[i]];
  return m;
}

function genMoves(s, ply, ttMove, width) {
  const pool = poolBuf;
  let n = 0;
  for (let x = 0; x < CELLS; x++) {
    if (b[x] !== 0 || nb[x] === 0) continue;
    scoreArr[x] = cellScore(x, s);
    pool[n++] = x;
  }
  const w = width ?? WIDTH[Math.min(ply, WIDTH.length - 1)];
  // Partial selection: pull the best cells to the front until `w` are taken,
  // then keep going only while the next cell is tactically loud.
  const list = [];
  let taken = 0;
  while (taken < n && (taken < w || (taken < 20 && bestRemaining(pool, taken, n) >= 800))) {
    let bi = taken;
    for (let i = taken + 1; i < n; i++) if (scoreArr[pool[i]] > scoreArr[pool[bi]]) bi = i;
    const t = pool[bi]; pool[bi] = pool[taken]; pool[taken] = t;
    list.push(t);
    taken++;
  }
  if (ttMove >= 0) {
    const i = list.indexOf(ttMove);
    if (i > 0) { list.splice(i, 1); list.unshift(ttMove); }
  }
  return list;
}

function toTT(v, ply) { return v > WIN - 1000 ? v + ply : v < -WIN + 1000 ? v - ply : v; }
function fromTT(v, ply) { return v > WIN - 1000 ? v - ply : v < -WIN + 1000 ? v + ply : v; }

function evalStatic(s) {
  return sc[s] * 1.15 - sc[1 - s];
}

function negamax(s, depth, alpha, beta, ply) {
  if (++nodes > nodeLimit || ((nodes & 2047) === 0 && Date.now() > deadline)) aborted = true;
  if (aborted) return 0;
  const o = 1 - s;
  if (fourCnt[s] > 0 && findCompletions(s).length) return WIN - ply;
  let forced = -1;
  if (fourCnt[o] > 0) {
    const comps = findCompletions(o);
    if (comps.length > 1) return -(WIN - ply - 1);
    if (comps.length === 1) forced = comps[0];
  }
  if (stones >= CELLS) return 0;
  if (depth <= 1 && forced < 0 && threeCnt[s] > 0) {
    vcfLeft = 300;
    if (vcf(s, 8, false)) return WIN - ply - 2;
  }
  if (depth <= 0) return evalStatic(s);

  const key = h1 >>> 0;
  let ttMove = -1;
  const e = tt.get(key);
  if (e && e.h2 === h2) {
    ttMove = e.move;
    if (e.depth >= depth) {
      const v = fromTT(e.value, ply);
      if (e.flag === EXACT) return v;
      if (e.flag === LOWER && v >= beta) return v;
      if (e.flag === UPPER && v <= alpha) return v;
    }
  }

  const moves = forced >= 0 ? [forced] : genMoves(s, ply, ttMove);
  const alpha0 = alpha;
  let best = -INF;
  let bestMove = -1;
  let first = true;
  for (const m of moves) {
    const r = tryPlace(m, s);
    if (!r) continue;
    let v;
    if (r === 2) {
      v = WIN - ply - 1;
    } else if (first) {
      v = -negamax(o, depth - 1, -beta, -alpha, ply + 1);
    } else {
      v = -negamax(o, depth - 1, -alpha - 1, -alpha, ply + 1);
      if (v > alpha && v < beta && !aborted) v = -negamax(o, depth - 1, -beta, -alpha, ply + 1);
    }
    unplace(m, s);
    if (aborted) return 0;
    first = false;
    if (v > best) { best = v; bestMove = m; }
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  if (bestMove < 0) return forced >= 0 ? -(WIN - ply - 1) : 0;
  const flag = best <= alpha0 ? UPPER : best >= beta ? LOWER : EXACT;
  if (tt.size > 300000) tt.clear();
  tt.set(key, { h2, depth, flag, value: toTT(best, ply), move: bestMove });
  return best;
}

function setup(state) {
  b.fill(0);
  cnt[0].fill(0);
  cnt[1].fill(0);
  nb.fill(0);
  sc[0] = sc[1] = 0;
  fourCnt[0] = fourCnt[1] = 0;
  threeCnt[0] = threeCnt[1] = 0;
  h1 = h2 = 0;
  stones = 0;
  renju = state.ruleset === RULESETS.RENJU;
  legacy = renju ? new Array(CELLS).fill(null) : null;
  for (let i = 0; i < CELLS; i++) {
    const c = state.cells[i];
    if (c) place(i, c === 'A' ? 0 : 1);
  }
}

function fallbackMove(s) {
  for (let x = 0; x < CELLS; x++) {
    if (b[x] !== 0) continue;
    const r = tryPlace(x, s);
    if (r) { unplace(x, s); return x; }
  }
  return -1;
}

// Returns { from: null, to } like chooseAIMove in gomokuAI.js.
// options: nodeBudget (default 250000), timeMs (default 4000), maxDepth
// (default 16), random (0..1 source, used only for the opening reply).
export function chooseProMove(state, options = {}) {
  setup(state);
  lastInfo = { depth: 0, score: 0 };
  const s = state.turn === 'A' ? 0 : 1;
  const o = 1 - s;
  const pick = (to) => ({ from: null, to });
  if (stones === 0) return pick(CENTER);

  if (stones === 1 && options.random) {
    const choices = [-N - 1, -N, -N + 1, -1, 1, N - 1, N, N + 1].map((d) => CENTER + d).filter((x) => b[x] === 0);
    if (choices.length) return pick(choices[Math.floor(options.random() * choices.length)]);
  }

  if (fourCnt[s] > 0) {
    const win = findCompletions(s);
    if (win.length) return pick(win[0]);
  }
  if (fourCnt[o] > 0) {
    const comps = findCompletions(o);
    if (comps.length >= 1) {
      for (const c of comps) {
        const r = tryPlace(c, s);
        if (r) { unplace(c, s); return pick(c); }
      }
      return pick(fallbackMove(s));
    }
  }

  vcfLeft = 40000;
  vcfMove = -1;
  if (vcf(s, 20, true) && vcfMove >= 0) return pick(vcfMove);

  vctLeft = 2500;
  vctMove = -1;
  if (vct(s, 4, true) && vctMove >= 0) return pick(vctMove);

  nodes = 0;
  nodeLimit = options.nodeBudget ?? 250000;
  if (stones <= 4) nodeLimit = Math.min(nodeLimit, options.openingNodes ?? 15000);
  const startedAt = Date.now();
  let moveMs = options.timeMs ?? 4000;
  if (options.totalMsLeft != null) {
    // Match clock: spread what is left over the moves we still expect to play.
    moveMs = Math.min(moveMs, Math.max(300, options.totalMsLeft / Math.max(8, 24 - (stones >> 1))));
  }
  deadline = startedAt + moveMs;
  let stable = 0;
  let prevBest = -1;
  aborted = false;
  tt = new Map();
  const maxDepth = options.maxDepth ?? 16;

  let moves = genMoves(s, 0, -1, 24);
  if (!moves.length) return pick(fallbackMove(s));
  let bestMove = moves[0];

  // Drop root moves after which the opponent has a forced win by fours/threes.
  const safe = [];
  for (const m of moves) {
    const r = tryPlace(m, s);
    if (!r) continue;
    let bad = false;
    if (r !== 2) {
      vcfLeft = 2000;
      vctLeft = 400;
      bad = vcf(o, 12, false) || vct(o, 3, false);
    }
    unplace(m, s);
    if (!bad) safe.push(m);
  }
  if (safe.length) { moves = safe; bestMove = moves[0]; }

  for (let depth = 2; depth <= maxDepth; depth++) {
    let alpha = -INF;
    let best = -INF;
    let iterBest = -1;
    let first = true;
    const scores = new Map();
    for (const m of moves) {
      const r = tryPlace(m, s);
      if (!r) continue;
      let v;
      if (r === 2) {
        v = WIN;
      } else if (first) {
        v = -negamax(o, depth - 1, -INF, -alpha, 1);
      } else {
        v = -negamax(o, depth - 1, -alpha - 1, -alpha, 1);
        if (v > alpha && !aborted) v = -negamax(o, depth - 1, -INF, -alpha, 1);
      }
      unplace(m, s);
      if (aborted) break;
      first = false;
      scores.set(m, v);
      if (v > best) { best = v; iterBest = m; }
      if (v > alpha) alpha = v;
    }
    if (aborted || iterBest < 0) break;
    bestMove = iterBest;
    lastInfo = { depth, score: best };
    if (best >= WIN - 100) break;
    stable = iterBest === prevBest ? stable + 1 : 0;
    prevBest = iterBest;
    // Easy positions: the same move has won three iterations in a row.
    if (depth >= 8 && stable >= 3 && Date.now() - startedAt > 1500) break;
    // Keep the PV first and order the rest by this iteration's scores.
    moves = [...scores.keys()].sort((p, q) => scores.get(q) - scores.get(p));
    if (moves.length === 1) break;
    if (best <= -WIN + 100) break;
  }

  const r = tryPlace(bestMove, s);
  if (!r) return pick(fallbackMove(s));
  unplace(bestMove, s);
  return pick(bestMove);
}

export const proStats = () => ({ nodes, ...lastInfo });
