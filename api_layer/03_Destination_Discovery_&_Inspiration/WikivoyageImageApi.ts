/**
 * WikivoyageImageApi — 模块 03 Wikivoyage 图片查询外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Wikivoyage MediaWiki API（en.wikivoyage.org）交流，按地点名
 *     查询旅行指南条目的配图（条目首图 prop=pageimages）；
 *   - 命中条目后经 WikimediaFileMetaApi 换取图片缩略图 URL 与作者/许可信息
 *     （extmetadata，开源协议署名要求）；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 官方文档：
 *   - MediaWiki API: https://www.mediawiki.org/wiki/API:Main_page
 *   - 条目配图:  prop=pageimages（Wikivoyage 条目首图）
 *   - 条目搜索:  generator=search（普通条目命名空间，gsrnamespace=0）
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Wikivoyage 公开 API 完全免费、无需 API key；
 *   - CORS：MediaWiki API 支持 origin=* 参数，浏览器端可直连（前端实现原则）；
 *   - 热链：返回 upload.wikimedia.org 缩略图 URL，可直接供 <img> 使用；
 *   - 匿名配额：约 500 请求/5 分钟（浏览器共享出口 IP），上层已有调用控制。
 *
 * 过滤器（本客户端内强制，见 WikimediaImageFilters / WikimediaFileMetaApi）：
 *   - 范围限制在马来西亚：搜索关键词强制包含 "Malaysia"（如
 *     "intitle:George Town Malaysia" / "Batu Caves Malaysia"）；
 *   - 地点/景点图片：条目标题必须包含地点名关键词（防止全文搜索命中
 *     不相关条目——如 "Batu Caves" 全文搜索首条可能是 "Bintulu"），
 *     条目首图文件名过黑名单过滤（排除 logo/map 等）；
 *   - 开源协议保证：仅接受来自 Wikimedia Commons 的图片（本地文件无
 *     extmetadata，无法提供作者/许可声明 → 跳过），并返回作者与许可信息。
 *
 * 查询链（由 findImage 编排）：
 *   1. 标题搜索：intitle:{地点名} Malaysia → 精确命中条目标题含地点名者；
 *   2. 全文搜索兜底：{地点名} Malaysia → 条目标题仍须含地点名关键词；
 *   3. 命中候选首图 → 批量查询 Commons extmetadata（作者/许可）→
 *      返回第一个可提供完整署名信息的图片。
 *
 * 返回语义（供上层决定是否缓存）：
 *   - 返回 WikimediaFileMeta：查询到图（含缩略图 URL + 作者/许可）；
 *   - 返回 null：请求成功但确定无图（可安全缓存为无图）；
 *   - 抛出 Error：请求失败（网络错误 / HTTP 非 2xx / 响应异常），属瞬时状态，
 *     上层不得缓存"无图"结论，应允许下次重试。
 */

import {
  extractFileNameFromThumbUrl,
  isNonPlaceImageTitle,
  titleContainsPlaceName,
} from "./WikimediaImageFilters";
import {
  wikimediaFileMetaApi,
  type WikimediaFileMeta,
} from "./WikimediaFileMetaApi";

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 Wikivoyage MediaWiki 返回结构）
// ---------------------------------------------------------------------------

/** MediaWiki query 响应中的单个页面（本客户端仅用到标题/排序/缩略图） */
interface WikivoyagePageDto {
  /** 条目标题（如 "George Town (Malaysia)"） */
  title?: string;
  /** 搜索结果序号（按相关性升序，用于保持候选优先级） */
  index?: number;
  /** prop=pageimages 的缩略图字段 */
  thumbnail?: { source?: string };
}

