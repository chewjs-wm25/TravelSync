import * as MessageRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/MessageRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { mapChat } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ReplyMapper";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

/** POST { text } 鍙戣瘎璁?*/
export async function POST(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.AccountID, "comment");

    const body = (await req.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    if (!text) return error("Comment text is required.");

    await MessageRepo.insertChat({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.AccountID,
      text,
    });

    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not add comment");
  }
}

/** GET 杩斿洖鍏ㄩ儴璇勮锛坉emo 绠€鍗曞叏閲忔媺鍙栵紝涓嶅仛 cursor 鍒嗛〉锛?*/
export async function GET(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));
    const rows = await MessageRepo.findByTrip(ACTIVE_TRIP_ID);
    const comments = rows.map((row) =>
      mapChat(
        {
          id: row.id,
          user_id: row.user_id,
          username: row.username,
          profile_picture: row.profile_picture,
          text: row.text,
          created_at: row.created_at,
        },
        me.AccountID
      )
    );
    return json({ ok: true, comments });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not load comments");
  }
}