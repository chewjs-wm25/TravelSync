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
  receiver_user_id?: string | null;
}): Promise<InviteRow> {
  const db = await getDB();
  const invitation_id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO Collaboration_Invitations
        (invitation_id, Token, receiver_email, role, status, expires_at, trip_id, sender_id, receiver_user_id)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
    )
    .bind(
      invitation_id,
      i.Token,
      i.receiver_email,
      i.role,
      i.expires_at,
      i.trip_id,
      i.sender_id,
      i.receiver_user_id ?? null
    )
    .run();
  return findById(invitation_id) as Promise<InviteRow>;
}

export interface ReceivedInviteWithDetails {
  invitation_id: string;
  Token: string;
  receiver_email: string;
  receiver_user_id: string | null;
  role: InviteRoleDB;
  status: InviteStatusDB;
  expires_at: string;
  sent_at: string;
  trip_id: string;
  trip_name: string;
  sender_id: string;
  sender_name: string;
}

/** 查找指定用户收到的所有有效 pending 邀请（可凭真实 userId 或 email 匹配） */
export async function findPendingForUser(
  userId: string,
  email?: string
): Promise<ReceivedInviteWithDetails[]> {
  const db = await getDB();
  const lowerEmail = email ? email.toLowerCase() : "";
  const res = await db
    .prepare(
      `SELECT i.*, 
              COALESCE(t.TripName, m2.trip_name, 'Shared Trip') AS trip_name,
              COALESCE(u.full_name, u.username, 'A Member') AS sender_name
       FROM Collaboration_Invitations i
       LEFT JOIN Trip t ON t.TripID = i.trip_id
       LEFT JOIN trips m2 ON m2.trip_id = i.trip_id
       LEFT JOIN users u ON u.id = i.sender_id
       WHERE (i.receiver_user_id = ? OR (lower(i.receiver_email) = lower(?) AND ? != ''))
         AND i.status = 'pending'
         AND datetime(i.expires_at) > datetime('now')
       ORDER BY i.sent_at DESC`
    )
    .bind(userId, lowerEmail, lowerEmail)
    .all<ReceivedInviteWithDetails>();
  return (res?.results ?? []) as ReceivedInviteWithDetails[];
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