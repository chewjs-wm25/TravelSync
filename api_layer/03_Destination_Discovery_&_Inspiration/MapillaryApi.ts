/**
 * MapillaryApi — 模块 03 Mapillary 外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与本地代理端点 /api/discovery/mapillary 交流（按经纬度搜索图片 id、
 *     按 id 获取图片 URL）；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 官方文档：https://www.mapillary.com/developer/api-documentation/
 *   - 图片搜索: GET /images?bbox=...&fields=id（代理端点 action=search）
 *   - 图片详情: GET /{image_id}?fields=thumb_1024_url（代理端点 action=image）
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Mapillary 免费注册获取 access token；
 *   - 安全：token 不暴露前端——本客户端只与本地代理端点通信，
 *     由服务端持有 MAPILLARY_ACCESS_TOKEN（非 NEXT_PUBLIC）并转发到
 *     graph.mapillary.com（见 app/api/discovery/mapillary/route.ts）。
 *
 * 过滤器（范围限制在马来西亚，双层）：
 *   - 客户端（本文件）：findImageId 入口校验坐标必须位于马来西亚 bbox 内
 *     （见 MalaysiaBounds），不在 → 直接返回 null，不发起请求；
 *   - 服务端（app/api/discovery/mapillary/route.ts）：代理端点强校验 bbox
 *     完全落在马来西亚 bbox 内，否则 400 拒绝——前端无法绕过。
 *   注：Mapillary v4 免费 API 的图片搜索仅返回 id（无内容分类字段），
 *   无法按"地点/景点"语义过滤；以地点周边 ±0.002° 紧范围 bbox 保证
 *   返回图片属于该地点（街景图作为兜底来源）。
 *
 * URL 时效性说明（重要）：
 *   - Mapillary 返回的 thumb_1024_url 是带签名的临时 URL，会过期，
 *     因此本客户端只返回图片 id（findImageId），或按 id 换取当前有效的 URL
 *     （getImageUrl）；上层持久化缓存必须缓存 id 而非 URL。
 *
 * 返回语义（供上层决定是否缓存）：
 *   - findImageId 返回 string：查询到图片 id；返回 null：请求成功但该范围内
 *     确定无图（可安全缓存为无图）；
 *   - getImageUrl 返回 string：当前有效的图片 URL；抛出 Error：请求失败
 *     （网络错误 / HTTP 非 2xx / 响应异常），属瞬时状态，上层不得缓存"无图"。
 */

import { isInMalaysiaBounds } from "./MalaysiaBounds";

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 Mapillary 返回结构）
// ---------------------------------------------------------------------------

/** GET /images 搜索响应（仅声明本客户端用到的字段） */
interface MapillaryImageSearchResponse {
  data?: Array<{ id?: string }>;
  error?: { message?: string };
}

/** GET /{image_id} 图片详情响应（仅声明本客户端用到的字段） */
interface MapillaryImageDetailResponse {
  id?: string;
  /** 带签名的临时缩略图 URL（会过期，不可持久化缓存） */
  thumb_1024_url?: string;
  error?: { message?: string };
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class MapillaryApi {
  /** 本地代理端点（服务端持有 MAPILLARY_ACCESS_TOKEN 并转发到 Mapillary） */
  private readonly proxyEndpoint = "/api/discovery/mapillary";

  /**
   * 按经纬度搜索地点附近图片，返回图片 id（不含 URL）；确定无图返回 null。
   * 过滤器：入口坐标必须位于马来西亚 bbox 内（不在 → 直接 null，不发请求）；
   * 服务端代理端点另有 bbox 完全落在马来西亚内的强校验（见 Route API）。
   */
  async findImageId(lat: number, lon: number): Promise<string | null> {
    // 范围限制在马来西亚：坐标不在马来西亚 bbox 内 → 视为无图，不发起请求
    if (!isInMalaysiaBounds(lat, lon)) return null;
    // bbox：以地点为中心 ±0.002°（约 ±220m）的小范围，取第一张匹配图片
    const span = 0.002;
    const bbox = `${lon - span},${lat - span},${lon + span},${lat + span}`;

    const data = await this.request<MapillaryImageSearchResponse>(
      new URLSearchParams({ action: "search", bbox })
    );
    const image = data.data?.find((item) => item.id);
    return image?.id ?? null;
  }

  /**
   * 按图片 id 换取当前有效的图片 URL。
   * URL 带签名且有时效，调用方不得持久化缓存（只能缓存 id）。
   */
  async getImageUrl(imageId: string): Promise<string> {
    const trimmed = imageId.trim();
    if (!trimmed) {
      throw new Error("Mapillary image id is required");
    }

    const data = await this.request<MapillaryImageDetailResponse>(
      new URLSearchParams({ action: "image", imageId: trimmed })
    );
    const url = data.thumb_1024_url;
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new Error("Mapillary image response missing thumb_1024_url");
    }
    return url;
  }

  /** 代理请求公共逻辑：网络错误 / 非 2xx / 解析失败均抛错（瞬时，不缓存无图） */
  private async request<T>(query: URLSearchParams): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.proxyEndpoint}?${query.toString()}`);
    } catch (err) {
      throw new Error(
        `Mapillary request failed (network error): ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      // 上游错误（含 500 token 未配置 / 502 上游故障）均视为瞬时失败，由上层决定不缓存
      throw new Error(
        `Mapillary request failed: HTTP ${res.status} ${res.statusText}`
      );
    }

    let data: T & { error?: { message?: string } };
    try {
      data = (await res.json()) as T & { error?: { message?: string } };
    } catch {
      throw new Error("Mapillary response parse failed");
    }

    if (data.error?.message) {
      throw new Error(`Mapillary API error: ${data.error.message}`);
    }

    return data;
  }
}

export const mapillaryApi = new MapillaryApi();
