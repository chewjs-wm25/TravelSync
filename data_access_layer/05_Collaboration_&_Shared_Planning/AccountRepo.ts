import { getDB } from "./db";

/**
 * 统一使用模块01的 users 表
 * 表结构：id, username, email, password_hash, full_name, phone, ic_hash,
 *         profile_picture, is_verified, is_active, is_locked, failed_attempts,
 *         lock_until, last_login, created_at, role
 */
export interface AccountRow {
  id: string;
  username: string;
  email: string;
  password_hash: string | null;
  full_name: string | null;
  phone: string | null;
  profile_picture: string | null;
  is_verified: number;
  is_active: number;
  created_at: string;
  role: string;
}

/** 按 ID 查单个账号 */
export async function findAccountById(id: string): Promise<AccountRow | null> {
  const db = await getDB();
  return db
    .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
    .bind(id)
    .first<AccountRow>();
}

/** 按邮箱查单个账号 */
export async function findAccountByEmail(email: string): Promise<AccountRow | null> {
  const db = await getDB();
  return db
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1")
    .bind(email)
    .first<AccountRow>();
}

/** 创建账号（简化版，用于邀请接受时自动创建） */
export async function insertAccount(a: {
  username: string;
  email: string;
  password_hash?: string | null;
  profile_picture?: string | null;
}): Promise<AccountRow> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO users (id, username, email, password_hash, full_name, profile_picture, is_verified, is_active, created_at, role)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, 'user')`
    )
    .bind(id, a.username, a.email, a.password_hash ?? null, a.username, a.profile_picture ?? null, created_at)
    .run();
  return findAccountById(id) as Promise<AccountRow>;
}