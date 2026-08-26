import { loadBootstrap } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/CollabBootstrap";
import { extractUserId, resolveDemoUser } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

export async function GET(req: Request) {
  try {
    const demoUser = await resolveDemoUser(extractUserId(req));
    const data = await loadBootstrap(ACTIVE_TRIP_ID, demoUser.id);
    return json({ success: true, ...data });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Bootstrap failed");
  }
}