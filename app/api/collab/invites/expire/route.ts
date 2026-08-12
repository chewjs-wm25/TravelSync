import * as InviteRepo from "@/src/lib/db/repositories/collab/InviteRepo";
import { logActivity } from "@/src/lib/server/collab/ActivityLogger";
import { ACTIVE_TRIP_ID, json, error } from "@/src/lib/server/collab/collab-route";

/** 把所有已过期的 pending 邀请标记为 expired（模拟 30 天自动过期） */
export async function POST() {
  try {
    const expired = await InviteRepo.expirePending(new Date().toISOString());
    if (expired.length > 0) {
      for (const invite of expired) {
        await logActivity({
          trip_id: ACTIVE_TRIP_ID,
          user_id: invite.sender_id,
          action: `invitation to ${invite.receiver_email} expired`,
        });
      }
    }
    return json({ ok: true, expired: expired.length });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not expire invites");
  }
}