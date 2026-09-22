import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";
import { createPlanShareKey } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/PlanImportExportService";
import * as ShareKeyRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ShareKeyRepo";

/**
 * POST /05_Collaboration_&_Shared_Planning/api/collab/trips/[tripId]/share-key
 * 为指定行程生成或返回最新行程免文件分享码 (Share Key / Token)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    if (!tripId) return error("Missing tripId in route parameters.");

    const me = await resolveDemoUser(extractUserId(req));
    const body = (await req.json().catch(() => ({}))) as { expiresDays?: number };

    const result = await createPlanShareKey(tripId, me.id, body.expiresDays);
    if (!result.success) {
      return error(result.message || "Failed to create share key.");
    }

    return json({
      success: true,
      shareKey: result.shareKey,
      tripName: result.tripName,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to handle share key creation");
  }
}

/**
 * GET /05_Collaboration_&_Shared_Planning/api/collab/trips/[tripId]/share-key
 * 获取指定行程的现有最新有效分享码（若有）
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    if (!tripId) return error("Missing tripId in route parameters.");

    const me = await resolveDemoUser(extractUserId(req));
    const existing = await ShareKeyRepo.findLatestByTrip(tripId, me.id);

    if (!existing) {
      return json({ success: false, message: "No active share key found for this trip." });
    }

    return json({
      success: true,
      shareKey: existing.share_key,
      tripName: existing.trip_name,
      createdAt: existing.created_at,
      expiresAt: existing.expires_at,
      useCount: existing.use_count,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to retrieve share key");
  }
}
