import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";
import { getFullTripExportData } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/PlanImportExportService";

/**
 * GET /05_Collaboration_&_Shared_Planning/api/collab/trips/[tripId]/export
 * 获取特定行程的完整标准导出 JSON 数据
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    if (!tripId) return error("Missing tripId in route parameters.");

    const me = await resolveDemoUser(extractUserId(req));
    const data = await getFullTripExportData(tripId, me.id);

    return json({
      success: true,
      data,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to export trip data");
  }
}
