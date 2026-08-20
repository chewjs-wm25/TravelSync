/**
 * HardcodedEventRepository — 模块 03 节日/活动数据源实现（Data Access Layer, 浏览器端）
 *
 * 职责（单一）：
 *   - 读取官方活动爬取结果（parsed_events.json）并映射为 EventEntity 列表；
 *   - 不包含任何业务判断（由 Business Logic Layer 负责）。
 */

import rawData from "./parsed_events.json";
import type { EventEntity } from "./EventRepository";

/** JSON 原始行形态（与 parsed_events.json 结构一致） */
interface RawParsedEvent {
  title: string;
  categories: string[];
  date: string;
  location: string;
  url: string;
}

/** 由活动 title 生成稳定 slug 作为 id（用于 D1 主键，保证幂等） */
function titleToSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `evt-${title.length}`;
}

export class HardcodedEventRepository {
  /** 读取 JSON 全量条目（syncedAt 由同步服务写入时填充） */
  listAll(): EventEntity[] {
    const rows = rawData as RawParsedEvent[];
    return rows.map((row) => ({
      id: titleToSlug(row.title),
      title: row.title,
      categories: row.categories,
      date: row.date,
      location: row.location,
      url: row.url,
      syncedAt: 0,
    }));
  }
}

export const hardcodedEventRepository = new HardcodedEventRepository();
