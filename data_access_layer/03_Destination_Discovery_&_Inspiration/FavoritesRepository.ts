/**
 * FavoritesRepository — 模块 03 收藏夹仓储接口（Data Access Layer）
 *
 * 职责（单一）：
 *   - 封装用户收藏（Favourite List）的持久化读写；
 *   - 不包含任何业务判断（业务规则由 Business Logic Layer 负责）。
 *
 * 每个用户只有一个收藏夹：不区分文件夹，条目按 user_id 归属。
 * userId 语义（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）：
 *   - D1FavoritesRepository（服务端）的 userId 由 Route API 从会话凭证解析后传入，
 *     不信任任何前端参数；
 *   - RemoteFavoritesRepository（浏览器端）省略 userId 参数，服务端以会话为准。
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
  /** 列出当前用户的收藏夹全部条目（userId 由实现方决定：D1 经构造器注入，Remote 以会话为准） */
  listItems(): Promise<FavoriteItemEntity[]>;
  /** 新增一条收藏（id 由调用方生成） */
  addItem(item: FavoriteItemEntity): Promise<FavoriteItemEntity>;
  /** 按 id 删除当前用户的一条收藏 */
  removeItem(id: string): Promise<void>;
}
