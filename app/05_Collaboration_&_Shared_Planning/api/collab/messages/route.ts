import * as MessageRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/MessageRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { mapChat } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ReplyMapper";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { extractTripId, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

/** POST { text, tripId? } 发送评论 */
export async function POST(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));
    const body = (await req.json().catch(() => ({}))) as {
      text?: string;
      tripId?: string;
      trip_id?: string;
    };
    const targetTripId = extractTripId(req, body);

    await requirePermission(targetTripId, me.id, "comment");

    const text = body.text?.trim() ?? "";
    if (!text) return error("Comment text is required.");

    const msgId = await MessageRepo.insertChat({
      trip_id: targetTripId,
      user_id: me.id,
      text,
    });

    // 广播评论事件
    broadcaster.broadcast(
      targetTripId,
      {
        type: "comment_added",
        comment: {
          id: String(msgId),
          authorId: me.id,
          authorName: me.full_name || me.username,
          avatar: me.profile_picture ?? "",
          time: new Date().toISOString(),
          text,
        },
      },
      me.id
    );

    broadcaster.broadcast(targetTripId, {
      type: "activity",
      entry: {
        id: `act-${Date.now()}`,
        actor: me.full_name || me.username,
        action: `added a comment: "${text.slice(0, 30)}${text.length > 30 ? "..." : ""}"`,
        at: Date.now(),
      },
    });

    return json({ success: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not add comment");
  }
}

/** GET 获取全部评论 */
export async function GET(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));
    const targetTripId = extractTripId(req);
    const rows = await MessageRepo.findByTrip(targetTripId);
    const comments = rows.map((row) =>
      mapChat(
        {
          id: row.id,
          user_id: row.user_id,
          username: row.username,
          full_name: row.full_name,
          profile_picture: row.profile_picture,
          text: row.text,
          created_at: row.created_at,
        },
        me.id
      )
    );
    return json({ success: true, comments });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not load comments");
  }
}
