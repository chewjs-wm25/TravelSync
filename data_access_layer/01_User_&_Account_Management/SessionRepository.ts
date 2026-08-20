import type { SessionRecord } from "./types";

export class SessionRepository {
  constructor(private readonly db: D1Database) {}

  async create(session: SessionRecord): Promise<void> {
    await this.db.prepare("INSERT INTO user_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)").bind(session.id, session.user_id, session.token, session.expires_at).run();
  }

  async findValid(token: string): Promise<SessionRecord | null> {
    return (await this.db.prepare("SELECT * FROM user_sessions WHERE token = ? AND expires_at > ? LIMIT 1").bind(token, new Date().toISOString()).first<SessionRecord>()) ?? null;
  }

  async delete(token: string): Promise<void> {
    await this.db.prepare("DELETE FROM user_sessions WHERE token = ?").bind(token).run();
  }
}
