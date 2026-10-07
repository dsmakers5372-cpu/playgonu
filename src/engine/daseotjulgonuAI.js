import { move, allLegalMoves, opponent } from './daseotjulgonu.js';
import { createMinimaxAI, DEFAULT_DIFFICULTY_DEPTH } from './minimaxAI.js';

export const DIFFICULTY_DEPTH = DEFAULT_DIFFICULTY_DEPTH;

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

export const chooseAIMove = createMinimaxAI({ move, allLegalMoves, opponent, evaluate });
