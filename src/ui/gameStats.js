export function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Tracks a game's move count and a live elapsed-time ticker, shared by all
// four variant UIs so the end-of-game summary (moves/time, like gomoku.com's
// win modal) behaves the same everywhere.
export function createGameStats({ onTick } = {}) {
  // The clock starts with the first move, not when the page opens.
  let startTime = null;
  let moveCount = 0;
  let intervalId = null;

  function elapsedMs() {
    return startTime === null ? 0 : Date.now() - startTime;
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  function start() {
    stop();
    if (onTick) {
      onTick(elapsedMs());
      intervalId = setInterval(() => onTick(elapsedMs()), 1000);
    }
  }

  function reset() {
    startTime = null;
    moveCount = 0;
  }

  function recordMove() {
    if (startTime === null) startTime = Date.now();
    moveCount += 1;
  }

  function unrecordMove(count = 1) {
    moveCount = Math.max(0, moveCount - count);
    if (moveCount === 0) startTime = null;
  }

  return {
    start,
    stop,
    reset,
    recordMove,
    unrecordMove,
    elapsedMs,
    get moveCount() {
      return moveCount;
    },
  };
}
