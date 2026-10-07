import { move, allLegalMoves, opponent } from './palpalgonu.js';
import { createMinimaxAI } from './minimaxAI.js';

// The 8x8 board gives a much larger branching factor than the smaller
// 줄고누-family boards, so search shallower per tier (same reasoning as
// chamgonuAI.js) to stay responsive.
export const DIFFICULTY_DEPTH = { easy: 1, normal: 2, hard: 3, master: 4 };

function countPieces(state, player) {
  return state.pieces.reduce((n, p) => (p === player ? n + 1 : n), 0);
}

function evaluate(state, perspective) {
  if (state.winner === perspective) return 1000;
  if (state.winner) return -1000;
  const opp = opponent(perspective);
  const material = (countPieces(state, perspective) - countPieces(state, opp)) * 10;
  const mobility = allLegalMoves(state, perspective).length - allLegalMoves(state, opp).length;
  return material + mobility;
}

export const chooseAIMove = createMinimaxAI({ move, allLegalMoves, opponent, evaluate, depths: DIFFICULTY_DEPTH });
