/**
 * WikivoyageApi — 模块 03 灵感集锦外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Wikivoyage（en.wikivoyage.org）MediaWiki API 交流，为灵感集锦
 *     提供：马来西亚目的地分类树遍历（主题自动发现）、文章批量查询（导语/
 *     图片/坐标/Star 徽章）、附近目的地搜索；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 官方文档：
 *   - MediaWiki API:   https://www.mediawiki.org/wiki/API:Main_page
 *   - Categorymembers: https://www.mediawiki.org/wiki/API:Categorymembers
 *   - Extracts:        https://www.mediawiki.org/wiki/Extension:TextExtracts
 *   - PageImages:      https://www.mediawiki.org/wiki/Extension:PageImages
 *   - Pageprops:       https://www.mediawiki.org/wiki/API:Pageprops
 *   - GeoData/Geosearch: https://www.mediawiki.org/wiki/Extension:GeoData
 *   - 匿名限流:        https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Wikivoyage 公开 API 完全免费、无需 API key；
 *   - CORS：MediaWiki API 支持 origin=* 参数，浏览器端可直连（前端实现原则）；
 *   - 热链：返回 upload.wikimedia.org 缩略图 URL，可直接供 <img> 使用；
 *   - 匿名请求有限流 → 上层（BL）负责缓存与失败重试，本客户端保持请求
 *     合并（批量 titles）与最小化。
 *
 * 范围限制（本客户端内强制）：
 *   - geosearch 入口坐标须位于马来西亚 bbox 内（MalaysiaBounds），结果逐条
 *     按坐标校验（圆形搜索在边境附近可能越界，如柔佛南部可触及新加坡）；
 *   - 单请求 titles ≤ 50（MediaWiki 限制），本客户端内部分块。
 *
 * 返回语义（供上层决定是否缓存）：
 *   - 空数组：请求成功但无结果（确定无结果，可安全视为"无数据"）；
 *   - 抛出 Error：请求失败（网络错误 / HTTP 非 2xx / API error / 解析失败），
 *     属瞬时状态，上层不得缓存失败结论，应允许下次重试。
 */

import { isInMalaysiaBounds } from "./MalaysiaBounds";

/** Wikivoyage MediaWiki API 端点 */
const WIKIVOYAGE_API_BASE = "https://en.wikivoyage.org/w/api.php";

/** 单请求 titles 上限（MediaWiki 限制，本客户端内部分块） */
const MAX_TITLES_PER_REQUEST = 50;

/** 附近目的地搜索半径钳制范围（米） */
const MIN_NEARBY_RADIUS_METERS = 100;
const MAX_NEARBY_RADIUS_METERS = 50000;

/**
 * 匿名限流（HTTP 429）自动重试：Wikivoyage 对匿名请求有突发限制，
 * 本客户端在 429 时按退避等待后重试（其余 4xx/5xx 不重试，直接抛出）。
 */
const RATE_LIMIT_MAX_RETRIES = 2;
/** 各次重试前的退避等待（毫秒，按重试序号取用） */
const RATE_LIMIT_BACKOFF_MS = [1000, 2000];

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 MediaWiki 返回结构）
// ---------------------------------------------------------------------------

/** MediaWiki 缩略图条目（仅用到 source/宽高） */
interface MediaWikiImageDto {
  source?: string;
  width?: number;
  height?: number;
}

/** MediaWiki query 响应中的单个文章页面（仅声明用到的字段） */
export interface WikivoyagePageDto {
  pageid?: number;
  title: string;
  /** 标题不存在（批量 titles 查询中缺失的文章） */
  missing?: boolean;
  /** TextExtracts 导语（exintro + explaintext + exsentences=2） */
  extract?: string;
  /** PageImages 缩略图 */
  thumbnail?: MediaWikiImageDto;
  /** 页面属性（含 wikibase-badge-Q17559452 = Wikivoyage Star 条目徽章） */
  pageprops?: Record<string, string>;
  /** GeoData 页面坐标（目的地文章通常存在） */
  coordinates?: Array<{ lat: number; lon: number }>;
}

/** list=geosearch 结果条目（自带距离与坐标） */
interface GeosearchEntryDto {
  pageid?: number;
  ns?: number;
  title?: string;
  lat?: number;
  lon?: number;
  /** 距搜索点距离（米） */
  dist?: number;
}

