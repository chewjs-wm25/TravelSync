import * as MessageRepo from "@/src/lib/db/repositories/collab/MessageRepo";
import { resolveDemoUser, extractUserId } from "@/src/lib/server/collab/DemoSession";
import { requirePermission } from "@/src/lib/server/collab/PermissionValidator";
import { mapChat } from "@/src/lib/server/collab/ReplyMapper";
import { ACTIVE_TRIP_ID, json, error } from "@/src/lib/server/collab/collab-route";

/** POST { text } 发评论 */
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

/** GET 返回全部评论（demo 简单全量拉取，不做 cursor 分页） */
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