/**
 * WikipediaImageApi — 模块 03 Wikipedia 图片查询外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Wikipedia API（各语言 wikipedia.org）交流，按地点语义查询一张图片；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 官方文档：
 *   - MediaWiki API: https://www.mediawiki.org/wiki/API:Main_page
 *   - 条目配图:  prop=pageimages（Wikipedia 条目首图）
 *   - 条目搜索:  generator=search（普通条目命名空间，取条目首图）
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Wikipedia 公开 API 完全免费、无需 API key；
 *   - CORS：MediaWiki API 支持 origin=* 参数，浏览器端可直连（前端实现原则）；
 *   - 热链：返回 upload.wikimedia.org 缩略图 URL（thumbnail.source），可直接供 <img> 使用；
 *   - 匿名配额：约 500 请求/5 分钟（浏览器共享出口 IP），上层已有多层缓存保护。
 *
 * 查询链（由 findImage 编排，命中即停）：
 *   1. 条目配图：Geoapify 返回的 wikipedia 条目名（如 "en:Malaysia Heritage Studios"）
 *      → 取对应语言 Wikipedia 条目的首图（prop=pageimages）；
 *   2. 条目搜索：按 "地点名 Malaysia" 在英文 Wikipedia 搜索条目（generator=search）
 *      → 取第一个有条目首图的条目配图。
 *
 * 返回语义（供上层决定是否缓存）：
 *   - 返回图片 URL：查询到图；
 *   - 返回 null：所有子查询均请求成功但确定无图（可安全缓存为无图）；
 *   - 抛出 Error：至少一个子查询请求失败（网络错误 / HTTP 非 2xx / 响应异常），
 *     属瞬时状态，上层不得缓存"无图"结论，应允许下次重试。
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 MediaWiki 返回结构）
// ---------------------------------------------------------------------------

/** MediaWiki query 响应中的单个页面（本客户端仅用到标题与缩略图） */
interface MediaWikiPageDto {
  title?: string;
  /** prop=pageimages 的缩略图字段 */
  thumbnail?: { source?: string };
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

export class WikipediaImageApi {
  /** 各语言 Wikipedia API 端点模板（{lang} 为语言代码，如 en / ms） */
  private readonly wikipediaBaseUrl =
    "https://{lang}.wikipedia.org/w/api.php";

  /**
   * 地点图片查询链（条目配图 → 条目搜索），命中即停。
   * 子查询失败（瞬时）不立即中止：继续下一级，但最终无图时抛错
   * （由上层决定不缓存"无图"，允许下次重试）。
   */
  async findImage(params: {
    /** Geoapify wiki_and_media.wikipedia（如 "en:Malaysia Heritage Studios"） */
    wikipediaEntry?: string | null;
    /** 地点名称（条目搜索兜底用，如 "Malaysia Heritage Studios"） */
    placeName: string;
  }): Promise<string | null> {
    let anyFailure = false;

    const attempts: Array<() => Promise<string | null>> = [];
    if (params.wikipediaEntry) {
      attempts.push(() => this.getArticleImage(params.wikipediaEntry as string));
    }
    attempts.push(() => this.searchArticleImage(`${params.placeName} Malaysia`));

    for (const attempt of attempts) {
      try {
        const image = await attempt();
        if (image) return image;
      } catch {
        // 瞬时失败：继续下一级；全部失败且无图时在下方统一抛出
        anyFailure = true;
      }
    }

    if (anyFailure) {
      throw new Error(
        "Wikipedia image query failed (transient failure, retry later)"
      );
    }
    return null;
  }

  /**
   * 按 Wikipedia 条目名取条目首图（prop=pageimages）。
   * 条目名格式：Geoapify 返回的 "en:Malaysia Heritage Studios"（语言前缀:条目名）；
   * 无语言前缀时默认英文维基；非语言前缀（如命名空间）也按英文处理。
   * 返回 null = 请求成功但条目无可用首图。
   */
  async getArticleImage(wikipediaEntry: string): Promise<string | null> {
    const entry = wikipediaEntry.trim();
    if (!entry) return null;
    const { lang, title } = this.parseWikipediaEntry(entry);

    const url = new URL(this.wikipediaBaseUrl.replace("{lang}", lang));
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", title);
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", "800");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const pages = await this.requestPages(url.toString());
    return this.firstThumbnail(pages);
  }

  /**
   * 在 Wikipedia 搜索条目并取第一个有条目首图的条目配图。
   * 搜索范围：英文维基普通条目命名空间（gsrnamespace=0），关键词默认
   * "地点名 Malaysia"。返回 null = 请求成功但确定无可用首图。
   */
  async searchArticleImage(keyword: string): Promise<string | null> {
    const trimmed = keyword.trim();
    if (!trimmed) return null;

    const url = new URL(this.wikipediaBaseUrl.replace("{lang}", "en"));
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", trimmed);
    url.searchParams.set("gsrnamespace", "0"); // 普通条目命名空间
    url.searchParams.set("gsrlimit", "5");
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", "800");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const pages = await this.requestPages(url.toString());
    return this.firstThumbnail(pages);
  }

  /** 解析 Geoapify wikipedia 条目名（"en:Malaysia Heritage Studios" → { en, "Malaysia Heritage Studios" }） */
  private parseWikipediaEntry(entry: string): {
    lang: string;
    title: string;
  } {
    const colonIndex = entry.indexOf(":");
    if (colonIndex > 0) {
      const prefix = entry.slice(0, colonIndex);
      // 仅当冒号前是语言代码（en / ms / zh / en-gb ...）时按语言处理，
      // 否则（命名空间等）按英文条目名处理
      if (/^[a-z]{2,3}(-[a-z]{2,3})?$/i.test(prefix)) {
        return { lang: prefix.toLowerCase(), title: entry.slice(colonIndex + 1) };
      }
    }
    return { lang: "en", title: entry };
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
        `Wikipedia request failed (network error): ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      // 429 限流 / 4xx / 5xx 均为瞬时失败：抛出，由上层决定不缓存
      throw new Error(
        `Wikipedia request failed: HTTP ${res.status} ${res.statusText}`
      );
    }

    let data: MediaWikiQueryResponse;
    try {
      data = (await res.json()) as MediaWikiQueryResponse;
    } catch {
      throw new Error("Wikipedia response parse failed");
    }

    if (data.error) {
      throw new Error(
        `Wikipedia API error: ${data.error.code ?? ""} ${data.error.info ?? ""}`
      );
    }

    return data.query?.pages ?? {};
  }

  /** 取 pages 中第一个有条目缩略图的页面 URL（无则 null） */
  private firstThumbnail(
    pages: Record<string, MediaWikiPageDto>
  ): string | null {
    for (const page of Object.values(pages)) {
      const thumb = page.thumbnail?.source;
      if (thumb && /^https?:\/\//i.test(thumb)) return thumb;
    }
    return null;
  }
}

export const wikipediaImageApi = new WikipediaImageApi();
