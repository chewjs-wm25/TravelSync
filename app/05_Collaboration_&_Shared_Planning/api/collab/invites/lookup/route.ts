import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import * as TripRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";
import { json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

/** GET /api/collab/invites/lookup?token=xxx — 无需登录，按 token 查邀请详情 */
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return error("Token is required.");

    const invite = await InviteRepo.findByToken(token);
    if (!invite) return error("Invitation not found.", 404);
    if (invite.status !== "pending") return error("This invitation is no longer pending.");
    if (new Date(invite.expires_at) < new Date()) return error("This invitation has expired.");

    const trip = await TripRepo.findTripById(invite.trip_id);

    const { getDB } = await import("@/data_access_layer/05_Collaboration_&_Shared_Planning/db");
    const db = await getDB();
    const existingUser = await db
      .prepare("SELECT id, username, full_name, email FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1")
      .bind(invite.receiver_email)
      .first<{ id: string; username: string; full_name: string; email: string }>();

    return json({
      success: true,
      invite: {
        id: invite.invitation_id,
        token: invite.Token,
        email: invite.receiver_email,
        role: invite.role,
        tripId: invite.trip_id,
        tripName: trip?.TripName ?? "Unknown Trip",
        tripRegion: trip?.Region ?? "",
        invitedBy: invite.sender_name,
        expiresAt: invite.expires_at,
        accountExists: Boolean(existingUser),
      },
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Lookup failed");
  }
}
