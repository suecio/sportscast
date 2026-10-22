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
  // One scoreboard per match. The scorer code lets anyone who has it change the score;
  // the display code only shows it, and is turned off while the scoreboard is private.
  // Both codes share one namespace, so a code is never both at once.
  `CREATE TABLE IF NOT EXISTS scoreboards (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sport TEXT NOT NULL,
    scorer_code TEXT NOT NULL UNIQUE,
    display_code TEXT NOT NULL UNIQUE,
    private INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS scoreboards_owner ON scoreboards(owner_id, created_at)`,
  // A user's connected YouTube channel. Tokens are encrypted (crypto.js encryptText).
  `CREATE TABLE IF NOT EXISTS youtube_accounts (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_title TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    access_token TEXT,
    access_expires_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  // The YouTube live stream made for a scoreboard. The stream key is encrypted.
  `CREATE TABLE IF NOT EXISTS board_streams (
    board_id TEXT PRIMARY KEY REFERENCES scoreboards(id) ON DELETE CASCADE,
    broadcast_id TEXT NOT NULL,
    stream_id TEXT NOT NULL,
    title TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    privacy TEXT NOT NULL,
    ingest_url TEXT NOT NULL,
    stream_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
];

// Columns added after a table was first created. SQLite has no "ADD COLUMN IF NOT EXISTS".
const ADDED_COLUMNS = [
  // Volleyball match format as JSON: bestOf, pointsPerSet, decidingSetPoints, maxTimeouts.
  ["scoreboards", "format", "TEXT"],
];

async function addColumns(db) {
  for (const [table, column, type] of ADDED_COLUMNS) {
    const { results } = await db.prepare(`PRAGMA table_info(${table})`).all();
    if (results.some((c) => c.name === column)) continue;
    try {
      await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    } catch (err) {
      // Another copy of the Worker added it at the same moment.
      if (!String(err).includes("duplicate column")) throw err;
    }
  }
}

let ready = null;

export function ensureSchema(db) {
  if (!ready) {
    ready = db.batch(SCHEMA.map((sql) => db.prepare(sql))).then(() => addColumns(db)).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
