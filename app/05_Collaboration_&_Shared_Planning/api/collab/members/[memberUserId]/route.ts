import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

type Ctx = { params: Promise<{ memberUserId: string }> };

/** PATCH { role } 鏀硅鑹诧紱DELETE 绉婚櫎鎴愬憳 */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { memberUserId } = await ctx.params;
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.AccountID, "changeRole");

    const body = (await req.json()) as { role?: string };
    const role = body.role === "Editor" ? "Editor" : body.role === "Viewer" ? "Viewer" : null;
    if (!role) return error("role must be 'Editor' or 'Viewer'.");
    if (memberUserId === me.AccountID) return error("Cannot change your own role.");

    const target = (await CollaboratorRepo.findByTrip(ACTIVE_TRIP_ID)).find(
      (m) => m.user_id === memberUserId
    );
    if (!target) return error("Member not found", 404);
    if (target.role === "Owner") return error("Cannot change the Owner's role.");

    await CollaboratorRepo.updateRole(ACTIVE_TRIP_ID, memberUserId, role);
    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.AccountID,
      action: `changed ${target.username}'s role to ${role}`,
    });
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not change role");
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { memberUserId } = await ctx.params;
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.AccountID, "removeMember");

    const target = (await CollaboratorRepo.findByTrip(ACTIVE_TRIP_ID)).find(
      (m) => m.user_id === memberUserId
    );
    if (!target) return error("Member not found", 404);
    if (target.role === "Owner") return error("Cannot remove the Owner.");

    await CollaboratorRepo.deleteCollaborator(ACTIVE_TRIP_ID, memberUserId);
    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.AccountID,
      action: `removed ${target.username} from the trip`,
    });
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not remove member");
  }
}