import { getCloudflareContext } from "@opennextjs/cloudflare";
import { loadBootstrap } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/CollabBootstrap";
import { extractUserId, resolveDemoUser } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { TEST_DB?: D1Database }).TEST_DB;
  if (!db) throw new Error("D1 binding TEST_DB is required");
  return db;
}

export async function GET(req: Request) {
  try {
    const demoUser = await resolveDemoUser(extractUserId(req));
    const db = await getDb();
    const data = await loadBootstrap(db, ACTIVE_TRIP_ID, demoUser.id);
    return json({ success: true, ...data });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Bootstrap failed");
  }
}