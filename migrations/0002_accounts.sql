-- Optional player accounts (an ID and a password, no email) and their online
-- win/draw/loss record. Kept until the player deletes the account.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  username_key TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  session_ver INTEGER NOT NULL DEFAULT 1,
  local_imported INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, game)
);

-- Failed sign-ins and new sign-ups per ID / network, per time window.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
