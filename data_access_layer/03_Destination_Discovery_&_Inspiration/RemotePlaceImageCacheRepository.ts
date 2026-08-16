/**
 * RemotePlaceImageCacheRepository — 模块 03 地点图片缓存仓储的远程实现（Data Access Layer, 浏览器端）
 *
 * 职责：以 HTTP 调用 Route API（app/api/discovery/place-image）实现
 *       PlaceImageCacheRepository，仅做参数序列化与响应解析，
 *       不含任何 KV 读写逻辑（KV 操作由服务端 CloudflareKvPlaceImageCacheRepository 承担）。
 *
 * 值语义（v3，来源引用格式，与 PlaceImageCacheRepository 一致）：
 *   - 缓存条目 PlaceImageCacheEntry（wikimedia url / mapillary imageId / none 确定无图）；
 *   - get 返回 null = 未缓存；{"source":"none"} = 确定无图。
 *
 * 授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）：
 *   - put（写入缓存）为正常用户流程，携带当前会话凭证（登录要求，401 时抛出 Error）；
 *   - clearAll（清空缓存）为危险操作，携带当前会话凭证，服务端要求管理员会话。
 *
 * 依赖方向：浏览器端 BL → 本类 → Route API → CloudflareKvPlaceImageCacheRepository → KV。
 *
 * 失败语义：Route API 不可用（如本地未启动 / 网络错误 / 非 2xx）时抛出 Error，
 *           由 Business Logic 层决定降级（图片缓存不可用时静默跳过，不阻断查询）。
 */

import type {
  PlaceImageCacheEntry,
  PlaceImageCacheRepository,
} from "./PlaceImageCacheRepository";
import { sessionAuthHeaders } from "./sessionAuth";

/** Route API 端点（模块 03 地点图片缓存） */
const PLACE_IMAGE_API = "/api/discovery/place-image";

export class RemotePlaceImageCacheRepository
  implements PlaceImageCacheRepository
{
  /** 读取缓存条目；null = 未缓存；{source:"none"} = 确定无图（公开读） */
  async get(placeId: string): Promise<PlaceImageCacheEntry | null> {
    const trimmed = placeId.trim();
    if (!trimmed) return null;

    const res = await fetch(
      `${PLACE_IMAGE_API}?placeId=${encodeURIComponent(trimmed)}`
    );
    if (!res.ok) {
      throw new Error(`Failed to read place image cache (HTTP ${res.status})`);
    }
    const data = (await res.json()) as { entry?: PlaceImageCacheEntry | null };
    return data.entry ?? null;
  }

  /** 写入缓存条目（登录会话）；空 placeId 为 no-op */
  async put(placeId: string, entry: PlaceImageCacheEntry): Promise<void> {
    const trimmed = placeId.trim();
    if (!trimmed) return;

    const res = await fetch(PLACE_IMAGE_API, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...sessionAuthHeaders(),
      },
      body: JSON.stringify({ placeId: trimmed, entry }),
    });
    if (!res.ok) {
      throw new Error(`Failed to write place image cache (HTTP ${res.status})`);
    }
  }

  /** 清空全部地点图片缓存（DELETE /api/discovery/place-image，管理员会话），返回清除的条目数 */
  async clearAll(): Promise<number> {
    const res = await fetch(PLACE_IMAGE_API, {
      method: "DELETE",
      headers: sessionAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to clear place image cache (HTTP ${res.status})`);
    }
    const data = (await res.json()) as { cleared?: number };
    return data.cleared ?? 0;
  }
}

export const remotePlaceImageCacheRepository =
  new RemotePlaceImageCacheRepository();
