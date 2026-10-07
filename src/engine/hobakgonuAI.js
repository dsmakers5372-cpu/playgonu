import { move, allLegalMoves, opponent } from './hobakgonu.js';
import { createMinimaxAI, DEFAULT_DIFFICULTY_DEPTH } from './minimaxAI.js';

export const DIFFICULTY_DEPTH = DEFAULT_DIFFICULTY_DEPTH;

// No captures in Hobak-gonu either: mobility is the only real signal.
function evaluate(state, perspective) {
  if (state.winner === perspective) return 1000;
  if (state.winner) return -1000;
  const opp = opponent(perspective);
  return allLegalMoves(state, perspective).length - allLegalMoves(state, opp).length;
}

export const chooseAIMove = createMinimaxAI({ move, allLegalMoves, opponent, evaluate });
