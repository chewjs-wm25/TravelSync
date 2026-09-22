/**
 * AddToTripService — 模块 03"加入行程"（→ 模块 02）业务编排（Business Logic Layer）
 *
 * 职责：将用户在模块 03 选中的地点真实加入模块 02 指定行程日期（itinerary）：
 *   1. 登录校验（与收藏写操作一致：未登录抛"请先登录"，由上层 UI 引导登录）；
 *   2. 坐标补全——模块 02 的 importPlaces 强制要求每条地点坐标有效
 *      （hasValidCoordinates，坐标缺失时整批返回失败），本服务在入参坐标缺失时
 *      经 discoveryService.resolveImportCoordinates 解析（官方评级 D1 坐标 /
 *      getPlaceDetail / Geoapify 名称搜索兜底，全部马来西亚限定）；
 *   3. 目标注入 + 导入——经 RoutePlannerBridge.setTargetItinerary 注入目标行程
 *      日期后调用真实导入接口（POST /02_.../api/itineraries/{itineraryId}/items/import），
 *      调用结束在 finally 中清除目标（每次导入都需上层明确选择目标）；
 *   4. 结果归一——失败/未实际新增均返回 success:false + message，不抛异常。
 *
 * 分层说明：跨模块数据交流发生在 Business Logic Layer（业务编排），
 *           API Layer 仅负责与外部第三方 API 交流。
 * 依赖方向：Business Logic → Data Access / API（DiscoveryService 数据与解析）；
 *           本文件被 Presentation（AddToTripPicker）调用，无其他 BL 反向依赖，
 *           故不会引入 DiscoveryService ⇄ FavoritesService ⇄ RoutePlannerBridge
 *           之类的循环依赖。
 */

import { discoveryService } from "./DiscoveryService";
import { currentUserId } from "./FavoritesService";
import {
  routePlannerBridge,
  type PushToRoutePlannerResult,
} from "./RoutePlannerBridge";
import type { AddToTripImportItem } from "./types";

/** 目标模块标识（模块 02 导入接口） */
const TARGET = "02_Trip_Planning_&_Itinerary_Management" as const;

export class AddToTripService {
  /** 失败结果工厂（message 可选，供 UI 展示具体原因） */
  private failed(message?: string): PushToRoutePlannerResult {
    return {
      success: false,
      pushedCount: 0,
      target: TARGET,
      message,
    };
  }

  /**
   * 将单个地点加入指定行程日期（模块 02 真实导入接口）。
   * @param item        地点条目（SavedItem + 可选 lat/lon；坐标缺失自动解析补齐）
   * @param itineraryId 目标行程日期 id（模块 02 itineraries 主键，弹窗选择所得）
   * @returns { success, pushedCount, target, message? }；失败/未新增均 success:false，
   *          坐标无法解析时 message 说明原因；未登录抛 Error("Please log in first")。
   */
  async addToTripToItinerary(
    item: AddToTripImportItem,
    itineraryId: string
  ): Promise<PushToRoutePlannerResult> {
    // 1. 登录校验（行程归属当前用户，未登录不发起任何写入）
    if (!currentUserId()) {
      throw new Error("Please log in first");
    }

    const trimmedItineraryId = (itineraryId ?? "").trim();
    if (!trimmedItineraryId) {
      return this.failed("No target itinerary selected");
    }

    const name = (item.name ?? "").trim();
    if (!name) {
      return this.failed("Place name is required");
    }

    // 2. 坐标补全：入参已带有效坐标则直接复用（不发请求）
    const hasCoords =
      typeof item.lat === "number" &&
      Number.isFinite(item.lat) &&
      typeof item.lon === "number" &&
      Number.isFinite(item.lon);

    let lat: number | null = hasCoords ? (item.lat as number) : null;
    let lon: number | null = hasCoords ? (item.lon as number) : null;

    if (!hasCoords) {
      const resolved = await discoveryService
        .resolveImportCoordinates(item.placeId, name, item.lat, item.lon)
        .catch(() => null);
      if (!resolved) {
        return this.failed(
          `Unable to locate coordinates for "${name}". The place was not added to the trip.`
        );
      }
      lat = resolved.lat;
      lon = resolved.lon;
    }

    // 3. 目标注入 + 真实导入（调用结束清除目标：每次加入都需明确选择行程日期）
    routePlannerBridge.setTargetItinerary(trimmedItineraryId);
    try {
      const result = await routePlannerBridge.pushItem({
        ...item,
        lat,
        lon,
      });
      if (result.success && (result.pushedCount ?? 0) === 0) {
        return this.failed(
          `No itinerary item was actually added for "${name}".`
        );
      }
      return result;
    } finally {
      routePlannerBridge.setTargetItinerary(null);
    }
  }
}

export const addToTripService = new AddToTripService();
