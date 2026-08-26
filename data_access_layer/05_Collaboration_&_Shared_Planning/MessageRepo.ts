import { getDB } from "./db";

export interface ChatRow {
  id: number;
  trip_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface ChatWithAccount extends ChatRow {
  username: string;
  profile_picture: string | null;
}

export async function findByTrip(tripId: string): Promise<ChatWithAccount[]> {
  const db = await getDB();
  const res = await db
    .prepare(
      `SELECT m.id, m.trip_id, m.user_id, m.text, m.created_at, u.username, u.profile_picture
       FROM chats m
       JOIN users u ON u.id = m.user_id
       WHERE m.trip_id = ?
       ORDER BY m.id ASC`
    )
    .bind(tripId)
    .all<ChatWithAccount>();
  // Guard against undefined results when the DB binding is not available
  // or the query returns no rows.
  return (res && Array.isArray(res.results) ? res.results : []) as ChatWithAccount[];
}

export async function insertChat(c: {
  trip_id: string;
  user_id: string;
  text: string;
}): Promise<number> {
  const db = await getDB();
  const res = await db
    .prepare("INSERT INTO chats (trip_id, user_id, text) VALUES (?, ?, ?) RETURNING id")
    .bind(c.trip_id, c.user_id, c.text)
    .first<{ id: number }>();
  return res?.id ?? 0;
}