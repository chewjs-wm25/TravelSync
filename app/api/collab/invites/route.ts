import * as InviteRepo from "@/src/lib/db/repositories/collab/InviteRepo";
import { resolveDemoUser, extractUserId } from "@/src/lib/server/collab/DemoSession";
import { requirePermission } from "@/src/lib/server/collab/PermissionValidator";
import { createInvite } from "@/src/lib/server/collab/InviteService";
import { logActivity } from "@/src/lib/server/collab/ActivityLogger";
import { mapInvite } from "@/src/lib/server/collab/ReplyMapper";
import { ACTIVE_TRIP_ID, json, error } from "@/src/lib/server/collab/collab-route";

export async function POST(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.AccountID, "invite");

    const body = (await req.json()) as { email?: string; role?: InviteRepo.InviteRoleDB };
    const email = body.email?.trim().toLowerCase() ?? "";
    const role = body.role === "Viewer" ? "Viewer" : body.role === "Editor" ? "Editor" : "Viewer";

    if (!email) return error("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return error("Please enter a valid email address.");
    }

    const invite = await createInvite({
      trip_id: ACTIVE_TRIP_ID,
      sender_id: me.AccountID,
      receiver_email: email,
      role,
    });

    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.AccountID,
      action: `invited ${email} as ${role}`,
    });

    const invites = await InviteRepo.findByTrip(ACTIVE_TRIP_ID);
    const created = invites.find((i) => i.invitation_id === invite.invitation_id);
    return json({
      ok: true,
      invite: created ? mapInvite(created) : undefined,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not create invite");
  }
}