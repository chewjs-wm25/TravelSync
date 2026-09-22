import { json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";
import { getPlanByShareKey } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/PlanImportExportService";

/**
 * GET /05_Collaboration_&_Shared_Planning/api/collab/share-key/[key]
 * 根据分享码解析行程数据供用户预览及一键导入
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    if (!key) return error("Missing share key in route parameters.");

    const result = await getPlanByShareKey(key);
    if (!result.success || !result.plan) {
      return error(result.message || "Invalid or expired share key.", 404);
    }

    return json({
      success: true,
      shareKey: result.shareKey,
      tripName: result.tripName,
      plan: result.plan,
      exportedAt: result.exportedAt,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to resolve share key");
  }
}
