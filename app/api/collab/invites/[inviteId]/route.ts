import * as InviteRepo from "@/src/lib/db/repositories/collab/InviteRepo";
import { resolveDemoUser, extractUserId } from "@/src/lib/server/collab/DemoSession";
import { requirePermission } from "@/src/lib/server/collab/PermissionValidator";
import { logActivity } from "@/src/lib/server/collab/ActivityLogger";
import { ACTIVE_TRIP_ID, json, error } from "@/src/lib/server/collab/collab-route";

type Ctx = { params: Promise<{ inviteId: string }> };

/** 取消邀请（Owner 权限） */
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { inviteId } = await ctx.params;
    const me = await resolveDemoUser(extractUserId(_req));
    await requirePermission(ACTIVE_TRIP_ID, me.AccountID, "cancelInvite");

    const invite = await InviteRepo.findById(inviteId);
    if (!invite || invite.trip_id !== ACTIVE_TRIP_ID) return error("Invitation not found", 404);

    await InviteRepo.deleteInvite(inviteId);
    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.AccountID,
      action: `cancelled the invite to ${invite.receiver_email}`,
    });
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not cancel invite");
  }
}