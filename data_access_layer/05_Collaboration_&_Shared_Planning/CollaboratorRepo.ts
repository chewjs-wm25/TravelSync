import { getDB } from "./db";

export type CollabRoleDB = "Owner" | "Editor" | "Viewer";

export interface CollaboratorRow {
  collaborator_id: string;
  role: CollabRoleDB;
  status: string;
  joined_at: string | null;
  trip_id: string;
  user_id: string;
  invited_by: string | null;
}

export interface CollaboratorWithAccount extends CollaboratorRow {
  username: string;
  email: string;
  profile_picture: string | null;
}

/** 行程所有协作者（join Account 取展示字段） */
export async function findByTrip(tripId: string): Promise<CollaboratorWithAccount[]> {
  const db = await getDB();
  const res = await db
    .prepare(
      `SELECT c.*, a.username, a.email, a.profile_picture
       FROM Collaborators c
       JOIN Account a ON a.AccountID = c.user_id
       WHERE c.trip_id = ? AND c.status = 'active'
       ORDER BY c.joined_at ASC`
    )
    .bind(tripId)
    .all<CollaboratorWithAccount>();
  return res.results;
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