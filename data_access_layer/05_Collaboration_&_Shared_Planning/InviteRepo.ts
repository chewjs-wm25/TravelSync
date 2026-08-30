import { getDB } from "./db";

export type InviteStatusDB = "pending" | "accepted" | "rejected" | "expired";
export type InviteRoleDB = "Editor" | "Viewer";

export interface InviteRow {
  invitation_id: string;
  Token: string;
  receiver_email: string;
  role: InviteRoleDB;
  status: InviteStatusDB;
  expires_at: string;
  sent_at: string;
  trip_id: string;
  sender_id: string;
  receiver_user_id: string | null;
}

export interface InviteWithSender extends InviteRow {
  sender_name: string;
}

/** 行程所有邀请（join users 表取发送者姓名） */
export async function findByTrip(tripId: string): Promise<InviteWithSender[]> {
  const db = await getDB();
  const res = await db
    .prepare(
      `SELECT i.*, COALESCE(u.full_name, u.username, 'A Member') AS sender_name
       FROM Collaboration_Invitations i
       LEFT JOIN users u ON u.id = i.sender_id
       WHERE i.trip_id = ?
       ORDER BY i.sent_at DESC`
    )
    .bind(tripId)
    .all();
  return (res && Array.isArray(res.results) ? (res.results as unknown as InviteWithSender[]) : []) as InviteWithSender[];
}

export async function findById(id: string): Promise<InviteRow | null> {
  const db = await getDB();
  return db
    .prepare("SELECT * FROM Collaboration_Invitations WHERE invitation_id = ? LIMIT 1")
    .bind(id)
    .first<InviteRow>();
}

export async function findByToken(token: string): Promise<InviteWithSender | null> {
  const db = await getDB();
  return db
    .prepare(
      `SELECT i.*, COALESCE(u.full_name, u.username, 'A Member') AS sender_name
       FROM Collaboration_Invitations i
       LEFT JOIN users u ON u.id = i.sender_id
       WHERE i.Token = ? LIMIT 1`
    )
    .bind(token)
    .first<InviteWithSender>();
}

export async function insertInvite(i: {
  Token: string;
  receiver_email: string;
  role: InviteRoleDB;
  expires_at: string;
  trip_id: string;
  sender_id: string;
}): Promise<InviteRow> {
  const db = await getDB();
  const invitation_id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO Collaboration_Invitations
        (invitation_id, Token, receiver_email, role, status, expires_at, trip_id, sender_id)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`
    )
    .bind(
      invitation_id,
      i.Token,
      i.receiver_email,
      i.role,
      i.expires_at,
      i.trip_id,
      i.sender_id
    )
    .run();
  return findById(invitation_id) as Promise<InviteRow>;
}

export async function updateStatus(id: string, status: InviteStatusDB): Promise<void> {
  const db = await getDB();
  await db.prepare("UPDATE Collaboration_Invitations SET status = ? WHERE invitation_id = ?").bind(status, id).run();
}

export async function updateReceiverUserId(id: string, userId: string): Promise<void> {
  const db = await getDB();
  await db.prepare("UPDATE Collaboration_Invitations SET receiver_user_id = ? WHERE invitation_id = ?").bind(userId, id).run();
}

/** 把所有已过期的 pending 邀请标为 expired */
export async function expirePending(nowIso: string): Promise<InviteRow[]> {
  const db = await getDB();
  const updated = await db
    .prepare(
      `UPDATE Collaboration_Invitations
       SET status = 'expired'
       WHERE status = 'pending' AND expires_at <= ?
       RETURNING *`
    )
    .bind(nowIso)
    .all<InviteRow>();
  return (updated && Array.isArray(updated.results) ? (updated.results as InviteRow[]) : []) as InviteRow[];
}

export async function deleteInvite(id: string): Promise<void> {
  const db = await getDB();
  await db.prepare("DELETE FROM Collaboration_Invitations WHERE invitation_id = ?").bind(id).run();
}