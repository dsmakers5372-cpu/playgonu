// 나홀로고누 (Naholo-gonu, "all-alone gonu") — confirmed by a direct quote
// (goodmorningcc.com) to be a 1-PLAYER puzzle, essentially identical to
// Western peg solitaire: a 33-point cross-shaped board, 32 pegs filling
// every point but the center, jump an adjacent peg orthogonally into the
// empty point beyond it (removing the jumped peg), repeat until no jump is
// left. The goal is to end with as few pegs as possible — ideally 1.
//
// Unlike every other variant on this site, there's no opponent and no
// winner/loser — just a running peg count and a "no moves left" end state.
const SIZE = 7;

function toIndex(row, col) {
  return row * SIZE + col;
}

function toCoords(index) {
  return { row: Math.floor(index / SIZE), col: index % SIZE };
}

const VALID_CELLS = (() => {
  const cells = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const inCornerBlock = (row < 2 || row > 4) && (col < 2 || col > 4);
      if (!inCornerBlock) cells.push(toIndex(row, col));
    }
  }
  return cells;
})();
const VALID = new Set(VALID_CELLS);
const CENTER = toIndex(3, 3);

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

export function createInitialState() {
  const pegs = new Array(SIZE * SIZE).fill(null);
  for (const i of VALID_CELLS) pegs[i] = true;
  pegs[CENTER] = false;
  return { pegs, finished: false, moveCount: 0 };
}

export function countPegs(state) {
  return state.pegs.reduce((n, p) => (p === true ? n + 1 : n), 0);
}

// Every legal jump FROM `index`, as the landing point.
export function legalMovesFrom(state, index) {
  if (!VALID.has(index) || state.pegs[index] !== true) return [];
  const { row, col } = toCoords(index);
  const targets = [];
  for (const { dr, dc } of DIRECTIONS) {
    const midRow = row + dr;
    const midCol = col + dc;
    const toRow = row + dr * 2;
    const toCol = col + dc * 2;
    if (midRow < 0 || midRow >= SIZE || midCol < 0 || midCol >= SIZE) continue;
    if (toRow < 0 || toRow >= SIZE || toCol < 0 || toCol >= SIZE) continue;
    const midIndex = toIndex(midRow, midCol);
    const toI = toIndex(toRow, toCol);
    if (!VALID.has(midIndex) || !VALID.has(toI)) continue;
    if (state.pegs[midIndex] === true && state.pegs[toI] === false) targets.push(toI);
  }
  return targets;
}

export function hasAnyLegalMove(state) {
  for (const i of VALID_CELLS) {
    if (legalMovesFrom(state, i).length > 0) return true;
  }
  return false;
}

export function move(state, from, to) {
  if (state.finished) throw new Error('Game already over');
  if (!legalMovesFrom(state, from).includes(to)) throw new Error('Illegal move');

  const { row: fr, col: fc } = toCoords(from);
  const { row: tr, col: tc } = toCoords(to);
  const midIndex = toIndex((fr + tr) / 2, (fc + tc) / 2);

  const next = { pegs: state.pegs.slice(), finished: false, moveCount: state.moveCount + 1 };
  next.pegs[from] = false;
  next.pegs[midIndex] = false;
  next.pegs[to] = true;
  next.lastJump = { from, over: midIndex, to };

  if (!hasAnyLegalMove(next)) next.finished = true;
  return next;
}

export { VALID_CELLS, CENTER, toIndex, toCoords, SIZE };
