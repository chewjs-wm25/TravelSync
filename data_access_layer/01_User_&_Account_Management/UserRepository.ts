import type { UserRecord, UserSettingsRecord } from "./types";

export class UserRepository {
  constructor(private readonly db: D1Database) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    return (await this.db.prepare("SELECT * FROM users WHERE email = ?1 LIMIT 1").bind(email.toLowerCase()).first<UserRecord>()) ?? null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    return (await this.db.prepare("SELECT * FROM users WHERE username = ?1 LIMIT 1").bind(username.trim().toLowerCase()).first<UserRecord>()) ?? null;
  }

  async findByIdentifier(identifier: string): Promise<UserRecord | null> {
    return (await this.db.prepare("SELECT * FROM users WHERE username = ?1 OR email = ?1 OR phone = ?1 LIMIT 1").bind(identifier.trim().toLowerCase()).first<UserRecord>()) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return (await this.db.prepare("SELECT * FROM users WHERE id = ?1 LIMIT 1").bind(id).first<UserRecord>()) ?? null;
  }

  async create(user: UserRecord): Promise<void> {
    const storedEmail = user.email ?? `${user.username}@local.invalid`;
    await this.db.prepare("INSERT INTO users (id, username, email, password_hash, full_name, phone, ic_hash, is_verified, is_active, is_locked, failed_attempts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?)").bind(user.id, user.username, storedEmail, user.password_hash, user.full_name, user.phone, user.ic_hash, user.is_verified, user.created_at).run();
    await this.db.prepare("INSERT INTO user_settings (user_id, notifications_enabled, language, theme, privacy_level) VALUES (?, 1, 'en', 'light', 'private')").bind(user.id).run();
  }

  async updateProfile(id: string, fullName: string, phone: string | null, profilePicture: string | null): Promise<void> {
    await this.db.prepare("UPDATE users SET full_name = ?, phone = ?, profile_picture = ? WHERE id = ?").bind(fullName, phone, profilePicture, id).run();
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.db.prepare("UPDATE users SET password_hash = ?, failed_attempts = 0, is_locked = 0, lock_until = NULL WHERE id = ?").bind(passwordHash, id).run();
  }

  async verify(id: string): Promise<void> {
    await this.db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").bind(id).run();
  }

  async updateLoginFailure(id: string, attempts: number, lockUntil: string | null): Promise<void> {
    await this.db.prepare("UPDATE users SET failed_attempts = ?, is_locked = ?, lock_until = ? WHERE id = ?").bind(attempts, lockUntil ? 1 : 0, lockUntil, id).run();
  }

  async markLoginSuccess(id: string): Promise<void> {
    await this.db.prepare("UPDATE users SET failed_attempts = 0, is_locked = 0, lock_until = NULL, last_login = ? WHERE id = ?").bind(new Date().toISOString(), id).run();
  }

  async list(): Promise<UserRecord[]> {
    const result = await this.db.prepare("SELECT * FROM users ORDER BY created_at DESC").all<UserRecord>();
    return result.results;
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await this.db.prepare("UPDATE users SET is_active = ? WHERE id = ?").bind(active ? 1 : 0, id).run();
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  }

  async deleteByIdentifier(identifier: string): Promise<void> {
    await this.db.prepare("DELETE FROM users WHERE email = ? OR phone = ?").bind(identifier.trim().toLowerCase(), identifier.trim()).run();
  }

  async settings(id: string): Promise<UserSettingsRecord | null> {
    return (await this.db.prepare("SELECT * FROM user_settings WHERE user_id = ?").bind(id).first<UserSettingsRecord>()) ?? null;
  }

  async updateSettings(id: string, settings: Omit<UserSettingsRecord, "user_id">): Promise<void> {
    await this.db.prepare("UPDATE user_settings SET notifications_enabled = ?, language = ?, theme = ?, privacy_level = ? WHERE user_id = ?").bind(settings.notifications_enabled, settings.language, settings.theme, settings.privacy_level, id).run();
  }
}
