import { getDB } from "./db";
import { ensureTripExists } from "./TripRepo";

export interface TripLiker {
  id: string;
  name: string;
  avatar: string;
}

export interface TripLikeData {
  count: number;
  likedByMe: boolean;
  likers: TripLiker[];
}

export async function getLikes(tripId: string, currentUserId?: string): Promise<TripLikeData> {
  const db = await getDB();
  const res = await db
    .prepare(
      `SELECT tl.user_id as id,
              COALESCE(u.full_name, u.username, 'A Traveler') as name,
              COALESCE(u.profile_picture, '') as avatar
       FROM trip_likes tl
       LEFT JOIN users u ON u.id = tl.user_id
       WHERE tl.trip_id = ?
       ORDER BY tl.created_at DESC`
    )
    .bind(tripId)
    .all<TripLiker>();

  const likers = (res && Array.isArray(res.results) ? res.results : []) as TripLiker[];
  const likedByMe = currentUserId ? likers.some((l) => l.id === currentUserId) : false;

  return {
    count: likers.length,
    likedByMe,
    likers,
  };
}

export async function toggleLike(tripId: string, userId: string): Promise<{ liked: boolean; count: number; likers: TripLiker[] }> {
  const db = await getDB();
  await ensureTripExists(tripId, userId);

  const existing = await db
    .prepare("SELECT id FROM trip_likes WHERE trip_id = ? AND user_id = ? LIMIT 1")
    .bind(tripId, userId)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare("DELETE FROM trip_likes WHERE trip_id = ? AND user_id = ?")
      .bind(tripId, userId)
      .run();
  } else {
    const id = crypto.randomUUID();
    await db
      .prepare("INSERT OR IGNORE INTO trip_likes (id, trip_id, user_id) VALUES (?, ?, ?)")
      .bind(id, tripId, userId)
      .run();
  }

  const updated = await getLikes(tripId, userId);
  return {
    liked: updated.likedByMe,
    count: updated.count,
    likers: updated.likers,
  };
}

export async function getBatchLikeCounts(tripIds: string[]): Promise<Record<string, number>> {
  if (tripIds.length === 0) return {};
  const db = await getDB();
  const placeholders = tripIds.map(() => "?").join(",");
  const res = await db
    .prepare(
      `SELECT trip_id, COUNT(*) as cnt
       FROM trip_likes
       WHERE trip_id IN (${placeholders})
       GROUP BY trip_id`
    )
    .bind(...tripIds)
    .all<{ trip_id: string; cnt: number }>();

  const results: Record<string, number> = {};
  tripIds.forEach((id) => {
    results[id] = 0;
  });
  if (res && Array.isArray(res.results)) {
    res.results.forEach((r) => {
      results[r.trip_id] = r.cnt;
    });
  }
  return results;
}
