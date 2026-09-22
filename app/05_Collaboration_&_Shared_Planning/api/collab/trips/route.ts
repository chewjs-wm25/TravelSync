import { getCloudflareContext } from "@opennextjs/cloudflare";
import { extractUserId, resolveDemoUser } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { buildControlCenterData } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/TripShareService";
import { json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

import { syncAndCleanDeletedTrips } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";

async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env?.TEST_DB) throw new Error("D1 binding TEST_DB unavailable");
  return env.TEST_DB;
}

export async function GET(req: Request) {
  try {
    const demoUser = await resolveDemoUser(extractUserId(req), req);
    const db = await getDb();

    // 1. 同步级联清理：若用户在 Module 02 删除了行程，自动清理 05 中的所有孤儿数据
    await syncAndCleanDeletedTrips().catch(() => {});

    // 2. 通过 02 的 trips 表拉取用户拥有的行程（trips 表是行程真实存在的唯一基准）
    let ownedRaw: { trip_id: string; trip_name: string; start_date: string | null; end_date: string | null; user_id: string }[] = [];
    try {
      const res = await db
        .prepare("SELECT trip_id, trip_name, start_date, end_date, user_id FROM trips WHERE user_id = ? ORDER BY start_date ASC")
        .bind(demoUser.id)
        .all<{ trip_id: string; trip_name: string; start_date: string | null; end_date: string | null; user_id: string }>();
      ownedRaw = (res.results ?? []) as typeof ownedRaw;
    } catch {
      ownedRaw = [];
    }

    const data = await buildControlCenterData(ownedRaw, demoUser.id);
    return json({ success: true, ...data });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Control center failed");
  }
}
