/**
 * RemoteEventRepository — 模块 03 节日/活动仓储的远程实现（Data Access Layer, 浏览器端）
 *
 * 职责：以 HTTP 调用模块 03 Route API 实现 EventRepository（listAll / clearAll），
 *       并提供 syncFromWeb() 触发"服务端爬取官网 → D1"同步；仅做参数序列化与响应解析，
 *       不含任何 SQL / 数据库 / 爬虫逻辑（分别由服务端 D1EventRepository 与
 *       EventWebSyncService 承担）。
 *
 * 授权（2026-09 安全更新）：syncFromWeb / clearAll 为 Admin Panel 操作，携带当前
 * 会话凭证（Authorization: Bearer <token>，经 sessionAuthHeaders；同源请求自动携带
 * HttpOnly cookie，会话实为 cookie 鉴权，凭证头仅为兼容保留），服务端 Route API
 * 要求管理员会话（未登录 401 / 非 admin 403，见 sessionHelper.requireAdmin）。
 * 每日 Cloudflare Cron 改为在 scheduled 内直接调用 EventWebSyncService，不再经本端点。
 *
 * 依赖方向：浏览器端 BL → 本类 → Route API → D1EventRepository / EventWebSyncService。
 */

import type { EventEntity, EventRepository } from "./EventRepository";
import { sessionAuthHeaders } from "./sessionAuth";

/** Route API 端点（模块 03 节日/活动；统一路径见 guideline §5，前导 / 保证任意子路由下解析正确） */
const EVENTS_API = "/03_Destination_Discovery_&_Inspiration/api/events";

/** "服务端爬取→D1"同步结果统计（与 Route API 响应字段一致） */
export interface EventSyncStats {
  /** 官网解析出的卡片总数 */
  total: number;
  /** 实际写入 D1 的条数 */
  synced: number;
  /** 写入失败被跳过的条数 */
  failed: number;
  /** 被镜像清理的旧行数 */
  pruned: number;
  /** 因结构不完整被跳过的官网卡片数 */
  skipped: number;
}

export class RemoteEventRepository implements EventRepository {
  async listAll(): Promise<EventEntity[]> {
    const res = await fetch(EVENTS_API);
    if (!res.ok) {
      throw new Error(`Failed to load events (HTTP ${res.status})`);
    }
    return res.json();
  }

  /**
   * 触发一次服务端同步：Route API 在 Worker 内爬取 malaysia.travel 官网并 upsert/清理 D1
   * （浏览器端无法直连官网：无 CORS 且需 XHR 请求头，故爬虫只能在服务端执行）。
   */
  async syncFromWeb(): Promise<EventSyncStats> {
    const res = await fetch(`${EVENTS_API}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...sessionAuthHeaders(),
      },
      body: "{}",
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(
        detail?.message ?? `Failed to sync events from web (HTTP ${res.status})`
      );
    }
    return res.json();
  }

  /** 清空全部活动数据（DELETE Route API，Admin Panel 清空入口，管理员会话），返回删除条数 */
  async clearAll(): Promise<number> {
    const res = await fetch(EVENTS_API, {
      method: "DELETE",
      headers: sessionAuthHeaders(),
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      throw new Error(
        detail?.message ??
          detail?.error ??
          `Failed to clear events (HTTP ${res.status})`
      );
    }
    const data = (await res.json()) as { cleared?: number };
    return data.cleared ?? 0;
  }
}

export const remoteEventRepository = new RemoteEventRepository();
