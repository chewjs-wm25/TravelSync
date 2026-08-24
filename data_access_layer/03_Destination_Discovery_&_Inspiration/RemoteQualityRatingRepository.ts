/**
 * RemoteQualityRatingRepository — 模块 03 官方评级仓储的远程实现（Data Access Layer, 浏览器端）
 *
 * 职责：以 HTTP 调用 Route API（app/03_Destination_Discovery_&_Inspiration/api/official-quality-ratings）实现
 *       OfficialQualityRatingRepository，仅做参数序列化与响应解析，不含任何 SQL / 数据库逻辑
 *       （数据库操作由服务端 D1QualityRatingRepository 承担）。
 *
 * 授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）：
 *   - upsertAll / clearAll 为危险写操作，携带当前会话凭证
 *     （Authorization: Bearer <token>），服务端要求管理员会话
 *     （未登录 401 / 非 admin 403），失败在此抛出 Error。
 *
 * 依赖方向：浏览器端 BL → 本类 → Route API → D1QualityRatingRepository → D1。
 */

import type {
  OfficialQualityRatingEntity,
  OfficialQualityRatingRepository,
} from "./OfficialQualityRatingRepository";
import { sessionAuthHeaders } from "./sessionAuth";

/** Route API 端点（模块 03 官方品质评级） */
const QUALITY_RATINGS_API =
  "03_Destination_Discovery_&_Inspiration/api/official-quality-ratings";

export class RemoteQualityRatingRepository implements OfficialQualityRatingRepository {
  async listAll(): Promise<OfficialQualityRatingEntity[]> {
    const res = await fetch(QUALITY_RATINGS_API);
    if (!res.ok) {
      throw new Error(
        `Failed to load official quality ratings (HTTP ${res.status})`
      );
    }
    return res.json();
  }

  /** 批量 upsert（管理员会话） */
  async upsertAll(items: OfficialQualityRatingEntity[]): Promise<number> {
    const res = await fetch(QUALITY_RATINGS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...sessionAuthHeaders(),
      },
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

  /** 清空全部官方评级数据（DELETE Route API，管理员会话），返回删除条数 */
  async clearAll(): Promise<number> {
    const res = await fetch(QUALITY_RATINGS_API, {
      method: "DELETE",
      headers: sessionAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(
        `Failed to clear official quality ratings (HTTP ${res.status})`
      );
    }
    const data = (await res.json()) as { cleared?: number };
    return data.cleared ?? 0;
  }
}

export const remoteQualityRatingRepository =
  new RemoteQualityRatingRepository();
