/**
 * WikipediaImageApi — 模块 03 Wikipedia 图片查询外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Wikipedia API（各语言 wikipedia.org）交流，按地点语义查询一张
 *     带作者/许可信息的图片；
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
 * 过滤器（本客户端内强制，见 WikimediaImageFilters / WikimediaFileMetaApi）：
 *   - 范围限制在马来西亚：条目搜索关键词强制包含 "Malaysia"（如
 *     "Batu Caves Malaysia"），确保命中马来西亚地点条目、图片不出境；
 *   - 图片必须是地点/景点：条目首图按文件名黑名单过滤（排除 logo /
 *     flag / map 等明显非地点图，如公司条目的 logo 首图）；
 *   - 开源协议保证：仅接受来自 Wikimedia Commons 的图片（各语言 Wiki 的
 *     本地文件如 fair use 图片无开源许可，无法提供作者/许可声明 → 跳过），
 *     并经 Commons extmetadata 返回作者与许可信息供展示署名。
 *
 * 查询链（由 findImage 编排，两阶段）：
 *   1. 收集候选条目首图（条目配图路径 → 条目搜索路径，命中即停）：
 *      - 条目配图：调用方提供的 wikipedia 条目名（如 "en:Malaysia Heritage
 *        Studios"），条目是否在马来西亚由调用方保证（统一链路不传该参数）；
 *      - 条目搜索：按 "地点名 Malaysia" 在英文 Wikipedia 搜索条目
 *        （generator=search，强制含 Malaysia）；
 *   2. 批量查询 Commons 文件元数据（extmetadata 作者/许可）→ 返回第一个
 *      可提供完整署名信息的图片。
 *
 * 返回语义（供上层决定是否缓存）：
 *   - 返回 WikimediaFileMeta：查询到图（含缩略图 URL + 作者/许可）；
 *   - 返回 null：所有子查询均请求成功但确定无图（可安全缓存为无图）；
 *   - 抛出 Error：至少一个子查询请求失败（网络错误 / HTTP 非 2xx / 响应异常），
 *     属瞬时状态，上层不得缓存"无图"结论，应允许下次重试。
 */

import {
  extractFileNameFromThumbUrl,
  isNonPlaceImageTitle,
} from "./WikimediaImageFilters";
import {
  wikimediaFileMetaApi,
  type WikimediaFileMeta,
} from "./WikimediaFileMetaApi";

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 MediaWiki 返回结构）
// ---------------------------------------------------------------------------

/** MediaWiki query 响应中的单个页面（本客户端仅用到标题/排序/缩略图） */
interface MediaWikiPageDto {
  title?: string;
  /** 搜索结果序号（按相关性升序，用于保持候选优先级） */
  index?: number;
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

  /** Commons 文件元数据客户端（第二阶段：缩略图 URL + 作者/许可） */
  private readonly fileMetaClient = wikimediaFileMetaApi;

  /**
   * 地点图片查询（条目配图 → 条目搜索，两阶段取图），命中即返回
   * 带作者/许可信息的图片；确定无图返回 null；至少一个子查询瞬时失败
   * 且最终无图时抛出（由上层决定不缓存"无图"，允许下次重试）。
   * 注意：统一图片链路（DiscoveryService.getPlaceImage）只传 placeName，
   * 走"地点名 Malaysia"搜索路径（强制马来西亚范围）；wikipediaEntry
   * 路径保留供精确条目查询使用（条目是否在马来西亚由调用方保证）。
   */
  async findImage(params: {
    /** 精确 Wikipedia 条目名（如 "en:Malaysia Heritage Studios"；可选，须由调用方保证在马来西亚） */
    wikipediaEntry?: string | null;
    /** 地点名称（条目搜索兜底用，如 "Malaysia Heritage Studios"） */
    placeName: string;
  }): Promise<WikimediaFileMeta | null> {
    let anyFailure = false;

    // ---- 阶段 1：收集候选条目首图（含 Commons 路径 + 黑名单过滤） ----
    const candidates: Array<{ fileName: string; thumbUrl: string }> = [];
    if (params.wikipediaEntry) {
      try {
        const candidate = await this.articleImageCandidate(
          params.wikipediaEntry
        );
        if (candidate) candidates.push(candidate);
      } catch {
        anyFailure = true; // 瞬时失败：继续下一级
      }
    }
    try {
      candidates.push(...(await this.searchArticleCandidates(params.placeName)));
    } catch {
      anyFailure = true; // 瞬时失败：继续下一级
    }

    if (candidates.length === 0) {
      if (anyFailure) {
        throw new Error(
          "Wikipedia image query failed (transient failure, retry later)"
        );
      }
      return null;
    }

    // ---- 阶段 2：批量查询 Commons 作者/许可信息，返回第一个可署名的图片 ----
    const meta = await this.fileMetaClient.fetchCommonsFileMeta(
      candidates.map((candidate) => candidate.fileName)
    );
    for (const candidate of candidates) {
      const fileMeta = meta[candidate.fileName];
      if (fileMeta) return fileMeta;
    }

    if (anyFailure) {
      throw new Error(
        "Wikipedia image query failed (transient failure, retry later)"
      );
    }
    return null;
  }

