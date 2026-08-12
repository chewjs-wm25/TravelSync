/**
 * RemoteFavoritesRepository — 模块 03 收藏夹仓储的远程实现（Data Access Layer, 浏览器端）
 *
 * 职责：以 HTTP 调用 Route API（app/api/discovery/favorites）实现 FavoritesRepository，
 *       仅做参数序列化与响应解析，不含任何 SQL / 数据库逻辑
 *       （数据库操作由服务端 D1FavoritesRepository 承担）。
 *
 * 依赖方向：浏览器端 BL → 本类 → Route API → D1FavoritesRepository → D1。
 */

import type {
  FavoriteItemEntity,
  FavoritesRepository,
} from "./FavoritesRepository";

/** Route API 端点（模块 03 收藏夹） */
const FAVORITES_API = "/api/discovery/favorites";

export class RemoteFavoritesRepository implements FavoritesRepository {
  async listItems(userId: string): Promise<FavoriteItemEntity[]> {
    const res = await fetch(
      `${FAVORITES_API}?userId=${encodeURIComponent(userId)}`
    );
    if (!res.ok) {
      throw new Error(`Failed to load favourites (HTTP ${res.status})`);
    }
    return res.json();
  }

  async addItem(
    userId: string,
    item: FavoriteItemEntity
  ): Promise<FavoriteItemEntity> {
    const res = await fetch(FAVORITES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, item }),
    });
    if (!res.ok) {
      throw new Error(`Failed to add favourite (HTTP ${res.status})`);
    }
    return res.json();
  }

  async removeItem(userId: string, id: string): Promise<void> {
    const res = await fetch(
      `${FAVORITES_API}?userId=${encodeURIComponent(userId)}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      throw new Error(`Failed to remove favourite (HTTP ${res.status})`);
    }
  }
}
