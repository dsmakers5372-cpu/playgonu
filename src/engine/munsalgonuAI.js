import { move, allLegalMoves, opponent } from './munsalgonu.js';
import { createMinimaxAI } from './minimaxAI.js';

export const DIFFICULTY_DEPTH = { easy: 1, normal: 3, hard: 4, master: 5 };

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
