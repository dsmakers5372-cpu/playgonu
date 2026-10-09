// Jul-gonu-family games have no rule for a game that stops going anywhere,
// so two careful players (or two AIs) could shuffle forever. After this many
// consecutive moves with no capture (both sides counted) the game is decided
// on pieces left — "상대편 말을 많이 없애는 편이 이긴다" for 줄고누 in the
// Encyclopedia of Korean Culture (encykorea.aks.ac.kr/Article/E0003367); an
// equal count is a draw.
export const QUIET_MOVE_LIMIT = 40;

// The winner when the quiet-move limit is reached: whoever has more pieces
// left, or 'draw' on an equal count.
export function decideByCount(pieces, a, b) {
  let na = 0;
  let nb = 0;
  for (const p of pieces) {
    if (p === a) na++;
    else if (p === b) nb++;
  }
  return na > nb ? a : nb > na ? b : 'draw';
}

export function createGrid(rows, cols) {
  const size = rows * cols;

  function toIndex(row, col) {
    return row * cols + col;
  }

  function toCoords(index) {
    return { row: Math.floor(index / cols), col: index % cols };
  }

  function orthogonalNeighbors(index) {
    const { row, col } = toCoords(index);
    const result = [];
    if (row > 0) result.push(toIndex(row - 1, col));
    if (row < rows - 1) result.push(toIndex(row + 1, col));
    if (col > 0) result.push(toIndex(row, col - 1));
    if (col < cols - 1) result.push(toIndex(row, col + 1));
    return result;
  }

  return { rows, cols, size, toIndex, toCoords, orthogonalNeighbors };
}
