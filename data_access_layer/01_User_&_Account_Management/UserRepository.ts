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
    // 1. Module 01 自身关联清理
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

    // 2. 若用户拥有协作行程（Trip.UserID），需先清理该行程下级联的日程项与聊天，再删除 Trip
    try {
      const trips = await this.db
        .prepare("SELECT TripID FROM Trip WHERE UserID = ?")
        .bind(id)
        .all<{ TripID: string }>();
      const tripIds = (trips?.results ?? []).map((t) => t.TripID);
      for (const tid of tripIds) {
        try {
          await this.db.prepare("DELETE FROM chats WHERE trip_id = ?").bind(tid).run();
          await this.db.prepare("DELETE FROM activity_logs WHERE trip_id = ?").bind(tid).run();
          await this.db.prepare("DELETE FROM Collaboration_Invitations WHERE trip_id = ?").bind(tid).run();
          await this.db.prepare("DELETE FROM Collaborators WHERE trip_id = ?").bind(tid).run();
          await this.db.prepare("DELETE FROM trip_likes WHERE trip_id = ?").bind(tid).run();
          await this.db.prepare("DELETE FROM plan_share_keys WHERE trip_id = ?").bind(tid).run();
          const itins = await this.db
            .prepare("SELECT ItineraryID FROM Itinerary WHERE TripID = ?")
            .bind(tid)
            .all<{ ItineraryID: string }>();
          for (const it of itins?.results ?? []) {
            await this.db.prepare("DELETE FROM Itinerary_Item WHERE ItineraryID = ?").bind(it.ItineraryID).run();
          }
          await this.db.prepare("DELETE FROM Itinerary WHERE TripID = ?").bind(tid).run();
          await this.db.prepare("DELETE FROM Trip WHERE TripID = ?").bind(tid).run();
        } catch {}
      }
    } catch {}

    // 3. 清理用户在各模块作为参与者/作者的残留外键引用
    const cleanupStatements: { sql: string; binds: (string | number)[] }[] = [
      // 聊天与动态日志
      { sql: "DELETE FROM chats WHERE user_id = ?", binds: [id] },
      { sql: "DELETE FROM activity_logs WHERE user_id = ?", binds: [id] },
      // 协作邀请（作为发件人或收件人）
      { sql: "DELETE FROM Collaboration_Invitations WHERE sender_id = ? OR receiver_user_id = ?", binds: [id, id] },
      { sql: "DELETE FROM collaboration_invitations WHERE sender_id = ? OR receiver_user_id = ?", binds: [id, id] },
      // 协作者记录（若曾邀请他人，将他人的 invited_by 置 NULL；并删除自己的协作者记录）
      { sql: "UPDATE Collaborators SET invited_by = NULL WHERE invited_by = ?", binds: [id] },
      { sql: "UPDATE collaborators SET invited_by = NULL WHERE invited_by = ?", binds: [id] },
      { sql: "DELETE FROM Collaborators WHERE user_id = ?", binds: [id] },
      { sql: "DELETE FROM collaborators WHERE user_id = ?", binds: [id] },
      { sql: "DELETE FROM trip_collaborators WHERE user_id = ?", binds: [id] },
      // 点赞与分享
      { sql: "DELETE FROM trip_likes WHERE user_id = ?", binds: [id] },
      { sql: "DELETE FROM plan_share_keys WHERE created_by = ?", binds: [id] },
      // 模块 02/03 行程与收藏
      { sql: "DELETE FROM Trip WHERE UserID = ?", binds: [id] },
      { sql: "DELETE FROM trips WHERE user_id = ?", binds: [id] },
      { sql: "DELETE FROM favorites WHERE user_id = ?", binds: [id] },
      { sql: "DELETE FROM favorite_items WHERE user_id = ?", binds: [id] },
    ];

    for (const stmt of cleanupStatements) {
      try {
        await this.db.prepare(stmt.sql).bind(...stmt.binds).run();
      } catch {}
    }

    // 4. 所有子表外键引用清理完毕后，安全删除 users 主表记录
    await this.db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  }

  async deleteByIdentifier(identifier: string): Promise<void> {
    const user = await this.findByIdentifier(identifier);
    if (user) {
      await this.delete(user.id);
    } else {
      const normalized = identifier.trim().toLowerCase();
      const raw = identifier.trim();
      await this.db
        .prepare("DELETE FROM users WHERE LOWER(email) = ?1 OR LOWER(username) = ?1 OR phone = ?2")
        .bind(normalized, raw)
        .run();
    }
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
