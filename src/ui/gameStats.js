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
  let startTime = Date.now();
  let moveCount = 0;
  let intervalId = null;

  function elapsedMs() {
    return Date.now() - startTime;
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
    startTime = Date.now();
    moveCount = 0;
  }

  function recordMove() {
    moveCount += 1;
  }

  function unrecordMove(count = 1) {
    moveCount = Math.max(0, moveCount - count);
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
