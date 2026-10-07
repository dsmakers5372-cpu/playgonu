function shuffled(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const DEFAULT_DIFFICULTY_DEPTH = { easy: 1, normal: 3, hard: 5, master: 6 };

// A game-agnostic minimax+alpha-beta move chooser. Pass the target engine's
// own move/allLegalMoves/opponent functions plus an evaluate(state, perspective)
// heuristic, and get back a chooseAIMove(state, { difficulty }) for it.
export function createMinimaxAI({ move, allLegalMoves, opponent, evaluate, depths = DEFAULT_DIFFICULTY_DEPTH }) {
  function minimax(state, depth, player, perspective, alpha, beta) {
    if (depth === 0 || state.winner) {
      return { score: evaluate(state, perspective) };
    }

    const maximizing = player === perspective;
    let best = null;
    for (const candidate of shuffled(allLegalMoves(state, player))) {
      const nextState = move(state, candidate.from, candidate.to);
      // Use the resulting state's own turn rather than always flipping to
      // opponent(player): some games (e.g. Cham-gonu's mill capture) keep
      // the same player on the move for a follow-up action.
      const { score } = minimax(nextState, depth - 1, nextState.turn, perspective, alpha, beta);
      if (best === null || (maximizing ? score > best.score : score < best.score)) {
        best = { score, move: candidate };
      }
      if (maximizing) alpha = Math.max(alpha, best.score);
      else beta = Math.min(beta, best.score);
      if (beta <= alpha) break;
    }
    return best;
  }

  return function chooseAIMove(state, { difficulty = 'normal' } = {}) {
    const moves = allLegalMoves(state, state.turn);
    if (moves.length === 0) return null;
    const depth = depths[difficulty] ?? depths.normal;
    return minimax(state, depth, state.turn, state.turn, -Infinity, Infinity).move;
  };
}
