// Flood guard for room chat: per connection, at most 4 messages in any 10 s
// and 0.7 s apart. Over the limit the message is dropped without a reply.
const WINDOW_MS = 10000;
const MAX_IN_WINDOW = 4;
const MIN_GAP_MS = 700;

// conn carries `chatTimes`; returns true if the message may go out.
export function chatAllowed(conn, now = Date.now()) {
  const times = (conn.chatTimes || []).filter((t) => now - t < WINDOW_MS);
  conn.chatTimes = times;
  if (times.length >= MAX_IN_WINDOW) return false;
  if (times.length && now - times[times.length - 1] < MIN_GAP_MS) return false;
  times.push(now);
  return true;
}
