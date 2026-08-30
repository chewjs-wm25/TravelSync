import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { extractTripId, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

type Ctx = { params: Promise<{ inviteId: string }> };

/** 取消邀请（Owner 权限） */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { inviteId } = await ctx.params;
    const me = await resolveDemoUser(extractUserId(req));

    const invite = await InviteRepo.findById(inviteId);
    if (!invite) return error("Invitation not found", 404);

    const targetTripId = invite.trip_id || extractTripId(req);
    await requirePermission(targetTripId, me.id, "cancelInvite");

    await InviteRepo.deleteInvite(inviteId);
    await logActivity({
      trip_id: targetTripId,
      user_id: me.id,
      action: `cancelled the invite to ${invite.receiver_email}`,
    });

    // 广播邀请取消事件
    broadcaster.broadcast(targetTripId, {
      type: "invite_cancelled",
      inviteId,
    });

    broadcaster.broadcast(targetTripId, {
      type: "activity",
      entry: {
        id: `act-${Date.now()}`,
        actor: me.username,
        action: `cancelled the invite to ${invite.receiver_email}`,
        at: Date.now(),
      },
    });

    return json({ success: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not cancel invite");
  }
}
