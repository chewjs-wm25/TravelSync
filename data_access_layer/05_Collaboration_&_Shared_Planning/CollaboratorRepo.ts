import { getDB } from "./db";

export type CollabRoleDB = "Owner" | "Editor" | "Viewer";

export interface CollaboratorRow {
  collaborator_id: string;
  role: CollabRoleDB;
  status: string;
  joined_at: string | null;
  last_seen: string | null;
  trip_id: string;
  user_id: string;
  invited_by: string | null;
}

export interface CollaboratorWithAccount extends CollaboratorRow {
  username: string;
  email: string;
  profile_picture: string | null;
}

/** 行程所有协作者（join users 表取展示字段） */
export async function findByTrip(tripId: string): Promise<CollaboratorWithAccount[]> {
  const db = await getDB();
  const res = await db
    .prepare(
      `SELECT c.*, u.username, u.email, u.profile_picture
       FROM Collaborators c
       JOIN users u ON u.id = c.user_id
       WHERE c.trip_id = ? AND c.status = 'active'
       ORDER BY c.joined_at ASC`
    )
    .bind(tripId)
    .all<CollaboratorWithAccount>();
  return (res && Array.isArray(res.results) ? res.results : []) as CollaboratorWithAccount[];
}

/** 新增协作者（幂等：已存在则忽略） */
export async function insertCollaborator(c: {
  role: CollabRoleDB;
  trip_id: string;
  user_id: string;
  invited_by?: string | null;
}): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      `INSERT OR IGNORE INTO Collaborators (role, status, trip_id, user_id, invited_by)
       VALUES (?, 'active', ?, ?, ?)`
    )
    .bind(c.role, c.trip_id, c.user_id, c.invited_by ?? null)
    .run();
}

/** 更新角色 */
export async function updateRole(
  tripId: string,
  userId: string,
  role: CollabRoleDB
): Promise<void> {
  const db = await getDB();
  await db
    .prepare("UPDATE Collaborators SET role = ? WHERE trip_id = ? AND user_id = ?")
    .bind(role, tripId, userId)
    .run();
}

/** 删除协作者（含退出） */
export async function deleteCollaborator(tripId: string, userId: string): Promise<void> {
  const db = await getDB();
  await db
    .prepare("DELETE FROM Collaborators WHERE trip_id = ? AND user_id = ?")
    .bind(tripId, userId)
    .run();
}

/** 更新最后在线时间（每次 API 调用时触发） */
export async function updateLastSeen(tripId: string, userId: string): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE Collaborators SET last_seen = ? WHERE trip_id = ? AND user_id = ?")
    .bind(now, tripId, userId)
    .run();
}

/** 查询某用户参与的所有行程 ID（joined + owned via collaboration） */
export async function findTripIdsByUserId(userId: string): Promise<string[]> {
  const db = await getDB();
  const res = await db
    .prepare("SELECT DISTINCT trip_id FROM Collaborators WHERE user_id = ? AND status = 'active'")
    .bind(userId)
    .all<{ trip_id: string }>();
  return (res.results ?? []).map((r) => r.trip_id);
}

/** 统计行程的协作者数量（含 Owner） */
export async function countByTrip(tripId: string): Promise<number> {
  const db = await getDB();
  const res = await db
    .prepare("SELECT COUNT(*) as cnt FROM Collaborators WHERE trip_id = ? AND status = 'active'")
    .bind(tripId)
    .first<{ cnt: number }>();
  return res?.cnt ?? 0;
}

/** 删除行程的所有非 Owner 协作者（Share→Private 立即踢出） */
export async function deleteNonOwners(tripId: string, ownerId: string): Promise<number> {
  const db = await getDB();
  const res = await db
    .prepare("DELETE FROM Collaborators WHERE trip_id = ? AND user_id != ?")
    .bind(tripId, ownerId)
    .run();
  return res.meta.changes ?? 0;
}

/** 确保 Owner 行存在（Share 开启时） */
export async function ensureOwner(tripId: string, ownerId: string): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      `INSERT OR IGNORE INTO Collaborators (role, status, trip_id, user_id, invited_by) VALUES ('Owner','active',?,?,NULL)`
    )
    .bind(tripId, ownerId)
    .run();
}