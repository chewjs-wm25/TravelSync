/**
 * D1FavoritesRepository — 模块 03 收藏夹仓储的 Cloudflare D1 实现（Data Access Layer, 服务端）
 *
 * 职责：以 Cloudflare D1 持久化 Favourite List，实现 FavoritesRepository 接口。
 *       全部数据库操作（建表、查询、插入、删除）内聚在本类，
 *       不包含任何 HTTP / 路由逻辑（传输由 Route API 承担）。
 *
 * 使用方式：由 Route API（app/api/discovery/favorites）以 D1 binding 实例化，
 *           浏览器端经 RemoteFavoritesRepository → Route API → 本类完成读写。
 */

import type { D1Database } from "@cloudflare/workers-types";
import type {
  FavoriteItemEntity,
  FavoritesRepository,
} from "./FavoritesRepository";

export class D1FavoritesRepository implements FavoritesRepository {
  constructor(private readonly db: D1Database) {}

  /** 懒建表：首次访问时确保 favorite_items 表存在（幂等，见 schema.sql） */
  private async ensureTable(): Promise<void> {
    await this.db
      .prepare(
        "CREATE TABLE IF NOT EXISTS favorite_items (" +
          "id              TEXT PRIMARY KEY, " +
          "user_id         TEXT NOT NULL, " +
          "place_id        TEXT NOT NULL, " +
          "name            TEXT NOT NULL, " +
          "thumbnail_url   TEXT NOT NULL DEFAULT '', " +
          "experience_type TEXT NOT NULL DEFAULT '', " +
          "created_at      INTEGER NOT NULL" +
          ")"
      )
      .run();
  }

  async listItems(userId: string): Promise<FavoriteItemEntity[]> {
    await this.ensureTable();
    const { results } = await this.db
      .prepare(
        "SELECT id, place_id AS placeId, name, thumbnail_url AS thumbnailUrl, " +
          "experience_type AS experienceType " +
          "FROM favorite_items WHERE user_id = ? ORDER BY created_at DESC"
      )
      .bind(userId)
      .all<FavoriteItemEntity>();
    return results;
  }

  async addItem(
    userId: string,
    item: FavoriteItemEntity
  ): Promise<FavoriteItemEntity> {
    await this.ensureTable();
    await this.db
      .prepare(
        "INSERT INTO favorite_items " +
          "(id, user_id, place_id, name, thumbnail_url, experience_type, created_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        item.id,
        userId,
        item.placeId,
        item.name,
        item.thumbnailUrl,
        item.experienceType,
        Date.now()
      )
      .run();
    return item;
  }

  async removeItem(userId: string, id: string): Promise<void> {
    await this.ensureTable();
    await this.db
      .prepare("DELETE FROM favorite_items WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();
  }
}