/** 附近目的地（geosearch 距离 + 图片/徽章合并后的形态） */
export interface WikivoyageNearbyDto {
  title: string;
  /** 距中心点距离（米） */
  distanceMeters: number;
  thumbnail?: MediaWikiImageDto;
  pageprops?: Record<string, string>;
}

/** MediaWiki query 响应结构（仅声明用到的字段） */
interface MediaWikiQueryResponse {
  query?: {
    pages?: Record<string, WikivoyagePageDto>;
    categorymembers?: Array<{ title?: string }>;
    geosearch?: GeosearchEntryDto[];
  };
  error?: { code?: string; info?: string };
}

// ---------------------------------------------------------------------------
// 外部链接构造
// ---------------------------------------------------------------------------

/**
 * Wikivoyage 文章外部链接（https://en.wikivoyage.org/wiki/{title}）。
 * 标题空格转下划线（MediaWiki 约定），URL 段编码。
 */
export function wikivoyageArticleUrl(title: string): string {
  return `https://en.wikivoyage.org/wiki/${encodeURIComponent(
    title.trim().replace(/ /g, "_")
  )}`;
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class WikivoyageApi {
  /**
   * 分类成员标题列表（主题池构建用）。
   * types："page"（普通文章）| "subcat"（子分类）| "subcat|page"（两者）；
   * 返回完整标题（子分类带 "Category:" 前缀，文章不带）。请求失败抛出 Error。
   */
  async listCategoryMembers(
    categoryTitle: string,
    types: "page" | "subcat" | "subcat|page",
    limit = 500
  ): Promise<string[]> {
    const url = new URL(WIKIVOYAGE_API_BASE);
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "categorymembers");
    url.searchParams.set("cmtitle", categoryTitle);
    url.searchParams.set("cmtype", types);
    url.searchParams.set("cmlimit", String(limit));
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const data = await this.requestJson(url.toString());
    const members = data.query?.categorymembers ?? [];
    return members.map((member) => member.title).filter((t): t is string => !!t);
  }

  /**
   * 批量取文章详情（导语/缩略图/页面属性/坐标）。
   * titles 去空、去重；内部按 50 标题/请求分块；missing 页过滤。
   * 请求失败抛出 Error。
   */
  async getPagesByTitles(
    titles: string[],
    thumbWidth = 480
  ): Promise<WikivoyagePageDto[]> {
    const unique = Array.from(
      new Set(titles.map((title) => title.trim()).filter((t) => t.length > 0))
    );
    const results: WikivoyagePageDto[] = [];
    for (let i = 0; i < unique.length; i += MAX_TITLES_PER_REQUEST) {
      const chunk = unique.slice(i, i + MAX_TITLES_PER_REQUEST);
      const url = new URL(WIKIVOYAGE_API_BASE);
      url.searchParams.set("action", "query");
      url.searchParams.set("titles", chunk.join("|"));
      this.setPageQueryParams(url, thumbWidth);
      const data = await this.requestJson(url.toString());
      const pages = Object.values(data.query?.pages ?? {});
      results.push(...pages.filter((page) => !page.missing));
    }
    return results;
  }

  /**
   * 分类成员聚合详情：generator=categorymembers（1 请求拿成员 + 导语 +
   * 图 + 坐标 + Star 徽章）。missing 页过滤；请求失败抛出 Error。
   */
  async getCategoryPages(
    categoryTitle: string,
    limit = 100,
    thumbWidth = 480
  ): Promise<WikivoyagePageDto[]> {
    const url = new URL(WIKIVOYAGE_API_BASE);
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "categorymembers");
    url.searchParams.set("gcmtitle", categoryTitle);
    url.searchParams.set("gcmtype", "page");
    url.searchParams.set("gcmlimit", String(limit));
    this.setPageQueryParams(url, thumbWidth);
    const data = await this.requestJson(url.toString());
    return Object.values(data.query?.pages ?? {}).filter((p) => !p.missing);
  }

  /**
   * 附近目的地搜索（两段式）：
   *   1. list=geosearch（ns=0 仅主命名空间文章，按距离排序，自带坐标与
   *      距离——generator 模式无 dist 字段，故用 list 模式）；
   *   2. 逐条马来西亚 bbox 校验（圆形搜索边境越界兜底）；
   *   3. 批量 titles 合并缩略图/Star 徽章。
   * 入口坐标不在马来西亚 bbox 内 → 不请求，返回空数组。
   * 请求失败抛出 Error。
   */
  async searchNearbyDestinations(
    lat: number,
    lon: number,
    radiusMeters = 10000
  ): Promise<WikivoyageNearbyDto[]> {
    if (!isInMalaysiaBounds(lat, lon)) return [];
    const radius = Math.min(
      Math.max(radiusMeters, MIN_NEARBY_RADIUS_METERS),
      MAX_NEARBY_RADIUS_METERS
    );

    // 1. list=geosearch（按距离排序 + 自带坐标/距离）
    const listUrl = new URL(WIKIVOYAGE_API_BASE);
    listUrl.searchParams.set("action", "query");
    listUrl.searchParams.set("list", "geosearch");
    listUrl.searchParams.set("gscoord", `${lat}|${lon}`);
    listUrl.searchParams.set("gsradius", String(radius));
    listUrl.searchParams.set("gslimit", "10");
    listUrl.searchParams.set("gsnamespace", "0");
    listUrl.searchParams.set("format", "json");
    listUrl.searchParams.set("origin", "*");
    const listData = await this.requestJson(listUrl.toString());

    // 2. 逐条马来西亚 bbox 校验（标题/距离/坐标齐全且坐标在 bbox 内）
    const entries = (listData.query?.geosearch ?? []).filter((entry) => {
      if (!entry.title || typeof entry.dist !== "number") return false;
      if (
        typeof entry.lat !== "number" ||
        typeof entry.lon !== "number" ||
        !isInMalaysiaBounds(entry.lat, entry.lon)
      ) {
        return false;
      }
      return true;
    });
    if (entries.length === 0) return [];

    // 3. 批量合并缩略图/Star 徽章
    const pages = await this.getPagesByTitles(
      entries.map((entry) => entry.title as string)
    );
    const pageMap = new Map(pages.map((page) => [page.title, page]));
    return entries.map((entry) => {
      const page = pageMap.get(entry.title as string);
      return {
        title: entry.title as string,
        distanceMeters: entry.dist as number,
        thumbnail: page?.thumbnail,
        pageprops: page?.pageprops,
      };
    });
  }

  /** 设置文章详情查询的公共参数（prop 组合 + 导语 + 缩略图 + 重定向跟随） */
  private setPageQueryParams(url: URL, thumbWidth: number): void {
    url.searchParams.set("prop", "extracts|pageimages|pageprops|coordinates");
    url.searchParams.set("exintro", "1");
    url.searchParams.set("explaintext", "1");
    url.searchParams.set("exsentences", "2");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", String(thumbWidth));
    url.searchParams.set("redirects", "1");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
  }

  /**
   * 发起请求并解析 JSON（网络/HTTP/API error/解析失败均抛出 Error）。
   * HTTP 429（匿名限流）按退避自动重试至多 RATE_LIMIT_MAX_RETRIES 次，
   * 仍失败才抛出（保持"失败不缓存、下次重试"的上层语义）。
   */
  private async requestJson(url: string): Promise<MediaWikiQueryResponse> {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await fetch(url);
      } catch (err) {
        throw new Error(
          `Wikivoyage request failed (network error): ${(err as Error).message}`
        );
      }

      // 429 限流：退避后重试（其余 HTTP 非 2xx 不重试，直接抛出）
      if (res.status === 429 && attempt < RATE_LIMIT_MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, RATE_LIMIT_BACKOFF_MS[attempt] ?? 2000)
        );
        continue;
      }

      if (!res.ok) {
        throw new Error(
          `Wikivoyage request failed: HTTP ${res.status} ${res.statusText}`
        );
      }

      let data: MediaWikiQueryResponse;
      try {
        data = (await res.json()) as MediaWikiQueryResponse;
      } catch {
        throw new Error("Wikivoyage response parse failed");
      }

      if (data.error) {
        throw new Error(
          `Wikivoyage API error: ${data.error.code ?? ""} ${data.error.info ?? ""}`
        );
      }

      return data;
    }
  }
}

export const wikivoyageApi = new WikivoyageApi();
