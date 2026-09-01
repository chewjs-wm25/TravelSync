import type { UserRecord, UserSettingsRecord } from "./types";

export class UserRepository {
  constructor(private readonly db: D1Database) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    if (!email) return null;
    return (
      (await this.db
        .prepare("SELECT * FROM users WHERE LOWER(email) = ?1 LIMIT 1")
        .bind(email.trim().toLowerCase())
        .first<UserRecord>()) ?? null
    );
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    if (!username) return null;
    return (
      (await this.db
        .prepare("SELECT * FROM users WHERE LOWER(username) = ?1 LIMIT 1")
        .bind(username.trim().toLowerCase())
        .first<UserRecord>()) ?? null
    );
  }

  async findByIdentifier(identifier: string): Promise<UserRecord | null> {
    if (!identifier) return null;
    const normalized = identifier.trim().toLowerCase();
    const raw = identifier.trim();
    return (
      (await this.db
        .prepare(
          "SELECT * FROM users WHERE LOWER(username) = ?1 OR LOWER(email) = ?1 OR phone = ?2 LIMIT 1"
        )
        .bind(normalized, raw)
        .first<UserRecord>()) ?? null
    );
  }

  async findById(id: string): Promise<UserRecord | null> {
    if (!id) return null;
    return (
      (await this.db
        .prepare("SELECT * FROM users WHERE id = ?1 LIMIT 1")
        .bind(id)
        .first<UserRecord>()) ?? null
    );
  }

  async create(user: UserRecord): Promise<void> {
    const storedEmail = user.email ? user.email.trim().toLowerCase() : `${user.username}@local.invalid`;
    const hasPassword = user.has_password ?? 1;
    await this.db
      .prepare(
        `INSERT INTO users (id, username, email, password_hash, full_name, phone, ic_hash, profile_picture, is_verified, is_active, is_locked, failed_attempts, lock_until, last_login, created_at, role, has_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, NULL, NULL, ?, ?, ?)`
      )
      .bind(
        user.id,
        user.username.trim().toLowerCase(),
        storedEmail,
        user.password_hash,
        user.full_name.trim(),
        user.phone ? user.phone.trim() : null,
        user.ic_hash ?? null,
        user.profile_picture ?? null,
        user.is_verified ?? 1,
        user.created_at,
        user.role ?? "user",
        hasPassword
      )
      .run();

    try {
      await this.db
        .prepare(
          "INSERT OR IGNORE INTO user_settings (user_id, notifications_enabled, language, theme, privacy_level) VALUES (?, 1, 'en', 'light', 'private')"
        )
        .bind(user.id)
        .run();
    } catch {
      // ignore
    }
  }

  async updateProfile(
    id: string,
    fullName: string,
    phone: string | null,
    profilePicture: string | null
  ): Promise<void> {
    await this.db
      .prepare(
        "UPDATE users SET full_name = ?, phone = ?, profile_picture = ? WHERE id = ?"
      )
      .bind(fullName.trim(), phone ? phone.trim() : null, profilePicture, id)
      .run();
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE users SET password_hash = ?, has_password = 1, failed_attempts = 0, is_locked = 0, lock_until = NULL WHERE id = ?"
      )
      .bind(passwordHash, id)
      .run();
  }

  async verify(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE users SET is_verified = 1 WHERE id = ?")
      .bind(id)
      .run();
  }

  async updateLoginFailure(
    id: string,
    attempts: number,
    lockUntil: string | null
  ): Promise<void> {
    await this.db
      .prepare(
        "UPDATE users SET failed_attempts = ?, is_locked = ?, lock_until = ? WHERE id = ?"
      )
      .bind(attempts, lockUntil ? 1 : 0, lockUntil, id)
      .run();
  }

  async markLoginSuccess(id: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE users SET failed_attempts = 0, is_locked = 0, lock_until = NULL, last_login = ? WHERE id = ?"
      )
      .bind(new Date().toISOString(), id)
      .run();
  }

  async list(): Promise<UserRecord[]> {
    const result = await this.db
      .prepare("SELECT * FROM users ORDER BY created_at DESC")
      .all<UserRecord>();
    return result.results ?? [];
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await this.db
      .prepare("UPDATE users SET is_active = ? WHERE id = ?")
      .bind(active ? 1 : 0, id)
      .run();
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(id).run();
    } catch {}
    try {
      await this.db.prepare("DELETE FROM user_settings WHERE user_id = ?").bind(id).run();
    } catch {}
    try {
      await this.db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").bind(id).run();
    } catch {}
    try {
      await this.db.prepare("UPDATE audit_logs SET user_id = NULL WHERE user_id = ?").bind(id).run();
    } catch {}
    try {
      await this.db.prepare("DELETE FROM collaborators WHERE user_id = ?").bind(id).run();
    } catch {}
    try {
      await this.db.prepare("DELETE FROM trip_collaborators WHERE user_id = ?").bind(id).run();
    } catch {}
    try {
      await this.db.prepare("DELETE FROM favorites WHERE user_id = ?").bind(id).run();
    } catch {}
    await this.db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  }

  async deleteByIdentifier(identifier: string): Promise<void> {
    const normalized = identifier.trim().toLowerCase();
    const raw = identifier.trim();
    await this.db
      .prepare("DELETE FROM users WHERE LOWER(email) = ?1 OR LOWER(username) = ?1 OR phone = ?2")
      .bind(normalized, raw)
      .run();
  }

  async settings(id: string): Promise<UserSettingsRecord | null> {
    let s = await this.db
      .prepare("SELECT * FROM user_settings WHERE user_id = ?")
      .bind(id)
      .first<UserSettingsRecord>();
    if (!s) {
      try {
        await this.db
          .prepare(
            "INSERT OR IGNORE INTO user_settings (user_id, notifications_enabled, language, theme, privacy_level) VALUES (?, 1, 'en', 'light', 'private')"
          )
          .bind(id)
          .run();
        s = await this.db
          .prepare("SELECT * FROM user_settings WHERE user_id = ?")
          .bind(id)
          .first<UserSettingsRecord>();
      } catch {
        // ignore
      }
    }
    return s ?? null;
  }

  async updateSettings(
    id: string,
    settings: Omit<UserSettingsRecord, "user_id">
  ): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO user_settings (user_id, notifications_enabled, language, theme, privacy_level) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(user_id) DO UPDATE SET notifications_enabled = ?2, language = ?3, theme = ?4, privacy_level = ?5"
      )
      .bind(
        id,
        settings.notifications_enabled ? 1 : 0,
        settings.language || "en",
        settings.theme || "light",
        settings.privacy_level || "private"
      )
      .run();
  }
}
