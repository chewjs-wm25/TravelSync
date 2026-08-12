/**
 * FavoritesRepository — 模块 03 收藏夹仓储接口（Data Access Layer）
 *
 * 职责（单一）：
 *   - 封装用户收藏（Favourite List）的持久化读写；
 *   - 不包含任何业务判断（业务规则由 Business Logic Layer 负责）。
 *
 * 每个用户只有一个收藏夹：不区分文件夹，条目按 user_id 归属。
 * 所有方法均需携带 userId（当前由 BL 层硬编码注入，见 FavoritesService）。
 *
 * 实现类：
 *   - D1FavoritesRepository（服务端）：直接操作 Cloudflare D1（SQL 内聚于此）；
 *   - RemoteFavoritesRepository（浏览器端）：经 Route API 转发到服务端实现。
 *
 * 调用方（Business Logic Layer）只依赖本接口，切换实现时无需改动。
 */

// ---------------------------------------------------------------------------
// 实体类型
// ---------------------------------------------------------------------------

/** 收藏夹条目（对应 D1 表 favorite_items 的一行） */
export interface FavoriteItemEntity {
  /** 收藏条目唯一标识（= 地点 POI id，如 "geo-<placeId>"） */
  id: string;
  /** Geoapify 原始 place_id（用于跳转地点详情页） */
  placeId: string;
  name: string;
  thumbnailUrl: string;
  /** 体验类型（如 "Museums & Culture"），收藏夹类型过滤器依据 */
  experienceType: string;
}

// ---------------------------------------------------------------------------
// 仓储接口
// ---------------------------------------------------------------------------

export interface FavoritesRepository {
  /** 列出某用户收藏夹的全部条目 */
  listItems(userId: string): Promise<FavoriteItemEntity[]>;
  /** 新增一条收藏（id 由调用方生成） */
  addItem(
    userId: string,
    item: FavoriteItemEntity
  ): Promise<FavoriteItemEntity>;
  /** 按 id 删除某用户的一条收藏 */
  removeItem(userId: string, id: string): Promise<void>;
}
