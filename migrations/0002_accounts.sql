-- Optional player accounts (email + password) and their online win/draw/loss
-- record. Personal data: email address, nickname, password hash. Unconfirmed
-- sign-ups are deleted after 7 days; a player can delete their own account.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  verified INTEGER NOT NULL DEFAULT 0,
  session_ver INTEGER NOT NULL DEFAULT 1,
  local_imported INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- One-time email links (confirm address, reset password); only a hash is kept.
CREATE TABLE IF NOT EXISTS user_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  expires_at INTEGER NOT NULL
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

-- Sign-in failures and emails sent, per address / network, per time window.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
