import { getDB } from "./db";

export interface ActivityRow {
  id: number;
  trip_id: string;
  user_id: string;
  action: string;
  created_at: string;
}

export interface ActivityWithUser extends ActivityRow {
  username: string;
}

export async function findByTrip(tripId: string): Promise<ActivityWithUser[]> {
  const db = await getDB();
  const res = await db
    .prepare(
      `SELECT l.id, l.trip_id, l.user_id, l.action, l.created_at, u.username
       FROM activity_logs l
       JOIN users u ON u.id = l.user_id
       WHERE l.trip_id = ?
       ORDER BY l.id DESC
       LIMIT 50`
    )
    .bind(tripId)
    .all<ActivityWithUser>();
  return (res && Array.isArray(res.results) ? res.results : []) as ActivityWithUser[];
}

export async function insertActivity(a: {
  trip_id: string;
  user_id: string;
  action: string;
}): Promise<void> {
  const db = await getDB();
  await db
    .prepare("INSERT INTO activity_logs (trip_id, user_id, action) VALUES (?, ?, ?)")
    .bind(a.trip_id, a.user_id, a.action)
    .run();
}