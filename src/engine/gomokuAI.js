import { move, allLegalMoves, opponent, toIndex, toCoords, BOARD_SIZE, PLAYERS } from './gomoku.js';
import { createMinimaxAI } from './minimaxAI.js';

export const DIFFICULTY_DEPTH = { easy: 1, normal: 2, hard: 2, master: 3 };

const DIRS4 = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// Full-width minimax over all 225 points is far too slow — restrict the
// search to empty, legal points within 2 cells of an existing stone (plus
// the center on an empty board). Branching factor stays in the dozens
// instead of the hundreds, which is what makes a few plies of lookahead
// affordable in the browser.
function candidateMoves(state, player) {
  const legal = allLegalMoves(state, player);
  if (legal.length === 0) return [];
  const legalSet = new Set(legal.map((m) => m.to));

  const hasStones = state.cells.some((cell) => cell !== null);
  if (!hasStones) {
    const center = toIndex(Math.floor(BOARD_SIZE / 2), Math.floor(BOARD_SIZE / 2));
    return legalSet.has(center) ? [{ from: null, to: center }] : legal;
  }

  const near = new Set();
  for (let i = 0; i < state.cells.length; i++) {
    if (!state.cells[i]) continue;
    const { row, col } = toCoords(i);
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const idx = toIndex(r, c);
        if (legalSet.has(idx)) near.add(idx);
      }
    }
  }
  return near.size > 0 ? [...near].map((to) => ({ from: null, to })) : legal;
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
