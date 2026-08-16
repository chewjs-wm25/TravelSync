/**
 * PlaceDetailsApi — 模块 03 Geoapify Place Details 外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Geoapify Place Details API 交流（按 place_id 查询地点详情）；
 *   - 本客户端只提取 wiki_and_media 字段（image / wikipedia / wikimedia_commons），
 *     供地点图片兜底链使用，不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 官方文档：
 *   - Place Details API: https://apidocs.geoapify.com/docs/place-details/
 *   - id 参数直接使用 Geocoding API / Places API 返回的 place_id。
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Geoapify 免费套餐（3000 请求/天，
 *     默认 details feature 每次 1 credit）；
 *   - 安全：API key 不暴露前端——本客户端只与本地代理端点
 *     /api/discovery/place-details 通信，由服务端持有 GEOAPIFY_API_KEY
 *     （非 NEXT_PUBLIC）并转发到 Geoapify。
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 Geoapify Place Details 返回结构）
// ---------------------------------------------------------------------------

/** wiki_and_media：OSM 维基数据 + 媒体字段（image 由 OSM image 标签提供，可能缺失） */
export interface WikiAndMediaDto {
  /** Wikidata 实体 id（如 "Q83063"） */
  wikidata?: string;
  /** 维基百科条目（如 "en:Petronas Towers"） */
  wikipedia?: string;
  /** 维基共享资源分类（如 "Category:Petronas Towers"） */
  wikimedia_commons?: string;
  /**
   * 地点图片 URL（OSM image 标签，可能指向维基共享资源或其他托管，
   * 实测常缺失或为外部链接，故需 Unsplash 兜底）。
   */
  image?: string;
  image_thumb?: string;
}

/**
 * Place Details 中供地点图片兜底链使用的 wiki_and_media 字段。
 * 语义：请求成功时为确定值（字段缺失 → null）；请求失败时抛错。
 */
export interface WikiAndMediaResult {
  /** 地点图片 URL（OSM image 标签，可能缺失） */
  image: string | null;
  /** 维基百科条目（如 "en:Petronas Towers"） */
  wikipedia: string | null;
  /** 维基共享资源分类（如 "Category:Petronas Towers"） */
  wikimedia_commons: string | null;
}

/** Geoapify Place Details 响应结构（仅声明本客户端用到的字段） */
interface PlaceDetailsGeoJsonResponse {
  features?: Array<{
    properties?: {
      feature_type?: string;
      wiki_and_media?: WikiAndMediaDto;
    };
  }>;
  error?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class GeoapifyPlaceDetailsApi {
  /** 本地代理端点（服务端持有 GEOAPIFY_API_KEY 并转发到 Geoapify，密钥不暴露前端） */
  private readonly proxyEndpoint = "/api/discovery/place-details";

  /**
   * 按 place_id 获取地点 wiki_and_media 字段（image / wikipedia / wikimedia_commons）。
   * 一次请求拿全三个字段，供图片兜底链使用（Commons 分类/条目查询的精确入口）。
   * 返回语义（供上层决定是否缓存）：
   *   - 返回 WikiAndMediaResult：请求成功，字段缺失时为 null（可安全缓存为无图）；
   *   - 抛出 Error：请求失败（网络错误 / HTTP 非 2xx 含 429 限流 / 响应异常），
   *     属瞬时状态，上层不得缓存"无图"结论，应允许下次重试。
   */
  async getWikiAndMedia(placeId: string): Promise<WikiAndMediaResult> {
    if (!placeId.trim()) {
      return { image: null, wikipedia: null, wikimedia_commons: null };
    }

    const query = new URLSearchParams({ id: placeId.trim() });

    let res: Response;
    try {
      res = await fetch(`${this.proxyEndpoint}?${query.toString()}`);
    } catch (err) {
      throw new Error(
        `Geoapify place-details request failed (network error): ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      // 上游错误（含 500 密钥未配置 / 502 上游故障）均视为瞬时失败，由上层决定不缓存
      throw new Error(
        `Geoapify place-details request failed: HTTP ${res.status} ${res.statusText}`
      );
    }

    let data: PlaceDetailsGeoJsonResponse;
    try {
      data = (await res.json()) as PlaceDetailsGeoJsonResponse;
    } catch {
      throw new Error("Geoapify place-details response parse failed");
    }

    if (data.error || data.message) {
      throw new Error(
        `Geoapify place-details error: ${data.error ?? data.message}`
      );
    }

    const wikiAndMedia = data.features?.[0]?.properties?.wiki_and_media;
    return {
      image:
        wikiAndMedia?.image ?? wikiAndMedia?.image_thumb ?? null,
      wikipedia: this.nonEmptyString(wikiAndMedia?.wikipedia),
      wikimedia_commons: this.nonEmptyString(
        wikiAndMedia?.wikimedia_commons
      ),
    };
  }

  /** 规范化可选字符串：空白/空串 → null */
  private nonEmptyString(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}

export const geoapifyPlaceDetailsApi = new GeoapifyPlaceDetailsApi();
