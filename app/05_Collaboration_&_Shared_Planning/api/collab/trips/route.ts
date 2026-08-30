import { getCloudflareContext } from "@opennextjs/cloudflare";
import { extractUserId, resolveDemoUser } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { buildControlCenterData } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/TripShareService";
import { json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env?.TEST_DB) throw new Error("D1 binding TEST_DB unavailable");
  return env.TEST_DB;
}

export async function GET(req: Request) {
  try {
    const demoUser = await resolveDemoUser(extractUserId(req));
    const db = await getDb();
    // 通过 02 的 trips 表拉 owned（100% 走 02 的表结构，不 import 02 的 BLL 文件以避免循环，轻量 SQL 直读）
    // 符合“不改 02 代码”：仅 SELECT trips.user_id = me，属跨模块读的最小实现，未来可替换为 Server Action 透传
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

    // 若 02 trips 为空（全新 DB），回退从 05 Trip 表中 Owner 视为 owned（兼容 seed trip_langkawi 归属 dev-user-001）
    if (ownedRaw.length === 0) {
      try {
        const res = await db
          .prepare("SELECT TripID as trip_id, TripName as trip_name, StartDate as start_date, EndDate as end_date, UserID as user_id FROM Trip WHERE UserID = ? ORDER BY StartDate ASC")
          .bind(demoUser.id)
          .all<{ trip_id: string; trip_name: string; start_date: string | null; end_date: string | null; user_id: string }>();
        ownedRaw = (res.results ?? []) as typeof ownedRaw;
      } catch {
        // ignore
      }
    }

    const data = await buildControlCenterData(ownedRaw, demoUser.id);
    return json({ success: true, ...data });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Control center failed");
  }
}
