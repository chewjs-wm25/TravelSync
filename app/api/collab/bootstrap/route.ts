import { loadBootstrap } from "@/src/lib/server/collab/CollabBootstrap";
import { extractUserId, resolveDemoUser } from "@/src/lib/server/collab/DemoSession";
import { ACTIVE_TRIP_ID, json, error } from "@/src/lib/server/collab/collab-route";

export async function GET(req: Request) {
  try {
    const demoUser = await resolveDemoUser(extractUserId(req));
    const data = await loadBootstrap(ACTIVE_TRIP_ID, demoUser.AccountID);
    return json({ ok: true, ...data });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Bootstrap failed");
  }
}