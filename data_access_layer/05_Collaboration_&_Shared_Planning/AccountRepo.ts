import { getDB } from "./db";

export interface AccountRow {
  AccountID: string;
  username: string;
  email: string;
  password_hash: string | null;
  google_id: number | null;
  phone_number: string | null;
  profile_picture: string | null;
  join_date: string;
  status: string;
  language: string;
  theme: string;
}

/** 按 ID 查单个账号 */
export async function findAccountById(id: string): Promise<AccountRow | null> {
  const db = await getDB();
  return db
    .prepare("SELECT * FROM Account WHERE AccountID = ? LIMIT 1")
    .bind(id)
    .first<AccountRow>();
}

/** 按邮箱查单个账号 */
export async function findAccountByEmail(email: string): Promise<AccountRow | null> {
  const db = await getDB();
  return db
    .prepare("SELECT * FROM Account WHERE lower(email) = lower(?) LIMIT 1")
    .bind(email)
    .first<AccountRow>();
}

/** 创建账号，返回新 record */
export async function insertAccount(a: {
  username: string;
  email: string;
  password_hash?: string | null;
  profile_picture?: string | null;
}): Promise<AccountRow> {
  const db = await getDB();
  const AccountID = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO Account (AccountID, username, email, password_hash, profile_picture)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(AccountID, a.username, a.email, a.password_hash ?? null, a.profile_picture ?? null)
    .run();
  return findAccountById(AccountID) as Promise<AccountRow>;
}