import { move, allLegalMoves, opponent } from './umulgonu.js';
import { createMinimaxAI, DEFAULT_DIFFICULTY_DEPTH } from './minimaxAI.js';

export const DIFFICULTY_DEPTH = DEFAULT_DIFFICULTY_DEPTH;

// No captures in Umul-gonu, so mobility is the only real signal: the player
// with fewer safe moves is the one closer to being blockaded.
function evaluate(state, perspective) {
  if (state.winner === perspective) return 1000;
  if (state.winner) return -1000;
  const opp = opponent(perspective);
  return allLegalMoves(state, perspective).length - allLegalMoves(state, opp).length;
}

export const chooseAIMove = createMinimaxAI({ move, allLegalMoves, opponent, evaluate });
