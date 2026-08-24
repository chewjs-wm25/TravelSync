/**
 * NominatimApi — 模块 03 Nominatim（OpenStreetMap）地理编码外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Nominatim API 交流，按公司地址（Company Address）查询地点的经纬度，
 *     并实现"逗号递减"降级重试与请求限速；
 *   - 不包含业务规则（除查询降级策略外）、不触碰本地持久化、不编排跨模块流程。
 *
 * 官方文档：
 *   - Nominatim Search: https://nominatim.org/release-docs/latest/api/Search/
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Nominatim 公开 API 完全免费、无需 API key；
 *   - CORS：Nominatim 支持跨域，浏览器端可直连（前端实现原则）；
 *   - 旅游范围仅限马来西亚 → 查询固定 countrycodes=my；
 *   - 使用政策：每秒最多 1 次请求 → 限速内聚在本类（调用方无需关心）。
 *
 * 查询策略（"逗号递减"自动降级，由 geocodeAddress 编排）：
 *   OSM 数据库未必收录地址中的每条小路，因此按逗号从左逐段砍掉再试，
 *   直到拿到坐标或只剩最后一段（邮编/州属，countrycodes=my 保证存在）为止：
 *     第 1 次: Persiaran Bertam 8, 13200 Kepala Batas, Pulau Pinang（无收录，失败）
 *     第 2 次: 13200 Kepala Batas, Pulau Pinang（只搜邮编和城市，成功）
 *   降级命中的是区域中心坐标，仍足以供 Wikimedia Geosearch 大半径搜索附近图片。
 *
 * 返回语义（供上层决定是否缓存）：
 *   - 返回 { lat, lon }：查询到坐标（可能经降级，为区域中心坐标）；
 *   - 返回 null：全部降级尝试均请求成功但确定无结果；
 *   - 抛出 Error：某次请求失败（网络错误 / HTTP 非 2xx / 响应异常），属瞬时状态，
 *     上层不应将"无坐标"结论落库，应允许下次重试。
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 Nominatim 返回结构）
// ---------------------------------------------------------------------------

/** Nominatim search 响应中的单个结果（本客户端仅用到 lat / lon） */
interface NominatimResultDto {
  lat?: string;
  lon?: string;
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class NominatimApi {
  /** Nominatim 搜索端点（免费公开服务，无需 API key） */
  private readonly searchUrl = "https://nominatim.openstreetmap.org/search";

  /** Nominatim 使用政策限速：相邻两次请求至少间隔 1 秒 */
  private readonly rateLimitMs = 1000;

  /** 上次发出请求的时间戳（限速依据；0 = 尚未请求过） */
  private lastRequestAt = 0;

  /**
   * 按公司地址（Company Address）在马来西亚范围内查询地点经纬度，
   * 内部执行"逗号递减"降级循环（见类注释）。
   * 返回 { lat, lon }；全部尝试无匹配返回 null；瞬时失败抛出 Error。
   */
  async geocodeAddress(address: string): Promise<{
    lat: number;
    lon: number;
  } | null> {
    const segments = this.splitSegments(address);
    if (segments.length === 0) return null;

    // 逗号递减：从完整地址开始，失败则从左砍掉第一段，直到成功或只剩最后一段
    for (let start = 0; start < segments.length; start++) {
      const query = segments.slice(start).join(", ");
      const coord = await this.search(query);
      if (coord) return coord;
      // 请求成功但空结果 → 继续降级；search 抛错（瞬时失败）立即中止上抛
    }
    return null;
  }

  /** 地址清洗与切段：trim、合并连续空白、按逗号切段并去掉空段 */
  private splitSegments(address: string): string[] {
    const cleaned = address
      .trim()
      .replace(/\s+/g, " ")
      .replace(/,\s*,+/g, ",")
      .replace(/^,|,$/g, "");
    if (!cleaned) return [];
    return cleaned
      .split(",")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);
  }

  /**
   * 单次查询：发送前先按限速策略等待，随后请求 Nominatim 并解析首个结果。
   * 返回 { lat, lon }；请求成功但无匹配返回 null；瞬时失败抛出 Error。
   */
  private async search(query: string): Promise<{
    lat: number;
    lon: number;
  } | null> {
    await this.throttle();

    const url = new URL(this.searchUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("countrycodes", "my"); // 项目约束：仅限马来西亚
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");

    let res: Response;
    try {
      // Nominatim 使用政策要求请求携带描述性 User-Agent（浏览器端会被忽略，
      // 自动使用浏览器 UA；Node/非浏览器环境则使用自定义 UA 避免 403）
      res = await fetch(url.toString(), {
        headers: { "User-Agent": "TravelSync/1.0 (university assignment)" },
      });
    } catch (err) {
      throw new Error(
        `Nominatim request failed (network error): ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      // 429 限流 / 4xx / 5xx 均为瞬时失败：抛出，由上层决定不落库"无坐标"
      throw new Error(
        `Nominatim request failed: HTTP ${res.status} ${res.statusText}`
      );
    }

    let data: NominatimResultDto[];
    try {
      data = (await res.json()) as NominatimResultDto[];
    } catch {
      throw new Error("Nominatim response parse failed");
    }

    const best = data[0];
    if (!best || best.lat == null || best.lon == null) {
      return null; // 请求成功但确定无匹配
    }
    const lat = Number(best.lat);
    const lon = Number(best.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null; // 坐标字段异常，视为无匹配
    }
    return { lat, lon };
  }

  /**
   * 限速：确保相邻两次请求间隔不小于 rateLimitMs。
   * 在请求发出前更新 lastRequestAt（并发调用时第二个调用会等待足够间隔）。
   */
  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    const waitMs = this.rateLimitMs - elapsed;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.lastRequestAt = Date.now();
  }
}

export const nominatimApi = new NominatimApi();
