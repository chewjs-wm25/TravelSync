export class AuditRepository {
  constructor(private readonly db: D1Database) {}

  async write(userId: string | null, action: string, ipAddress: string | null, details: string): Promise<void> {
    await this.db.prepare("INSERT INTO audit_logs (id, user_id, action, ip_address, details, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, action, ipAddress, details, new Date().toISOString()).run();
  }
}
