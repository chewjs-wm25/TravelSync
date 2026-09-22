/**
 * RoutePlannerBridge — 模块 03 → 模块 02 跨模块数据交流（Business Logic Layer）
 *
 * 职责：将用户选中的地点加入行程（模块 02_Trip_Planning_&_Itinerary_Management）
 *       的跨模块业务编排。
 *
 * 分层说明：跨模块数据交流发生在 Business Logic Layer（业务编排），
 *           API Layer 仅负责与外部第三方 API 交流，故本桥接器不属于 api_layer。
 *
 * 真实接入（原 mock 占位实现与 driver 验证方法已移除）：
 *   - 调用模块 02 提供的导入能力
 *     —— HTTP：`POST /02_Trip_Planning_&_Itinerary_Management/api/itineraries/{itineraryId}/items/import`
 *     （BL 层 `importPlaces` 的 HTTP 通道，见 docs/communicate/02_interface.md §3），
 *     请求体 `{ items: [{ placeId?, name, lat?, lon? }] }`，响应 `{ success, importedCount }`；
 *   - 目标行程日期（itineraryId）由上层经 `setTargetItinerary()` 注入（单例状态）；
 *     未注入时 `pushItem` 返回失败结果（success: false），不抛异常。
 *   - 模块 02 的 `importPlaces` 要求每条地点坐标有效，故入参放宽为
 *     `AddToTripImportItem`（SavedItem + 可选 lat/lon）：调用方在坐标缺失时先经
 *     `DiscoveryService.resolveImportCoordinates` 解析（见 AddToTripService），
 *     有有限坐标时如实写入请求体，否则维持 null。
 *   - 失败/异常透传服务端 message（可选字段），供上层 UI 展示具体原因。
 */

import type { AddToTripImportItem } from "./types";

/** 加入行程结果 */
export interface PushToRoutePlannerResult {
  success: boolean;
  /** 本次加入的条目数量 */
  pushedCount: number;
  /** 目标模块标识（真实跨模块调用） */
  target: "02_Trip_Planning_&_Itinerary_Management";
  /** 失败原因（服务端返回或本地判定，供 UI 展示；成功时为 undefined） */
  message?: string;
}

/** 模块 02 导入端点前缀（统一路径见 guideline §5） */
const MODULE_02_IMPORT_API_PREFIX =
  "/02_Trip_Planning_&_Itinerary_Management/api/itineraries";

export class RoutePlannerBridge {
  /** 目标行程日期 id（模块 02 itineraries 主键），由上层注入；null = 未选择 */
  private targetItineraryId: string | null = null;

  /** 设置目标行程日期（供上层在用户选择行程后注入；null 清除选择） */
  setTargetItinerary(itineraryId: string | null): void {
    this.targetItineraryId = itineraryId;
  }

  /**
   * 将单个地点加入行程（模块 02 真实导入接口）。
   * 目标行程未设置时返回失败结果（success: false）；网络/服务端失败同样
   * 以失败结果返回，不抛异常（上层 UI 按 result.success 分支反馈）。
   * 入参 `AddToTripImportItem` 允许携带可选 lat/lon（模块 02 importPlaces
   * 强制要求有效坐标，调用方应先经坐标解析补齐，见 AddToTripService）。
   */
  async pushItem(item: AddToTripImportItem): Promise<PushToRoutePlannerResult> {
    const failed = (message?: string): PushToRoutePlannerResult => ({
      success: false,
      pushedCount: 0,
      target: "02_Trip_Planning_&_Itinerary_Management",
      message,
    });

    if (!this.targetItineraryId) {
      return failed("No target itinerary selected");
    }

    try {
      const res = await fetch(
        `${MODULE_02_IMPORT_API_PREFIX}/${encodeURIComponent(this.targetItineraryId)}/items/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [
              {
                placeId: item.placeId ?? null,
                name: item.name,
                lat: typeof item.lat === "number" ? item.lat : null,
                lon: typeof item.lon === "number" ? item.lon : null,
              },
            ],
          }),
        }
      );
      // 模块 02 失败响应带 { success: false, message? }，透传 message 供 UI 展示
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        importedCount?: number;
        message?: string;
      };
      if (!res.ok || data.success !== true) {
        return failed(
          typeof data.message === "string" && data.message
            ? data.message
            : undefined
        );
      }
      return {
        success: true,
        pushedCount: data.importedCount ?? 1,
        target: "02_Trip_Planning_&_Itinerary_Management",
      };
    } catch {
      return failed();
    }
  }
}

export const routePlannerBridge = new RoutePlannerBridge();