/** MediaWiki query 响应结构（仅声明本客户端用到的字段） */
interface WikivoyageQueryResponse {
  query?: {
    /** pages 键为 page id，值为页面对象 */
    pages?: Record<string, WikivoyagePageDto>;
  };
  error?: { code?: string; info?: string };
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class WikivoyageImageApi {
  /** 英语 Wikivoyage MediaWiki API 端点（马来西亚地点英文内容最全） */
  private readonly wikivoyageBaseUrl = "https://en.wikivoyage.org/w/api.php";

  /** Commons 文件元数据客户端（第二阶段：缩略图 URL + 作者/许可） */
  private readonly fileMetaClient = wikimediaFileMetaApi;

  /**
   * Wikivoyage 地点图片查询（标题搜索 → 全文搜索兜底），命中即返回
   * 带作者/许可信息的图片；确定无图返回 null；请求失败抛出。
   * 过滤器（详见文件头注释）：马来西亚关键词 + 条目标题含地点名关键词 +
   * 首图黑名单过滤 + 仅接受 Commons 文件（开源协议保证）。
   */
  async findImage(params: {
    /** 地点名称（如 "George Town Penang"、"Kota Kinabalu"） */
    placeName: string;
  }): Promise<WikimediaFileMeta | null> {
    const placeName = params.placeName.trim();
    if (!placeName) return null;

    const candidates = await this.searchCandidates(placeName);
    if (candidates.length === 0) return null;

    // 批量查询 Commons 元数据（一次请求；非 Commons 文件/无许可 → 不在结果中）
    const meta = await this.fileMetaClient.fetchCommonsFileMeta(
      candidates.map((candidate) => candidate.fileName)
    );
    for (const candidate of candidates) {
      const fileMeta = meta[candidate.fileName];
      if (fileMeta) return fileMeta;
    }
    return null;
  }

  /**
   * 搜索候选条目（按优先级排列）：
   *   1. 标题搜索 intitle:{地点名} Malaysia——精确命中条目标题含地点名者；
   *   2. 全文搜索 {地点名} Malaysia 兜底——条目标题仍须含地点名关键词
   *      （防止全文命中不相关条目，如 "Batu Caves" 首条可能是 "Bintulu"）。
   * 候选须通过：标题含地点名关键词 + 首图来自 Commons + 文件名过黑名单。
   */
  private async searchCandidates(
    placeName: string
  ): Promise<Array<{ fileName: string; thumbUrl: string }>> {
    const titleResults = await this.search(`intitle:${placeName} Malaysia`);
    const fromTitle = this.pickCandidates(titleResults, placeName);
    if (fromTitle.length > 0) return fromTitle;

    const fullResults = await this.search(`${placeName} Malaysia`);
    return this.pickCandidates(fullResults, placeName);
  }

  /** 搜索 Wikivoyage 条目（普通条目命名空间，返回含首图的页面映射） */
  private async search(keyword: string): Promise<Record<string, WikivoyagePageDto>> {
    const url = new URL(this.wikivoyageBaseUrl);
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", keyword);
    url.searchParams.set("gsrnamespace", "0"); // 普通条目命名空间
    url.searchParams.set("gsrlimit", "5");
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", "800");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    return this.requestPages(url.toString());
  }

  /**
   * 从搜索结果挑选候选（按相关性 index 升序）。
   * 过滤（顺序）：
   *   1. 条目标题必须含地点名关键词（titleContainsPlaceName）；
   *   2. 首图 URL 必须来自 Wikimedia Commons（/commons/ 路径）——
   *      开源协议保证：本地文件无法提供作者/许可声明，跳过；
   *   3. 首图文件名过黑名单（排除 logo/map 等非地点图）。
   */
  private pickCandidates(
    pages: Record<string, WikivoyagePageDto>,
    placeName: string
  ): Array<{ fileName: string; thumbUrl: string }> {
    return Object.values(pages)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0)) // 保持搜索相关性顺序
      .flatMap((page) => {
        const title = (page.title ?? "").trim();
        if (!title) return [];
        // 1. 标题含地点名关键词（防不相关条目误配）
        if (!titleContainsPlaceName(title, placeName)) return [];
        const thumb = page.thumbnail?.source;
        if (!thumb || !/^https?:\/\//i.test(thumb)) return [];
        // 2. 仅接受 Commons 文件（开源协议保证）
        if (!this.isCommonsUrl(thumb)) return [];
        // 3. 文件名黑名单过滤
        const fileName = extractFileNameFromThumbUrl(thumb);
        if (!fileName || isNonPlaceImageTitle(fileName)) return [];
        return [{ fileName, thumbUrl: thumb }];
      });
  }

  /** 判定图片 URL 是否来自 Wikimedia Commons（本地文件路径不含 /commons/） */
  private isCommonsUrl(url: string): boolean {
    try {
      return new URL(url).pathname.includes("/commons/");
    } catch {
      return false;
    }
  }

  /** 从 MediaWiki query 响应解析 pages 映射（请求失败时抛出） */
  private async requestPages(
    url: string
  ): Promise<Record<string, WikivoyagePageDto>> {
    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new Error(
        `Wikivoyage request failed (network error): ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      // 429 限流 / 4xx / 5xx 均为瞬时失败：抛出，由上层决定不缓存"无图"
      throw new Error(
        `Wikivoyage request failed: HTTP ${res.status} ${res.statusText}`
      );
    }

    let data: WikivoyageQueryResponse;
    try {
      data = (await res.json()) as WikivoyageQueryResponse;
    } catch {
      throw new Error("Wikivoyage response parse failed");
    }

    if (data.error) {
      throw new Error(
        `Wikivoyage API error: ${data.error.code ?? ""} ${data.error.info ?? ""}`
      );
    }

    return data.query?.pages ?? {};
  }
}

export const wikivoyageImageApi = new WikivoyageImageApi();
