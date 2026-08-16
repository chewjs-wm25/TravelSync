/**
 * RemoteQualityRatingRepository — 模块 03 官方评级仓储的远程实现（Data Access Layer, 浏览器端）
 *
 * 职责：以 HTTP 调用 Route API（app/api/discovery/official-quality-ratings）实现
 *       OfficialQualityRatingRepository，仅做参数序列化与响应解析，不含任何 SQL / 数据库逻辑
 *       （数据库操作由服务端 D1QualityRatingRepository 承担）。
 *
 * 依赖方向：浏览器端 BL → 本类 → Route API → D1QualityRatingRepository → D1。
 */

import type {
  OfficialQualityRatingEntity,
  OfficialQualityRatingRepository,
} from "./OfficialQualityRatingRepository";

/** Route API 端点（模块 03 官方品质评级） */
const QUALITY_RATINGS_API = "/api/discovery/official-quality-ratings";

export class RemoteQualityRatingRepository
  implements OfficialQualityRatingRepository
{
  async listAll(): Promise<OfficialQualityRatingEntity[]> {
    const res = await fetch(QUALITY_RATINGS_API);
    if (!res.ok) {
      throw new Error(
        `Failed to load official quality ratings (HTTP ${res.status})`
      );
    }
    return res.json();
  }

  async upsertAll(items: OfficialQualityRatingEntity[]): Promise<number> {
    const res = await fetch(QUALITY_RATINGS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      throw new Error(
        `Failed to sync official quality ratings (HTTP ${res.status})`
      );
    }
    const data = (await res.json()) as { synced?: number };
    return data.synced ?? 0;
  }

  /** 清空全部官方评级数据（DELETE Route API），返回删除条数 */
  async clearAll(): Promise<number> {
    const res = await fetch(QUALITY_RATINGS_API, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(
        `Failed to clear official quality ratings (HTTP ${res.status})`
      );
    }
    const data = (await res.json()) as { cleared?: number };
    return data.cleared ?? 0;
  }
}

export const remoteQualityRatingRepository = new RemoteQualityRatingRepository();
