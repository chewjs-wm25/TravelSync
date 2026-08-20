export interface PasswordResetTokenRecord {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
}

export class PasswordResetRepository {
  constructor(private readonly db: D1Database) {}

  async create(record: PasswordResetTokenRecord): Promise<void> {
    await this.db.prepare("INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)").bind(record.id, record.user_id, record.token, record.expires_at).run();
  }

  async consume(token: string): Promise<PasswordResetTokenRecord | null> {
    const record = (await this.db.prepare("SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > ? LIMIT 1").bind(token, new Date().toISOString()).first<PasswordResetTokenRecord>()) ?? null;
    if (record) await this.db.prepare("DELETE FROM password_reset_tokens WHERE id = ?").bind(record.id).run();
    return record;
  }
}
