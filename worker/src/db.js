// D1 tables for accounts. The Worker creates them on first use, so setting up the
// database needs no command line step. New tables in later phases are added here
// with "IF NOT EXISTS" too.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    lang TEXT NOT NULL DEFAULT 'en',
    email_verified_at INTEGER,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    created_at INTEGER NOT NULL
  )`,
  // purpose: signup (choose the first password), reset (choose a new one), login (magic link)
  `CREATE TABLE IF NOT EXISTS login_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    ip TEXT,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS login_tokens_user ON login_tokens(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS login_tokens_ip ON login_tokens(ip, created_at)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device TEXT NOT NULL DEFAULT 'web',
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
];

let ready = null;

export function ensureSchema(db) {
  if (!ready) {
    ready = db.batch(SCHEMA.map((sql) => db.prepare(sql))).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
