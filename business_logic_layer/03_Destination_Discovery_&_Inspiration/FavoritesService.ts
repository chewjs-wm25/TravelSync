/**
 * FavoritesService — 模块 03 收藏夹业务逻辑（Business Logic Layer）
 *
 * 职责：
 *   - 收藏夹（Favourite List）的查询、增删、收藏状态切换（toggle）；
 *   - "将地点加入行程（模块 02）"的跨模块业务编排
 *     （经 RoutePlannerBridge 调用模块 02 真实导入接口，发生在 Business Logic
 *     而非 API Layer）。
 *
 * 依赖方向：Business Logic → Data Access Layer（FavoritesRepository）
 *
 * 每个用户只有一个收藏夹（不区分文件夹）：用户 ID 从账号状态
 * （authUser store，会话来源）动态读取（currentUserId），不再硬编码；
 * 未登录时读操作返回空收藏集，写操作抛出"请先登录"错误。
 * 服务端 Route API 以会话凭证（token）为准解析用户 ID，不信任前端参数。
 */

import type { FavoritesRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository";
import { RemoteFavoritesRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteFavoritesRepository";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";
import {
  RoutePlannerBridge,
  routePlannerBridge,
  type PushToRoutePlannerResult,
} from "./RoutePlannerBridge";
import type { PoiItem, SavedItem } from "./types";

/** 当前登录用户 ID（会话来源；未登录返回 null） */
export function currentUserId(): string | null {
  const user = useAuthStore.getState().user;
  return user?.id ?? null;
}

/**
 * 模块内共享的收藏仓储单例（浏览器端远程实现）：
 * 经 Route API → D1FavoritesRepository → Cloudflare D1 持久化。
 * 保证模块内所有服务（DiscoveryService / FavoritesService）读写同一份数据。
 */
export const sharedFavoritesRepository: FavoritesRepository =
  new RemoteFavoritesRepository();

export class FavoritesService {
  constructor(
    private readonly repo: FavoritesRepository = sharedFavoritesRepository,
    // 默认使用模块级单例，保证外部 routePlannerBridge.setTargetItinerary()
    // 注入的目标行程对本服务实例生效（同一实例共享状态）
    private readonly routePlanner: RoutePlannerBridge = routePlannerBridge,
  ) {}

  /** 写操作前置：要求已登录（未登录抛出提示，由上层 UI 捕获展示） */
  private requireUserId(): string {
    const userId = currentUserId();
    if (!userId) {
      throw new Error("Please log in first");
    }
    return userId;
  }

  /** 当前用户收藏夹全部条目（未登录返回空列表） */
  async getSavedItems(): Promise<SavedItem[]> {
    if (!currentUserId()) return [];
    return this.repo.listItems();
  }

  /** 删除一条收藏（要求登录） */
  async removeSavedItem(id: string): Promise<void> {
    this.requireUserId();
    await this.repo.removeItem(id);
  }

  /** 指定 POI 是否已收藏（未登录视为未收藏） */
  async isPoiFavourite(poiId: string): Promise<boolean> {
    if (!currentUserId()) return false;
    const items = await this.repo.listItems();
    return items.some((item) => item.id === poiId);
  }

  /**
   * 切换 POI 收藏状态（要求登录）：
   * 未收藏 → 加入收藏夹（保存 placeId 与体验类型，供详情跳转与类型过滤）；
   * 已收藏 → 移除。返回切换后的收藏状态。
   */
  async togglePoiFavourite(poi: PoiItem): Promise<boolean> {
    this.requireUserId();
    const favourite = await this.isPoiFavourite(poi.id);
    if (favourite) {
      await this.repo.removeItem(poi.id);
      return false;
    }
    await this.repo.addItem({
      id: poi.id,
      placeId: poi.id.startsWith("geo-") ? poi.id.slice("geo-".length) : poi.id,
      name: poi.name,
      thumbnailUrl: poi.imageUrl,
      experienceType: poi.experienceType,
    });
    return true;
  }

  /**
   * 跨模块数据交流（Business Logic 编排，非 API Layer 职责）：
   * 将单个地点加入行程（模块 02）。
   * 经 RoutePlannerBridge 调用模块 02 真实导入接口
   * （POST /02_.../api/itineraries/{itineraryId}/items/import）；
   * 目标行程由 routePlannerBridge.setTargetItinerary() 预先注入，
   * 未注入时返回 success: false（UI 按失败分支反馈）。
   */
  async addToTrip(item: SavedItem): Promise<PushToRoutePlannerResult> {
    return this.routePlanner.pushItem(item);
  }
}

export const favoritesService = new FavoritesService();
