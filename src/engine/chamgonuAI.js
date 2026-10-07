import { move, allLegalMoves, opponent } from './chamgonu.js';
import { createMinimaxAI } from './minimaxAI.js';

// Cham-gonu's branching factor is much larger than the other variants
// (up to 24 placement choices), so search shallower at every tier to stay
// responsive — depth here counts individual actions, and a capture is its
// own action, so a "shallow-looking" number still covers real plies.
const DIFFICULTY_DEPTH = { easy: 1, normal: 2, hard: 3, master: 4 };

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
export { DIFFICULTY_DEPTH };
