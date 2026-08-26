/**
 * RoutePlannerBridge — 模块 03 → 模块 02 跨模块数据交流（Business Logic Layer）
 *
 * 职责：将用户选中的地点加入行程（模块 02_Trip_Planning_&_Itinerary_Management）
 *       的跨模块业务编排。
 *
 * 分层说明：跨模块数据交流发生在 Business Logic Layer（业务编排），
 *           API Layer 仅负责与外部第三方 API 交流，故本桥接器不属于 api_layer。
 *
 * 暂时替代品（stub&driver）：
 *   - stub：模块 02 尚未接入，此处以模拟实现占位（异步提交 + 内存记录 + 返回成功）；
 *   - driver：上层可经 getPushedItems() 读取 stub 记录，验证"加入行程"链路真实生效。
 * 未来无缝衔接：将内部实现替换为调用模块 02 提供的导入能力
 *   —— BL 层 `importPlaces`（`POST /02_Trip_Planning_&_Itinerary_Management/api/itineraries/{itineraryId}/items/import`，
 *   见 docs/communicate/02_interface.md §3），
 *   保持 pushItem 签名与返回结构不变，上层（FavoritesService）无需改动。
 */

import type { SavedItem } from "./types";

/** 加入行程结果 */
export interface PushToRoutePlannerResult {
  success: boolean;
  /** 本次加入的条目数量 */
  pushedCount: number;
  /** 目标模块标识（未来替换为真实跨模块调用后保持不变） */
  target: "02_Trip_Planning_&_Itinerary_Management";
}

export class RoutePlannerBridge {
  /** stub：内存记录已加入行程的条目（driver 验证用；接入模块 02 后移除） */
  private readonly pushedItems: SavedItem[] = [];

  /** 读取 stub 已记录的条目（仅供 driver / 调试验证 stub 行为） */
  getPushedItems(): SavedItem[] {
    return [...this.pushedItems];
  }

  /**
   * 将单个地点加入行程（模块 02）。
   * mock：模拟网络延迟、记录条目并返回成功；未来替换为真实跨模块调用。
   */
  async pushItem(item: SavedItem): Promise<PushToRoutePlannerResult> {
    // mock：模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.pushedItems.push(item);
    return {
      success: true,
      pushedCount: 1,
      target: "02_Trip_Planning_&_Itinerary_Management",
    };
  }
}

export const routePlannerBridge = new RoutePlannerBridge();
