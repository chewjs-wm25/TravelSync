import * as TripLikeRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripLikeRepo";
import { ACTIVE_TRIP_ID, json, error, extractTripId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { resolveDemoUser } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { getDB } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/db";

async function getSessionUser(req: Request): Promise<{ id: string; name: string }> {
  const headerUserId = req.headers.get("x-demo-user-id");
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = /travelsync_session=([^;]+)/.exec(cookieHeader);
  const token = match ? decodeURIComponent(match[1]) : null;

  const db = await getDB();
  if (token) {
    const session = await db
      .prepare(
        `SELECT s.user_id, COALESCE(u.full_name, u.username) as name
         FROM user_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > datetime('now')
         LIMIT 1`
      )
      .bind(token)
      .first<{ user_id: string; name: string }>();

    if (session) {
      return { id: session.user_id, name: session.name };
    }
  }

  if (headerUserId) {
    const user = await db
      .prepare("SELECT id, COALESCE(full_name, username) as name FROM users WHERE id = ? LIMIT 1")
      .bind(headerUserId)
      .first<{ id: string; name: string }>();
    if (user) return user;
    return { id: headerUserId, name: "Collaborator" };
  }

  try {
    const demo = await resolveDemoUser(headerUserId);
    return { id: demo.id, name: demo.full_name || demo.username };
  } catch {
    return { id: "dev-user-001", name: "Traveler" };
  }
}

/**
 * GET /api/collab/likes?tripId=xxx
 * 获取当前行程的点赞统计、自己是否点赞以及点赞者列表
 */
export async function GET(req: Request) {
  try {
    const tripId = extractTripId(req) || ACTIVE_TRIP_ID;
    const user = await getSessionUser(req);
    const likes = await TripLikeRepo.getLikes(tripId, user?.id);
    return json({ success: true, tripId, ...likes });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to fetch likes");
  }
}

/**
 * POST /api/collab/likes
 * Body: { tripId: string }
 * 点赞 / 取消点赞 (Toggle Like)，实时推送事件并写入活动日志
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { tripId?: string };
    const tripId = extractTripId(req, body) || ACTIVE_TRIP_ID;
    const user = await getSessionUser(req);

    const result = await TripLikeRepo.toggleLike(tripId, user.id);

    // 记录活动动态
    await logActivity({
      trip_id: tripId,
      user_id: user.id,
      action: result.liked ? "liked this trip plan ❤️" : "removed like from this trip plan",
    });

    // 广播实时点赞事件至该行程所有在线协同者
    broadcaster.broadcast(tripId, {
      type: "trip_liked",
      tripId,
      liked: result.liked,
      count: result.count,
      likers: result.likers,
      actor: { id: user.id, name: user.name },
    });

    return json({
      success: true,
      tripId,
      liked: result.liked,
      count: result.count,
      likers: result.likers,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to toggle like");
  }
}
