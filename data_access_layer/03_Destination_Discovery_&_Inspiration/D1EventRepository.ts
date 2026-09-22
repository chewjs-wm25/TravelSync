/**
 * D1EventRepository — 模块 03 节日/活动仓储的 Cloudflare D1 实现（Data Access Layer, 服务端）
 *
 * 职责：以 Cloudflare D1 持久化节日/活动数据（malaysia.travel 官网活动，
 *       由 EventWebSyncService 服务端爬取后写入），实现 EventRepository 接口。
 *       全部数据库操作（建表、查询、批量 upsert、镜像清理）内聚在本类，
 *       不包含任何 HTTP / 路由逻辑（传输由 Route API 承担）。
 *
 * 使用方式：由模块 03 Route API（app/03_Destination_Discovery_&_Inspiration/api/events*）
 *           以 D1 binding 实例化；浏览器端经 RemoteEventRepository → Route API → 本类完成读写。
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { EventEntity, EventRepository } from "./EventRepository";

export class D1EventRepository implements EventRepository {
  constructor(private readonly db: D1Database) {}

  /** 懒建表：首次访问时确保 events 表存在（幂等，见 schema.sql） */
  private async ensureTable(): Promise<void> {
    await this.db
      .prepare(
        "CREATE TABLE IF NOT EXISTS events (" +
          "id         TEXT PRIMARY KEY, " +
          "title      TEXT NOT NULL, " +
          "categories TEXT NOT NULL DEFAULT '[]', " +
          "date       TEXT NOT NULL, " +
          "location   TEXT NOT NULL, " +
          "url        TEXT NOT NULL, " +
          "synced_at  INTEGER NOT NULL" +
          ")"
      )
      .run();
  }

  async listAll(): Promise<EventEntity[]> {
    await this.ensureTable();
    const { results } = await this.db
      .prepare(
        "SELECT id, title, categories, date, location, url, synced_at AS syncedAt " +
          "FROM events ORDER BY date ASC"
      )
      .all<{
        id: string;
        title: string;
        categories: string;
        date: string;
        location: string;
        url: string;
        syncedAt: number;
      }>();
    return results.map((row) => ({
      id: row.id,
      title: row.title,
      categories: parseCategories(row.categories),
      date: row.date,
      location: row.location,
      url: row.url,
      syncedAt: row.syncedAt,
    }));
  }

  async upsertAll(items: EventEntity[]): Promise<number> {
    await this.ensureTable();
    const stmt = this.db.prepare(
      "INSERT INTO events (id, title, categories, date, location, url, synced_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET " +
        "title = excluded.title, " +
        "categories = excluded.categories, " +
        "date = excluded.date, " +
        "location = excluded.location, " +
        "url = excluded.url, " +
        "synced_at = excluded.synced_at"
    );
    for (const item of items) {
      await stmt
        .bind(
          item.id,
          item.title,
          JSON.stringify(item.categories),
          item.date,
          item.location,
          item.url,
          item.syncedAt
        )
        .run();
    }
    return items.length;
  }

  /** 清空全部活动数据；返回删除条数（表不存在时按 0 处理） */
  async clearAll(): Promise<number> {
    const result = await this.db.prepare("DELETE FROM events").run();
    return result.meta.changes;
  }

  /**
   * 镜像清理（服务端同步专用）：删除 id 不在 keepIds 中的全部旧行，
   * 使 D1 与官网当前列表保持一致。逐条 DELETE（D1 单语句参数上限内最稳妥，
   * 活动量级小，逐条开销可忽略）。空 keepIds 视为防御性 no-op，绝不误删。
   * 返回实际删除条数。
   */
  async deleteIdsNotIn(keepIds: string[]): Promise<number> {
    await this.ensureTable();
    if (keepIds.length === 0) return 0;
    const keep = new Set(keepIds);
    const { results } = await this.db
      .prepare("SELECT id FROM events")
      .all<{ id: string }>();
    const staleIds = results.map((row) => row.id).filter((id) => !keep.has(id));

    const stmt = this.db.prepare("DELETE FROM events WHERE id = ?");
    let removed = 0;
    for (const id of staleIds) {
      const result = await stmt.bind(id).run();
      removed += result.meta.changes;
    }
    return removed;
  }
}

/** D1 中 categories 以 JSON 字符串存储，读取时反序列化（损坏时降级为空数组） */
function parseCategories(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