  /**
   * 按 Wikipedia 条目名取条目首图候选（prop=pageimages）。
   * 条目名格式："en:Malaysia Heritage Studios"（语言前缀:条目名）；
   * 无语言前缀时默认英文维基；非语言前缀（如命名空间）也按英文处理。
   * 返回 null = 请求成功但条目无可用首图（或非 Commons / 黑名单过滤）。
   * 注意：本方法不校验条目是否位于马来西亚，调用方须自行保证。
   */
  private async articleImageCandidate(
    wikipediaEntry: string
  ): Promise<{ fileName: string; thumbUrl: string } | null> {
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
    return this.pickCandidate(Object.values(pages)[0] ?? {});
  }

  /**
   * 在 Wikipedia 搜索条目并收集候选首图（prop=pageimages，最多 5 条）。
   * 搜索范围：英文维基普通条目命名空间（gsrnamespace=0）。
   * 马来西亚范围强制：关键词不含 "Malaysia"（大小写不敏感）时自动追加
   * " Malaysia"，确保命中马来西亚地点条目（如 "Batu Caves Malaysia"）。
   */
  private async searchArticleCandidates(
    placeName: string
  ): Promise<Array<{ fileName: string; thumbUrl: string }>> {
    const trimmed = placeName.trim();
    if (!trimmed) return [];
    // 马来西亚范围强制：关键词必须含 "Malaysia"，否则自动追加
    const searchKeyword = /malaysia/i.test(trimmed)
      ? trimmed
      : `${trimmed} Malaysia`;

    const url = new URL(this.wikipediaBaseUrl.replace("{lang}", "en"));
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", searchKeyword);
    url.searchParams.set("gsrnamespace", "0"); // 普通条目命名空间
    url.searchParams.set("gsrlimit", "5");
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", "800");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const pages = await this.requestPages(url.toString());
    return Object.values(pages)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0)) // 保持搜索相关性顺序
      .flatMap((page) => {
        const candidate = this.pickCandidate(page);
        return candidate ? [candidate] : [];
      });
  }

  /**
   * 单个条目页 → 首图候选（通过过滤才返回）。
   * 过滤：首图 URL 必须来自 Commons（/commons/ 路径，开源协议保证）+
   * 文件名过黑名单（排除 logo/flag/map 等非地点图）。
   */
  private pickCandidate(page: MediaWikiPageDto): {
    fileName: string;
    thumbUrl: string;
  } | null {
    const thumb = page.thumbnail?.source;
    if (!thumb || !/^https?:\/\//i.test(thumb)) return null;
    if (!this.isCommonsUrl(thumb)) return null; // 本地文件（fair use）→ 跳过
    const fileName = extractFileNameFromThumbUrl(thumb);
    if (!fileName || isNonPlaceImageTitle(fileName)) return null;
    return { fileName, thumbUrl: thumb };
  }

  /** 判定图片 URL 是否来自 Wikimedia Commons（本地文件路径不含 /commons/） */
  private isCommonsUrl(url: string): boolean {
    try {
      return new URL(url).pathname.includes("/commons/");
    } catch {
      return false;
    }
  }

  /** 解析 wikipedia 条目名（"en:Malaysia Heritage Studios" → { en, "Malaysia Heritage Studios" }） */
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
}

export const wikipediaImageApi = new WikipediaImageApi();
