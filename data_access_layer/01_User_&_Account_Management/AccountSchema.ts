const ACCOUNT_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
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

const DEFAULT_PASSWORD_HASH = "travelsyncsalt1234567890abcdef12.bx7fGP2LsHhlJe7ejDq4D0YYQaEqPAmdVW4l3SI0StQ"; // Demo123!

const SEED_USERS = [
  { id: "dev-user-001", username: "flandre", email: "flandre@travelsync.com", fullName: "Flandre Scarlet", role: "admin", picture: "/images.jpg" },
  { id: "m_marcus", username: "marcus", email: "marcus@travelsync.com", fullName: "Marcus Vance", role: "user", picture: null },
  { id: "m_elena", username: "elena", email: "elena@travelsync.com", fullName: "Elena Rostova", role: "user", picture: null },
  { id: "m_jordan", username: "jordan", email: "jordan@travelsync.com", fullName: "Jordan Lee", role: "user", picture: null },
];

let initialized: Promise<void> | null = null;

export function ensureAccountSchema(db: D1Database): Promise<void> {
  if (!initialized) initialized = db.batch(ACCOUNT_SCHEMA.map((statement) => db.prepare(statement))).then(async () => {
    try { await db.prepare("ALTER TABLE users ADD COLUMN username TEXT").run(); } catch { /* Existing databases already have the column. */ }
    try { await db.prepare("ALTER TABLE users ADD COLUMN ic_hash TEXT").run(); } catch { /* Existing databases already have the column. */ }
    try { await db.prepare("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'").run(); } catch { /* Existing databases already have the column. */ }

    // Seed or update default test accounts
    const now = new Date().toISOString();
    for (const u of SEED_USERS) {
      try {
        await db.prepare(
          `INSERT INTO users (id, username, email, password_hash, full_name, profile_picture, is_verified, is_active, failed_attempts, is_locked, lock_until, created_at, role)
           VALUES (?, ?, ?, ?, ?, ?, 1, 1, 0, 0, NULL, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             username = excluded.username,
             email = excluded.email,
             password_hash = excluded.password_hash,
             full_name = excluded.full_name,
             is_verified = 1,
             is_active = 1,
             failed_attempts = 0,
             is_locked = 0,
             lock_until = NULL,
             role = excluded.role`
        ).bind(u.id, u.username, u.email, DEFAULT_PASSWORD_HASH, u.fullName, u.picture, now, u.role).run();
      } catch {
        /* Ignore error */
      }
    }
  });
  return initialized.catch((error) => {
    initialized = null;
    throw error;
  });
}
