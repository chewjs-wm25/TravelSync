/**
 * FavoritesService — 模块 03 收藏夹业务逻辑（Business Logic Layer）
 *
 * 职责：
 *   - 收藏夹（Favourite List）的查询、增删、收藏状态切换（toggle）；
 *   - "将地点加入行程（模块 02）"的跨模块业务编排
 *     （经 RoutePlannerBridge stub，发生在 Business Logic 而非 API Layer）。
 *
 * 依赖方向：Business Logic → Data Access Layer（FavoritesRepository）
 *
 * 每个用户只有一个收藏夹（不区分文件夹）：用户 ID 当前由本层硬编码
 * （CURRENT_USER_ID），未来接入真实用户体系时替换为会话来源即可，
 * 上层调用无需改动。
 */

import type { FavoritesRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository";
import { RemoteFavoritesRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteFavoritesRepository";
import {
  RoutePlannerBridge,
  type PushToRoutePlannerResult,
} from "./RoutePlannerBridge";
import type { PoiItem, SavedItem } from "./types";

/** 当前登录用户 ID（硬编码占位，未来替换为真实会话用户） */
export const CURRENT_USER_ID = "dev-user-001";

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
    private readonly routePlanner: RoutePlannerBridge = new RoutePlannerBridge(),
  ) {}

  /** 当前用户收藏夹全部条目 */
  async getSavedItems(): Promise<SavedItem[]> {
    return this.repo.listItems(CURRENT_USER_ID);
  }

  /** 删除一条收藏 */
  async removeSavedItem(id: string): Promise<void> {
    await this.repo.removeItem(CURRENT_USER_ID, id);
  }

  /** 指定 POI 是否已收藏 */
  async isPoiFavourite(poiId: string): Promise<boolean> {
    const items = await this.repo.listItems(CURRENT_USER_ID);
    return items.some((item) => item.id === poiId);
  }

  /**
   * 切换 POI 收藏状态：
   * 未收藏 → 加入收藏夹（保存 placeId 与体验类型，供详情跳转与类型过滤）；
   * 已收藏 → 移除。返回切换后的收藏状态。
   */
  async togglePoiFavourite(poi: PoiItem): Promise<boolean> {
    const favourite = await this.isPoiFavourite(poi.id);
    if (favourite) {
      await this.repo.removeItem(CURRENT_USER_ID, poi.id);
      return false;
    }
    await this.repo.addItem(CURRENT_USER_ID, {
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
   * 当前经 RoutePlannerBridge（本模块暂时替代品 stub）mock 完成，
   * 未来替换为模块 02 的真实客户端后签名保持不变。
   */
  async addToTrip(item: SavedItem): Promise<PushToRoutePlannerResult> {
    return this.routePlanner.pushItem(item);
  }
}

export const favoritesService = new FavoritesService();
