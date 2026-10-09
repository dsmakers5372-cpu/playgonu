import { move, allLegalMoves, legalMovesFrom, opponent } from './chamgonu.js';
import { createMinimaxAI } from './minimaxAI.js';

// Cham-gonu's branching factor is much larger than the other variants
// (up to 24 placement choices), so search shallower at every tier to stay
// responsive — depth here counts individual actions, and a capture is its
// own action, so a "shallow-looking" number still covers real plies.
const DIFFICULTY_DEPTH = { easy: 1, normal: 2, hard: 3, master: 4 };

function countPieces(state, player) {
  return state.pieces.reduce((n, p) => (p === player ? n + 1 : n), 0);
}

// chamgonu.js's exported allLegalMoves() only returns moves for whichever
// player `state.turn` currently is (it returns [] for the other side) —
// correct for move legality, but useless as a symmetric mobility heuristic:
// at a given search leaf, only one of the two players can ever get credit,
// regardless of which side the board actually favors. This recomputes
// mobility for an arbitrary player by temporarily pretending it's their
// turn, so both sides are scored on the same footing.
function mobilityFor(state, player) {
  if (state.winner || state.phase !== 'moving' || state.pendingCapture) return 0;
  let count = 0;
  for (let i = 0; i < state.pieces.length; i++) {
    if (state.pieces[i] !== player) continue;
    count += legalMovesFrom({ ...state, turn: player }, i).length;
  }
  return count;
}

function evaluate(state, perspective) {
  if (state.winner === 'draw') return 0;
  if (state.winner === perspective) return 1000;
  if (state.winner) return -1000;
  const opp = opponent(perspective);
  const material = (countPieces(state, perspective) - countPieces(state, opp)) * 10;
  const mobility = mobilityFor(state, perspective) - mobilityFor(state, opp);
  return material + mobility;
}

export const chooseAIMove = createMinimaxAI({ move, allLegalMoves, opponent, evaluate, depths: DIFFICULTY_DEPTH });
export { DIFFICULTY_DEPTH };
