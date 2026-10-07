import { move, allLegalMoves, analyzeMove, opponent, toIndex, toCoords, BOARD_SIZE, PLAYERS } from './gomoku.js';
import { createMinimaxAI } from './minimaxAI.js';

// hard used to be depth 2, same as normal — identical search depth meant
// they played at basically the same strength, with any win/loss split just
// coming down to move-order shuffling rather than hard actually searching
// deeper. Self-play testing confirmed it (roughly 50/50 instead of hard
// dominating) before this got bumped.
export const DIFFICULTY_DEPTH = { easy: 1, normal: 2, hard: 3, master: 4 };

const DIRS4 = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// Does placing `player` at `idx` create a four-in-a-row with at least one
// open end (a "live four") — i.e. a near-certain win next move, the single
// most urgent pattern in Gomoku short of an outright five? Used to force
// these cells into the AI's candidate list regardless of density ranking —
// without this, a three being extended into an open four can have *lower*
// density than crowded-but-irrelevant cells nearby and get pruned away by
// MAX_CANDIDATES, so the AI neither finishes its own fours nor blocks the
// opponent's (confirmed by a real missed block during live testing).
function makesFour(cells, idx, player) {
  const { row, col } = toCoords(idx);
  for (const { dr, dc } of DIRS4) {
    let length = 1;
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && cells[toIndex(r, c)] === player) { length++; r += dr; c += dc; }
    const openEnd = inBounds(r, c) && cells[toIndex(r, c)] === null;
    let r2 = row - dr;
    let c2 = col - dc;
    while (inBounds(r2, c2) && cells[toIndex(r2, c2)] === player) { length++; r2 -= dr; c2 -= dc; }
    const openStart = inBounds(r2, c2) && cells[toIndex(r2, c2)] === null;
    if (length >= 4 && (openStart || openEnd)) return true;
  }
  return false;
}

// Full-width minimax over all 225 points is far too slow — restrict the
// search to empty, legal points near existing stones, ranked by how many
// stones surround them (a cheap proxy for "this is where the action is")
// and capped to a fixed count. The cap matters more than it might look:
// at depth 4, an uncapped candidate list (which can easily reach 60-80
// cells by midgame) pushes worst-case node counts into the hundreds of
// millions and a single "master" move past 6 seconds — capping to the
// most contested cells, searched first, keeps it fast and also gives
// alpha-beta better cutoffs since the strongest-looking moves go first.
const MAX_CANDIDATES = 20;

function candidateMoves(state, player) {
  const legal = allLegalMoves(state, player);
  if (legal.length === 0) return [];
  const legalSet = new Set(legal.map((m) => m.to));

  const hasStones = state.cells.some((cell) => cell !== null);
  if (!hasStones) {
    const center = toIndex(Math.floor(BOARD_SIZE / 2), Math.floor(BOARD_SIZE / 2));
    return legalSet.has(center) ? [{ from: null, to: center }] : legal;
  }

  const density = new Map(); // candidate index -> nearby-stone count
  for (let i = 0; i < state.cells.length; i++) {
    if (!state.cells[i]) continue;
    const { row, col } = toCoords(i);
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const idx = toIndex(r, c);
        if (!legalSet.has(idx)) continue;
        density.set(idx, (density.get(idx) || 0) + 1);
      }
    }
  }
  if (density.size === 0) return legal;

  // The density cap alone can prune away a move that actually wins right
  // now, or one that stops the opponent from winning next turn — a few
  // such "critical" cells can easily have low density (e.g. the open end
  // of a long, thin line of stones) and get crowded out by busier-looking
  // but tactically irrelevant intersections. Both are cheap to check
  // within this already-small near-stones pool, so they're always kept.
  const opp = opponent(player);
  const critical = [];
  for (const idx of density.keys()) {
    const trial = state.cells.slice();
    trial[idx] = player;
    if (analyzeMove(trial, idx, player, state.ruleset).win) { critical.push(idx); continue; }
    if (makesFour(trial, idx, player)) { critical.push(idx); continue; }
    trial[idx] = opp;
    if (analyzeMove(trial, idx, opp, state.ruleset).win) { critical.push(idx); continue; }
    if (makesFour(trial, idx, opp)) critical.push(idx);
  }

  const ranked = [...density.entries()].sort((a, b) => b[1] - a[1]).map(([idx]) => idx);
  const criticalSet = new Set(critical);
  const rest = ranked.filter((idx) => !criticalSet.has(idx));
  const combined = [...critical, ...rest].slice(0, Math.max(MAX_CANDIDATES, critical.length));
  return combined.map((to) => ({ from: null, to }));
}

// Simple pattern-table heuristic: for every run of a player's stones, score
// it by length and how many ends are open (able to extend). This is the
// standard quick-and-dirty Gomoku evaluation — good enough to make the AI
// chase its own open threes/fours and block the opponent's, without a real
// threat-space search.
const RUN_SCORE = {
  '4-2': 100000, '4-1': 10000, '4-0': 0,
  '3-2': 1000, '3-1': 100, '3-0': 0,
  '2-2': 50, '2-1': 10, '2-0': 0,
  '1-2': 2, '1-1': 1, '1-0': 0,
};

function positionalScore(cells, player) {
  let score = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (cells[toIndex(row, col)] !== player) continue;
      for (const { dr, dc } of DIRS4) {
        const pr = row - dr;
        const pc = col - dc;
        if (inBounds(pr, pc) && cells[toIndex(pr, pc)] === player) continue; // not the start of this run
        let length = 0;
        let r = row;
        let c = col;
        while (inBounds(r, c) && cells[toIndex(r, c)] === player) {
          length++;
          r += dr;
          c += dc;
        }
        if (length >= 5) {
          score += 1000000;
          continue;
        }
        const startOpen = inBounds(pr, pc) && cells[toIndex(pr, pc)] === null;
        const endOpen = inBounds(r, c) && cells[toIndex(r, c)] === null;
        const openEnds = (startOpen ? 1 : 0) + (endOpen ? 1 : 0);
        score += RUN_SCORE[`${length}-${openEnds}`] ?? 0;
      }
    }
  }
  return score;
}

function evaluate(state, perspective) {
  if (state.winner === perspective) return 1_000_000;
  if (state.winner === 'draw') return 0;
  if (state.winner) return -1_000_000;
  const opp = opponent(perspective);
  return positionalScore(state.cells, perspective) - positionalScore(state.cells, opp);
}

export const chooseAIMove = createMinimaxAI({
  move,
  allLegalMoves: candidateMoves,
  opponent,
  evaluate,
  depths: DIFFICULTY_DEPTH,
});

export { PLAYERS };
