const ACCOUNT_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    ic_hash TEXT,
    profile_picture TEXT,
    is_verified INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_locked INTEGER NOT NULL DEFAULT 0,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    lock_until TEXT,
    last_login TEXT,
    created_at TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    language TEXT NOT NULL DEFAULT 'en',
    theme TEXT NOT NULL DEFAULT 'light',
    privacy_level TEXT NOT NULL DEFAULT 'private',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    ip_address TEXT,
    details TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`,
];

let initialized: Promise<void> | null = null;

export function ensureAccountSchema(db: D1Database): Promise<void> {
  if (!initialized) initialized = db.batch(ACCOUNT_SCHEMA.map((statement) => db.prepare(statement))).then(async () => {
    try { await db.prepare("ALTER TABLE users ADD COLUMN ic_hash TEXT").run(); } catch { /* Existing databases already have the column. */ }
    try { await db.prepare("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'").run(); } catch { /* Existing databases already have the column. */ }
  });
  return initialized.catch((error) => {
    initialized = null;
    throw error;
  });
}
