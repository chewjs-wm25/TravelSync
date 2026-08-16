/**
 * WikimediaGeosearchApi — 模块 03 Wikimedia Commons Geosearch 图片外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Wikimedia Commons MediaWiki API 交流，按经纬度坐标搜索地点图片；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 官方文档：
 *   - MediaWiki API: https://www.mediawiki.org/wiki/API:Main_page
 *   - Geosearch:     https://www.mediawiki.org/wiki/Extension:GeoData
 *   - 图片信息:      prop=imageinfo（iiprop=url / iiurlwidth 缩略图）
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Wikimedia Commons 公开 API 完全免费、无需 API key；
 *   - CORS：MediaWiki API 支持 origin=* 参数，浏览器端可直连（前端实现原则）；
 *   - 热链：返回 upload.wikimedia.org 缩略图 URL（thumburl），可直接供 <img> 使用；
 *   - 匿名配额：约 500 请求/5 分钟（浏览器共享出口 IP），上层已有调用控制。
 *
 * 返回语义（供上层决定是否缓存）：
 *   - 返回图片 URL：查询到图；
 *   - 返回 null：请求成功但确定无图（可安全视为无图）；
 *   - 抛出 Error：请求失败（网络错误 / HTTP 非 2xx / 响应异常），属瞬时状态，
 *     上层不得缓存"无图"结论，应允许下次重试。
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 MediaWiki 返回结构）
// ---------------------------------------------------------------------------

/** MediaWiki imageinfo 条目（本客户端仅用到缩略图/原图 URL） */
interface ImageInfoDto {
  /** iiurlwidth 请求的缩略图 URL（可直接热链） */
  thumburl?: string;
  /** 原图 URL（thumburl 缺失时的兜底） */
  url?: string;
}

/** MediaWiki query 响应中的单个页面（本客户端仅用到 imageinfo） */
interface MediaWikiPageDto {
  /** 文件页标题（如 "File:Kampung Agong.jpg"），本客户端不直接使用 */
  title?: string;
  /** prop=imageinfo 的图片信息数组 */
  imageinfo?: ImageInfoDto[];
}

/** MediaWiki query 响应结构（仅声明本客户端用到的字段） */
interface MediaWikiQueryResponse {
  query?: {
    /** pages 键为 page id，值为页面对象 */
    pages?: Record<string, MediaWikiPageDto>;
  };
  error?: { code?: string; info?: string };
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class WikimediaGeosearchApi {
  /** Wikimedia Commons MediaWiki API 端点 */
  private readonly commonsBaseUrl = "https://commons.wikimedia.org/w/api.php";

  /**
   * 按经纬度坐标在 Wikimedia Commons 搜索地点图片，取第一个有图片的页面缩略图。
   * 返回图片 URL；请求成功但无结果返回 null；请求失败抛出 Error。
   * radiusMeters 由调用方按需指定（Recommended Places 统一传 5000m，
   * 因坐标可能为 Nominatim 降级命中的区域中心；默认 1000m 仅作兜底）。
   */
  async findImageByCoords(params: {
    lat: number;
    lon: number;
    /** 搜索半径（米），默认 1000 */
    radiusMeters?: number;
  }): Promise<string | null> {
    const { lat, lon } = params;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null; // 坐标不合法，视为无图
    }
    const radius = params.radiusMeters ?? 1000;

    const url = new URL(this.commonsBaseUrl);
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "geosearch");
    url.searchParams.set("ggscoord", `${lat}|${lon}`);
    url.searchParams.set("ggsradius", String(radius));
    url.searchParams.set("ggslimit", "10");
    // 仅搜索 File 命名空间（ns=6）：不带此参数时 geosearch 会优先返回
    // 无图片的非文件页（无 imageinfo，取图恒为空）
    url.searchParams.set("ggsnamespace", "6");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url");
    url.searchParams.set("iiurlwidth", "800");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const pages = await this.requestPages(url.toString());
    return this.firstImageUrl(pages);
  }

  /** 从 MediaWiki query 响应解析 pages 映射（请求失败时抛出） */
  private async requestPages(
    url: string
  ): Promise<Record<string, MediaWikiPageDto>> {
    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new Error(
        `Wikimedia Commons request failed (network error): ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      // 429 限流 / 4xx / 5xx 均为瞬时失败：抛出，由上层决定不缓存"无图"
      throw new Error(
        `Wikimedia Commons request failed: HTTP ${res.status} ${res.statusText}`
      );
    }

    let data: MediaWikiQueryResponse;
    try {
      data = (await res.json()) as MediaWikiQueryResponse;
    } catch {
      throw new Error("Wikimedia Commons response parse failed");
    }

    if (data.error) {
      throw new Error(
        `Wikimedia Commons API error: ${data.error.code ?? ""} ${data.error.info ?? ""}`
      );
    }

    return data.query?.pages ?? {};
  }

  /** 取 pages 中第一个有图片 URL 的页面（优先缩略图，其次原图；无则 null） */
  private firstImageUrl(
    pages: Record<string, MediaWikiPageDto>
  ): string | null {
    for (const page of Object.values(pages)) {
      const image = page.imageinfo?.[0];
      const imageUrl = image?.thumburl ?? image?.url;
      if (imageUrl && /^https?:\/\//i.test(imageUrl)) return imageUrl;
    }
    return null;
  }
}

export const wikimediaGeosearchApi = new WikimediaGeosearchApi();
