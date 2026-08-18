/**
 * RemoteEventRepository — 模块 03 节日/活动仓储的远程实现（Data Access Layer, 浏览器端）
 *
 * 职责：以 HTTP 调用 Route API（app/03_Destination_Discovery_&_Inspiration/api/events）实现 EventRepository，
 *       仅做参数序列化与响应解析，不含任何 SQL / 数据库逻辑
 *       （数据库操作由服务端 D1EventRepository 承担）。
 *
 * 授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）：
 *   - upsertAll / clearAll 为危险写操作，携带当前会话凭证
 *     （Authorization: Bearer <token>），服务端要求管理员会话
 *     （未登录 401 / 非 admin 403），失败在此抛出 Error。
 *
 * 依赖方向：浏览器端 BL → 本类 → Route API → D1EventRepository → D1。
 */

import type { EventEntity, EventRepository } from "./EventRepository";
import { sessionAuthHeaders } from "./sessionAuth";

/** Route API 端点（模块 03 节日/活动） */
const EVENTS_API = "03_Destination_Discovery_&_Inspiration/api/events";

export class RemoteEventRepository implements EventRepository {
  async listAll(): Promise<EventEntity[]> {
    const res = await fetch(EVENTS_API);
    if (!res.ok) {
      throw new Error(`Failed to load events (HTTP ${res.status})`);
    }
    return res.json();
  }

  /** 批量 upsert（管理员会话） */
  async upsertAll(items: EventEntity[]): Promise<number> {
    const res = await fetch(EVENTS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...sessionAuthHeaders(),
      },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      throw new Error(`Failed to sync events (HTTP ${res.status})`);
    }
    const data = (await res.json()) as { synced?: number };
    return data.synced ?? 0;
  }

  /** 清空全部活动数据（DELETE Route API，管理员会话），返回删除条数 */
  async clearAll(): Promise<number> {
    const res = await fetch(EVENTS_API, {
      method: "DELETE",
      headers: sessionAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to clear events (HTTP ${res.status})`);
    }
    const data = (await res.json()) as { cleared?: number };
    return data.cleared ?? 0;
  }
}

export const remoteEventRepository = new RemoteEventRepository();
