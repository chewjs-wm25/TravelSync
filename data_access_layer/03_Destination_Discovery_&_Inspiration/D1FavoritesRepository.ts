/**
 * D1FavoritesRepository — 模块 03 收藏夹仓储的 Cloudflare D1 实现（Data Access Layer, 服务端）
 *
 * 职责：以 Cloudflare D1 持久化 Favourite List，实现 FavoritesRepository 接口。
 *       全部数据库操作（建表、查询、插入、删除）内聚在本类，
 *       不包含任何 HTTP / 路由逻辑（传输由 Route API 承担）。
 *
 * 使用方式：由 Route API（app/03_Destination_Discovery_&_Inspiration/api/favourites）以 D1 binding 实例化，
 *           浏览器端经 RemoteFavoritesRepository → Route API → 本类完成读写。
 *
 * 授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）：
 *   当前用户 ID 由 Route API 从服务端会话（Authorization: Bearer token）解析后
 *   经构造器注入，不信任任何前端参数 —— 杜绝越权读写任意用户收藏。
 */

import type { D1Database } from "@cloudflare/workers-types";
import type {
  FavoriteItemEntity,
  FavoritesRepository,
} from "./FavoritesRepository";

export class D1FavoritesRepository implements FavoritesRepository {
  constructor(
    private readonly db: D1Database,
    /** 当前请求的用户 ID（Route API 从会话解析注入） */
    private readonly userId: string
  ) {}

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

  async listItems(): Promise<FavoriteItemEntity[]> {
    await this.ensureTable();
    const { results } = await this.db
      .prepare(
        "SELECT id, place_id AS placeId, name, thumbnail_url AS thumbnailUrl, " +
          "experience_type AS experienceType " +
          "FROM favorite_items WHERE user_id = ? ORDER BY created_at DESC"
      )
      .bind(this.userId)
      .all<FavoriteItemEntity>();
    return results;
  }

  async addItem(item: FavoriteItemEntity): Promise<FavoriteItemEntity> {
    await this.ensureTable();
    await this.db
      .prepare(
        "INSERT INTO favorite_items " +
          "(id, user_id, place_id, name, thumbnail_url, experience_type, created_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        item.id,
        this.userId,
        item.placeId,
        item.name,
        item.thumbnailUrl,
        item.experienceType,
        Date.now()
      )
      .run();
    return item;
  }

  async removeItem(id: string): Promise<void> {
    await this.ensureTable();
    await this.db
      .prepare("DELETE FROM favorite_items WHERE id = ? AND user_id = ?")
      .bind(id, this.userId)
      .run();
  }
}
