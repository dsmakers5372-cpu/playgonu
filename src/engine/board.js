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
