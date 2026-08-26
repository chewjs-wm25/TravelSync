import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

type Ctx = { params: Promise<{ memberUserId: string }> };

/** PATCH { role } 修改角色 */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { memberUserId } = await ctx.params;
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.id, "changeRole");

    const body = (await req.json()) as { role?: string };
    const role = body.role === "Editor" ? "Editor" : body.role === "Viewer" ? "Viewer" : null;
    if (!role) return error("role must be 'Editor' or 'Viewer'.");
    if (memberUserId === me.id) return error("Cannot change your own role.");

    const target = (await CollaboratorRepo.findByTrip(ACTIVE_TRIP_ID)).find(
      (m) => m.user_id === memberUserId
    );
    if (!target) return error("Member not found", 404);
    if (target.role === "Owner") return error("Cannot change the Owner's role.");

    await CollaboratorRepo.updateRole(ACTIVE_TRIP_ID, memberUserId, role);
    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.id,
      action: `changed ${target.username}'s role to ${role}`,
    });

    // 广播角色变更事件
    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "role_changed",
      userId: memberUserId,
      role,
    });

    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "activity",
      entry: {
        id: `act-${Date.now()}`,
        actor: me.username,
        action: `changed ${target.username}'s role to ${role}`,
        at: Date.now(),
      },
    });

    return json({ success: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not change role");
  }
}

/** DELETE 移除成员 */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { memberUserId } = await ctx.params;
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.id, "removeMember");

    const target = (await CollaboratorRepo.findByTrip(ACTIVE_TRIP_ID)).find(
      (m) => m.user_id === memberUserId
    );
    if (!target) return error("Member not found", 404);
    if (target.role === "Owner") return error("Cannot remove the Owner.");

    await CollaboratorRepo.deleteCollaborator(ACTIVE_TRIP_ID, memberUserId);
    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.id,
      action: `removed ${target.username} from the trip`,
    });

    // 广播成员移除事件
    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "member_removed",
      userId: memberUserId,
    });

    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "activity",
      entry: {
        id: `act-${Date.now()}`,
        actor: me.username,
        action: `removed ${target.username} from the trip`,
        at: Date.now(),
      },
    });

    return json({ success: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not remove member");
  }
}
