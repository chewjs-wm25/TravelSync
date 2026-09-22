import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";
import * as TripRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";
import {
  parseAndValidateTripPlan,
  getPlanByShareKey,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/PlanImportExportService";
import type { ImportTripPayload } from "@/api_layer/05_Collaboration_&_Shared_Planning/types";

/**
 * POST /05_Collaboration_&_Shared_Planning/api/collab/import
 * 导入行程数据并作为当前用户的新行程创建
 */
export async function POST(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));
    const rawBody = (await req.json().catch(() => null)) as unknown;

    if (!rawBody || typeof rawBody !== "object") {
      return error("Invalid import request: Body must be a JSON object.");
    }

    let planPayload: ImportTripPayload;

    // 支持通过 shareKey / key 直接导入
    if ("shareKey" in (rawBody as Record<string, unknown>)) {
      const shareKey = String((rawBody as Record<string, unknown>).shareKey);
      const keyResult = await getPlanByShareKey(shareKey);
      if (!keyResult.success || !keyResult.plan) {
        return error(keyResult.message || "Failed to resolve share key.");
      }
      planPayload = keyResult.plan;
    } else if ("rawJson" in (rawBody as Record<string, unknown>)) {
      const rawText = String((rawBody as Record<string, unknown>).rawJson);
      const parsed = parseAndValidateTripPlan(rawText);
      if (!parsed.success || !parsed.plan) {
        return error(parsed.error || "Failed to validate imported trip plan JSON.");
      }
      planPayload = parsed.plan;
    } else if ("itineraries" in (rawBody as Record<string, unknown>)) {
      // 已经是结构化的 ImportTripPayload
      const parsed = parseAndValidateTripPlan(JSON.stringify(rawBody));
      if (!parsed.success || !parsed.plan) {
        return error(parsed.error || "Invalid trip plan structure.");
      }
      planPayload = parsed.plan;
      if (typeof (rawBody as ImportTripPayload).isShared === "boolean") {
        planPayload.isShared = (rawBody as ImportTripPayload).isShared;
      }
    } else {
      const parsed = parseAndValidateTripPlan(JSON.stringify(rawBody));
      if (!parsed.success || !parsed.plan) {
        return error(parsed.error || "Unrecognized trip plan format.");
      }
      planPayload = parsed.plan;
    }

    // 允许客户端显式覆盖属性（例如用户在预览窗口重命名或修改日期）
    const overrides = rawBody as Partial<ImportTripPayload>;
    if (overrides.tripName?.trim()) planPayload.tripName = overrides.tripName.trim();
    if (overrides.region !== undefined) planPayload.region = overrides.region;
    if (overrides.startDate !== undefined) planPayload.startDate = overrides.startDate;
    if (overrides.endDate !== undefined) planPayload.endDate = overrides.endDate;
    if (overrides.tripNote !== undefined) planPayload.tripNote = overrides.tripNote;
    if (overrides.isShared !== undefined) planPayload.isShared = overrides.isShared;

    const result = await TripRepo.importFullTrip(me.id, planPayload);

    return json({
      success: true,
      tripId: result.tripId,
      tripName: result.tripName,
      message: `Trip "${result.tripName}" successfully imported as a new plan!`,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed to import trip plan");
  }
}
