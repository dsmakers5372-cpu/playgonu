// Creates the admin tables on first use (IF NOT EXISTS), so a freshly made
// D1 database works without a separate migration step. Runs once per Worker
// instance. Keep in sync with migrations/0001_admin_blog_videos.sql.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL, lang TEXT NOT NULL, tag TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', published INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (slug, lang))`,
  `CREATE TABLE IF NOT EXISTS videos (
    game TEXT NOT NULL, lang TEXT NOT NULL, kind TEXT NOT NULL, youtube_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '', upload_date TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, PRIMARY KEY (game, lang, kind))`,
  `CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL)`,
];

let ready = null;
export function ensureSchema(env) {
  if (!env.DB) return Promise.resolve(false);
  if (!ready) {
    ready = env.DB.batch(STATEMENTS.map((s) => env.DB.prepare(s))).then(() => true, (err) => { ready = null; throw err; });
  }
  return ready;
}
