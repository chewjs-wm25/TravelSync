/**
 * GeoapifyGeocodingApi — 模块 03 Geoapify 地理编码外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Geoapify Geocoding API 交流（自动联想 autocomplete / 正向搜索 search）；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 官方文档：
 *   - 自动联想:  https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
 *   - 正向搜索:  https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/
 *
 * 项目约束（见 AGENTS.md）：
 *   - 旅游规划范围仅限马来西亚 → 马来西亚限制由服务端代理强制
 *     （filter=countrycode:my，见 app/api/discovery/geocode/route.ts），本客户端无需携带；
 *   - API 必须免费、无需信用卡 → 使用 Geoapify 免费套餐（3000 credits/天，1 次请求 = 1 credit）。
 *
 * 安全：API key 不暴露前端——本客户端只与本地代理端点 /api/discovery/geocode 通信，
 * 由服务端持有 GEOAPIFY_API_KEY（非 NEXT_PUBLIC）并转发到 Geoapify。
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 Geoapify 返回结构）
// ---------------------------------------------------------------------------

/** Geoapify 地点（Geocoding API 的 feature.properties 精简形态） */
export interface GeoapifyPlaceDto {
  /** 地点唯一标识（Geoapify place_id） */
  placeId: string;
  /** 地点名称（如 "Petronas Twin Towers"） */
  name: string;
  /** 完整格式化地址（如 "Petronas Twin Towers, Kuala Lumpur, Malaysia"） */
  formatted: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country: string;
  countryCode: string;
  /** 结果类型（city / amenity / tourism / street ...） */
  resultType?: string;
  /** 地点分类（如 "tourism.attraction"、"amenity.restaurant"） */
  category?: string;
  /** 匹配置信度 0~1（由 rank.confidence 解析，用于推断品质徽章占位） */
  confidence?: number;
  lat: number;
  lon: number;
}

/** Geoapify GeoJSON 响应结构（仅声明本客户端用到的字段） */
interface GeoapifyGeoJsonResponse {
  features?: Array<{
    properties?: {
      place_id?: string;
      name?: string;
      formatted?: string;
      address_line1?: string;
      address_line2?: string;
      city?: string;
      state?: string;
      country?: string;
      country_code?: string;
      result_type?: string;
      category?: string;
      rank?: { confidence?: number };
      lat?: number;
      lon?: number;
    };
  }>;
  error?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class GeoapifyGeocodingApi {
  /** 本地代理端点（服务端持有 GEOAPIFY_API_KEY 并转发到 Geoapify，密钥不暴露前端） */
  private readonly proxyEndpoint = "/api/discovery/geocode";

  /**
   * 自动联想（地址/地点自动补全）：输入部分文字即返回候选地点。
   * 用于搜索框输入联想下拉。
   */
  async autocompletePlaces(text: string, limit = 6): Promise<GeoapifyPlaceDto[]> {
    return this.request("autocomplete", text, limit);
  }

  /**
   * 正向搜索（forward geocoding）：按完整查询文本搜索地点。
   * 用于搜索栏提交后的真实 POI 搜索。
   */
  async searchPlaces(text: string, limit = 5): Promise<GeoapifyPlaceDto[]> {
    return this.request("search", text, limit);
  }

  private async request(
    endpoint: "autocomplete" | "search",
    text: string,
    limit: number
  ): Promise<GeoapifyPlaceDto[]> {
    const query = new URLSearchParams({
      type: endpoint,
      text,
      limit: String(limit),
    });

    let res: Response;
    try {
      res = await fetch(`${this.proxyEndpoint}?${query.toString()}`);
    } catch (err) {
      throw new Error(
        `Geoapify ${endpoint} request failed (network error): ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      // 上游错误（含 500 密钥未配置 / 502 上游故障）均视为瞬时失败，由上层决定不缓存
      throw new Error(
        `Geoapify ${endpoint} request failed: HTTP ${res.status} ${res.statusText}`
      );
    }

    const data = (await res.json()) as GeoapifyGeoJsonResponse;
    if (data.error) {
      throw new Error(`Geoapify ${endpoint} error: ${data.error}`);
    }

    return (data.features ?? [])
      .map((feature) => feature.properties)
      .filter(
        (p): p is NonNullable<typeof p> & { place_id: string; lat: number; lon: number } =>
          Boolean(p && p.place_id && typeof p.lat === "number" && typeof p.lon === "number")
      )
      .map((p) => ({
        placeId: p.place_id,
        name: p.name ?? p.formatted ?? "Unnamed place",
        formatted: p.formatted ?? "",
        addressLine1: p.address_line1,
        addressLine2: p.address_line2,
        city: p.city,
        state: p.state,
        country: p.country ?? "",
        countryCode: p.country_code ?? "",
        resultType: p.result_type,
        category: p.category,
        confidence: p.rank?.confidence,
        lat: p.lat,
        lon: p.lon,
      }));
  }
}

export const geoapifyGeocodingApi = new GeoapifyGeocodingApi();
