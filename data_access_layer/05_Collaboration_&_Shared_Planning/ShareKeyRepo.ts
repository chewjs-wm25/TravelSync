import { getDB } from "./db";

export interface ShareKeyRow {
  share_key: string;
  trip_id: string;
  trip_name: string;
  plan_json: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  use_count: number;
}

/**
 * 插入或更新行程分享码
 */
export async function insertShareKey(entry: {
  share_key: string;
  trip_id: string;
  trip_name: string;
  plan_json: string;
  created_by: string;
  expires_at?: string | null;
}): Promise<ShareKeyRow> {
  const db = await getDB();
  const expiresAt = entry.expires_at ?? null;

  await db
    .prepare(
      `INSERT OR REPLACE INTO plan_share_keys
        (share_key, trip_id, trip_name, plan_json, created_by, created_at, expires_at, use_count)
       VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?, 0)`
    )
    .bind(
      entry.share_key,
      entry.trip_id,
      entry.trip_name,
      entry.plan_json,
      entry.created_by,
      expiresAt
    )
    .run();

  const saved = await findByKey(entry.share_key);
  if (!saved) throw new Error("Failed to persist share key");
  return saved;
}

/**
 * 根据 Share Key 查询（不区分大小写）
 */
export async function findByKey(shareKey: string): Promise<ShareKeyRow | null> {
  const db = await getDB();
  const normalized = shareKey.trim();
  return db
    .prepare("SELECT * FROM plan_share_keys WHERE UPPER(share_key) = UPPER(?) LIMIT 1")
    .bind(normalized)
    .first<ShareKeyRow>();
}

/**
 * 查询指定 Trip 现有的最新有效分享码（按创建时间降序）
 */
export async function findLatestByTrip(
  tripId: string,
  createdBy?: string
): Promise<ShareKeyRow | null> {
  const db = await getDB();
  if (createdBy) {
    return db
      .prepare(
        `SELECT * FROM plan_share_keys
         WHERE trip_id = ? AND created_by = ?
         ORDER BY created_at DESC LIMIT 1`
      )
      .bind(tripId, createdBy)
      .first<ShareKeyRow>();
  }

  return db
    .prepare(
      `SELECT * FROM plan_share_keys
       WHERE trip_id = ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(tripId)
    .first<ShareKeyRow>();
}

/**
 * 累加该分享码的导入使用次数
 */
export async function incrementUsage(shareKey: string): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      "UPDATE plan_share_keys SET use_count = use_count + 1 WHERE UPPER(share_key) = UPPER(?)"
    )
    .bind(shareKey.trim())
    .run();
}
