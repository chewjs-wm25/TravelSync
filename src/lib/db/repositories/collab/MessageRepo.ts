import { getDB } from "./db";

export interface ChatRow {
  id: number;
  trip_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export async function findByTrip(tripId: string): Promise<(ChatRow & { username: string; profile_picture: string | null })[]> {
  const db = await getDB();
  const res = await db
    .prepare(
      `SELECT m.id, m.trip_id, m.user_id, m.text, m.created_at, a.username, a.profile_picture
       FROM chats m
       JOIN Account a ON a.AccountID = m.user_id
       WHERE m.trip_id = ?
       ORDER BY m.id ASC`
    )
    .bind(tripId)
    .all<ChatRow & { username: string; profile_picture: string | null }>();
  return res.results;
}

export async function insertChat(c: {
  trip_id: string;
  user_id: string;
  text: string;
}): Promise<void> {
  const db = await getDB();
  await db
    .prepare("INSERT INTO chats (trip_id, user_id, text) VALUES (?, ?, ?)")
    .bind(c.trip_id, c.user_id, c.text)
    .run();
}