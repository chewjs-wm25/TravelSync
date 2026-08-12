/**
 * PlaceDetailsApi — 模块 03 Geoapify Place Details 外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Geoapify Place Details API 交流（按 place_id 查询地点详情）；
 *   - 本客户端只提取地点图片（wiki_and_media.image），不包含业务规则、
 *     不触碰本地持久化、不编排跨模块流程。
 *
 * 官方文档：
 *   - Place Details API: https://apidocs.geoapify.com/docs/place-details/
 *   - id 参数直接使用 Geocoding API / Places API 返回的 place_id。
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Geoapify 免费套餐（3000 请求/天，
 *     默认 details feature 每次 1 credit），认证方式为 query 参数 apiKey；
 *   - 图片获取在前端完成（浏览器端直连，不经过后端）。
 *
 * 密钥来源：.env 中的 NEXT_PUBLIC_GEOAPIFY_API_KEY（与 Geocoding API 同 key）。
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
  private readonly baseUrl = "https://api.geoapify.com/v2/place-details";

  /** API key：.env → NEXT_PUBLIC_GEOAPIFY_API_KEY（与 Geocoding API 共用） */
  private get apiKey(): string {
    const key = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!key) {
      throw new Error(
        "Missing NEXT_PUBLIC_GEOAPIFY_API_KEY. Add it to .env to enable Geoapify place details."
      );
    }
    return key;
  }

  /**
   * 按 place_id 获取地点的免费图片（wiki_and_media.image）。
   * 任何失败（网络错误 / HTTP 非 2xx / API 错误 / 无图片字段 / 非 http(s) URL）
   * 均静默降级返回 null，由上层 Unsplash 兜底或展示占位图。
   */
  async getWikiMediaImage(placeId: string): Promise<string | null> {
    if (!placeId.trim()) return null;

    const url = new URL(this.baseUrl);
    url.searchParams.set("id", placeId);
    url.searchParams.set("lang", "en");
    url.searchParams.set("apiKey", this.apiKey);

    let res: Response;
    try {
      res = await fetch(url.toString());
    } catch {
      return null; // 网络错误：静默降级
    }

    if (!res.ok) return null; // HTTP 错误（含 429 限流）：静默降级

    let data: PlaceDetailsGeoJsonResponse;
    try {
      data = (await res.json()) as PlaceDetailsGeoJsonResponse;
    } catch {
      return null; // 响应解析失败：静默降级
    }

    if (data.error || data.message) return null;

    const wikiAndMedia = data.features?.[0]?.properties?.wiki_and_media;
    const image = wikiAndMedia?.image ?? wikiAndMedia?.image_thumb;
    return image && /^https?:\/\//i.test(image) ? image : null;
  }
}

export const geoapifyPlaceDetailsApi = new GeoapifyPlaceDetailsApi();
