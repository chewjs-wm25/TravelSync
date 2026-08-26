import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import { getTripById } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripRepository";
import * as TripRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";
import { json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { TEST_DB?: D1Database }).TEST_DB;
  if (!db) throw new Error("D1 binding TEST_DB is required");
  return db;
}

/** GET /api/collab/invites/lookup?token=xxx — 无需登录，按 token 查邀请详情 */
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return error("Token is required.");

    const invite = await InviteRepo.findByToken(token);
    if (!invite) return error("Invitation not found.", 404);
    if (invite.status !== "pending") return error("This invitation is no longer pending.");
    if (new Date(invite.expires_at) < new Date()) return error("This invitation has expired.");

    let tripName = "Unknown Trip";
    let tripRegion = "";

    // 优先 Module 02
    try {
      const db = await getDb();
      const trip = await getTripById(db, invite.trip_id);
      if (trip) {
        tripName = trip.trip_name;
      }
    } catch {
      // Fallback: Module 05 自有表
      const trip = await TripRepo.findTripById(invite.trip_id);
      if (trip) {
        tripName = trip.TripName;
        tripRegion = trip.Region ?? "";
      }
    }

    return json({
      success: true,
      invite: {
        id: invite.invitation_id,
        email: invite.receiver_email,
        role: invite.role,
        tripName,
        tripRegion,
        invitedBy: invite.sender_name,
        expiresAt: invite.expires_at,
      },
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Lookup failed");
  }
}
