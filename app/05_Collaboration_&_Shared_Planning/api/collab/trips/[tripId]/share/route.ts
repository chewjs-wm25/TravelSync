import { extractUserId, resolveDemoUser } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { setTripShareStatus } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/TripShareService";
import { json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

export async function PATCH(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;
    const body = (await req.json().catch(() => ({}))) as { isShared?: boolean };
    if (typeof body.isShared !== "boolean") return error("isShared (boolean) required", 400);
    const demoUser = await resolveDemoUser(extractUserId(req));
    const result = await setTripShareStatus(tripId, demoUser.id, body.isShared);
    return json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Toggle share failed";
    const status = msg.includes("Only Owner") ? 403 : 400;
    return error(msg, status);
  }
}
