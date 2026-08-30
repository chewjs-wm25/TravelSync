import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { createInvite } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/InviteService";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { mapInvite } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ReplyMapper";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { extractTripId, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

export async function POST(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      role?: InviteRepo.InviteRoleDB;
      tripId?: string;
      trip_id?: string;
    };
    const targetTripId = extractTripId(req, body);

    await requirePermission(targetTripId, me.id, "invite");

    const email = body.email?.trim().toLowerCase() ?? "";
    const role = body.role === "Viewer" ? "Viewer" : body.role === "Editor" ? "Editor" : "Viewer";

    if (!email) return error("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return error("Please enter a valid email address.");
    }

    const invite = await createInvite({
      trip_id: targetTripId,
      sender_id: me.id,
      receiver_email: email,
      role,
    });

    await logActivity({
      trip_id: targetTripId,
      user_id: me.id,
      action: `invited ${email} as ${role}`,
    });

    const invites = await InviteRepo.findByTrip(targetTripId);
    const created = invites.find((i) => i.invitation_id === invite.invitation_id);

    // 广播邀请创建事件
    if (created) {
      broadcaster.broadcast(
        targetTripId,
        {
          type: "invite_created",
          invite: {
            id: created.invitation_id,
            email: created.receiver_email,
            role: created.role,
            status: created.status,
            invitedBy: me.username,
          },
        },
        me.id
      );
    }

    return json({
      success: true,
      invite: created ? mapInvite(created) : undefined,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not create invite");
  }
}