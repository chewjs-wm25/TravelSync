/**
 * RemoteQualityRatingRepository — 模块 03 官方评级仓储的远程实现（Data Access Layer, 浏览器端）
 *
 * 职责：以 HTTP 调用 Route API（app/03_Destination_Discovery_&_Inspiration/api/official-quality-ratings）实现
 *       OfficialQualityRatingRepository，仅做参数序列化与响应解析，不含任何 SQL / 数据库逻辑
 *       （数据库操作由服务端 D1QualityRatingRepository 承担）；并提供 syncFromWeb() 触发
 *       "服务端爬取 MOTAC 官网 → D1"同步（爬虫在服务端执行，见 QualityRatingWebSyncService）。
 *
 * 授权：upsertAll / clearAll / syncFromWeb 仍携带当前会话凭证（Authorization: Bearer <token>，
 * 经 sessionAuthHeaders；未登录时为空头），服务端 Route API 不再做管理员会话校验
 * （原 requireAdmin 限制已移除），凭证头仅为兼容保留，不影响匿名调用。
 *
 * 依赖方向：浏览器端 BL → 本类 → Route API → D1QualityRatingRepository → D1。
 */

import type {
  OfficialQualityRatingEntity,
  OfficialQualityRatingRepository,
} from "./OfficialQualityRatingRepository";
import { sessionAuthHeaders } from "./sessionAuth";

/** Route API 端点（模块 03 官方品质评级；统一路径见 guideline §5，前导 / 保证任意子路由下解析正确） */
const QUALITY_RATINGS_API =
  "/03_Destination_Discovery_&_Inspiration/api/official-quality-ratings";

/** "服务端爬取→D1"同步结果统计（与 Route API 响应字段一致） */
export interface QualityRatingWebSyncStats {
  /** 官网抓取到的卡片总数（成功解析 + 被跳过） */
  total: number;
  /** 实际写入 D1 的条数 */
  synced: number;
  /** 写入失败被跳过的条数 */
  failed: number;
  /** 被镜像清理的旧行数（跳过率 ≤25% 时执行） */
  pruned: number;
  /** 因结构不完整被跳过的官网卡片数 */
  skipped: number;
}

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

  /**
   * 触发一次服务端同步：Route API 在 Worker 内爬取 MOTAC 官网 MyTQA 列表并
   * upsert /（跳过率 ≤25% 时）镜像清理 D1（浏览器端无法直连官网：跨域被 CORS
   * 拦截，爬虫只能在服务端执行）。
   * options.limit 未传 → 全量；传入 N → 快速测试：仅导入官网前 N 条、永不清库。
   */
  async syncFromWeb(options?: {
    limit?: number;
  }): Promise<QualityRatingWebSyncStats> {
    const res = await fetch(`${QUALITY_RATINGS_API}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...sessionAuthHeaders(),
      },
      body: JSON.stringify(options?.limit !== undefined ? { limit: options.limit } : {}),
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(
        detail?.message ??
          `Failed to sync official quality ratings from web (HTTP ${res.status})`
      );
    }
    return res.json();
  }

  /** 批量 upsert（DEV 同步入口；携带会话凭证仅为兼容，服务端不再校验） */
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

  /** 清空全部官方评级数据（DELETE Route API，DEV 清空入口；服务端不再校验会话），返回删除条数 */
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
