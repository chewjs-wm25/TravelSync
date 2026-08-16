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
 *   - 页面坐标:      prop=coordinates（过滤马来西亚境外文件用）
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Wikimedia Commons 公开 API 完全免费、无需 API key；
 *   - CORS：MediaWiki API 支持 origin=* 参数，浏览器端可直连（前端实现原则）；
 *   - 热链：返回 upload.wikimedia.org 缩略图 URL（thumburl），可直接供 <img> 使用；
 *   - 匿名配额：约 500 请求/5 分钟（浏览器共享出口 IP），上层已有调用控制。
 *
 * 过滤器（本客户端内强制，见 WikimediaImageFilters / MalaysiaBounds）：
 *   - 范围限制在马来西亚（三层）：
 *       1. 入口坐标必须位于马来西亚 bbox 内，否则直接返回 null（不发请求）；
 *       2. 搜索半径钳制上限 5000m（geosearch 按距离排序，图片仍在地点附近）；
 *       3. 逐文件校验其坐标位于马来西亚 bbox 内——圆形搜索在边境附近可能
 *          越界（如柔佛南部 5km 半径可触及新加坡），文件级校验兜底拦截。
 *   - 图片必须是地点/景点：
 *       1. ggsnamespace=6 仅搜索 File 命名空间（不带此参数时 geosearch 会
 *          优先返回无图片的非文件页，取图恒为空）；
 *       2. 文件标题黑名单过滤（排除 logo/flag/map/sign 等明显非地点图）；
 *       3. 传入 placeName 时优先选择标题含地点名关键词的文件。
 *   - 开源协议保证：Commons 仅收录自由许可文件，本环节直接请求
 *     iiprop=url|extmetadata，返回的作者与许可信息供展示署名。
 *
 * 返回语义（供上层决定是否缓存）：
 *   - 返回 WikimediaFileMeta：查询到图（含缩略图 URL + 作者/许可）；
 *   - 返回 null：请求成功但确定无图（或全部结果被过滤器排除，可安全视为无图）；
 *   - 抛出 Error：请求失败（网络错误 / HTTP 非 2xx / 响应异常），属瞬时状态，
 *     上层不得缓存"无图"结论，应允许下次重试。
 */

import { isInMalaysiaBounds } from "./MalaysiaBounds";
import {
  isNonPlaceImageTitle,
  titleContainsPlaceName,
} from "./WikimediaImageFilters";
import {
  type WikimediaFileMeta,
  wikimediaFileMetaFromImageInfo,
} from "./WikimediaFileMetaApi";

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 MediaWiki 返回结构）
// ---------------------------------------------------------------------------

/** MediaWiki imageinfo 条目（本客户端仅用到缩略图/原图 URL 与 extmetadata） */
interface ImageInfoDto {
  /** iiurlwidth 请求的缩略图 URL（可直接热链） */
  thumburl?: string;
  /** 原图 URL（thumburl 缺失时的兜底） */
  url?: string;
  /** extmetadata：作者/许可等元数据（值为 HTML） */
  extmetadata?: Record<string, { value?: string }>;
}

/** MediaWiki coordinates 条目（本客户端仅用到经纬度） */
interface CoordinatesDto {
  lat?: number;
  lon?: number;
}

/** MediaWiki query 响应中的单个页面（本客户端仅用到标题/图片/坐标） */
interface MediaWikiPageDto {
  /** 文件页标题（如 "File:Kampung Agong.jpg"） */
  title?: string;
  /** prop=imageinfo 的图片信息数组 */
  imageinfo?: ImageInfoDto[];
  /** prop=coordinates 的页面坐标数组（geosearch 命中文件应存在） */
  coordinates?: CoordinatesDto[];
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

  /** geosearch 搜索半径上限（米）：限制图片仍在地点附近（马来西亚内） */
  private static readonly MAX_RADIUS_METERS = 5000;

  /** geosearch 搜索半径下限（米，防 0/负值滥用） */
  private static readonly MIN_RADIUS_METERS = 100;

  /**
   * 按经纬度坐标在 Wikimedia Commons 搜索地点图片，取第一个通过过滤器的
   * 文件缩略图（含作者/许可信息）。返回 WikimediaFileMeta；请求成功但无结果
   * （或被过滤）返回 null；请求失败抛出 Error。
   * 过滤器（详见文件头注释）：
   *   - 入口坐标须位于马来西亚 bbox 内（否则不请求，直接 null）；
   *   - 半径钳制到 [100, 5000] 米；
   *   - 逐文件校验坐标在马来西亚 bbox 内 + 标题黑名单过滤；
   *   - placeName 可选：传入时优先选择标题含地点名关键词的文件。
   * radiusMeters 由调用方按需指定（Recommended Places 统一传 5000m，
   * 因坐标可能为 Nominatim 降级命中的区域中心；默认 1000m 仅作兜底）。
   */
  async findImageByCoords(params: {
    lat: number;
    lon: number;
    /** 搜索半径（米），钳制范围 [100, 5000]，默认 1000 */
    radiusMeters?: number;
    /** 地点名称（可选）：优先选择标题含地点名关键词的图片 */
    placeName?: string;
  }): Promise<WikimediaFileMeta | null> {
    const { lat, lon } = params;
    // 1. 入口坐标校验：非有限数或不在马来西亚 bbox 内 → 视为无图，不发起请求
    if (!isInMalaysiaBounds(lat, lon)) {
      return null;
    }
    // 2. 半径钳制：上限 5000m（保证图片在地点附近、马来西亚内），下限 100m
    const radius = Math.min(
      Math.max(params.radiusMeters ?? 1000, WikimediaGeosearchApi.MIN_RADIUS_METERS),
      WikimediaGeosearchApi.MAX_RADIUS_METERS
    );

    const url = new URL(this.commonsBaseUrl);
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "geosearch");
    url.searchParams.set("ggscoord", `${lat}|${lon}`);
    url.searchParams.set("ggsradius", String(radius));
    url.searchParams.set("ggslimit", "10");
    // 仅搜索 File 命名空间（ns=6）：不带此参数时 geosearch 会优先返回
    // 无图片的非文件页（无 imageinfo，取图恒为空）
    url.searchParams.set("ggsnamespace", "6");
    url.searchParams.set("prop", "imageinfo|coordinates");
    // iiprop=url|extmetadata：一次请求同时拿到缩略图 URL 与作者/许可信息
    url.searchParams.set("iiprop", "url|extmetadata");
    url.searchParams.set("iiurlwidth", "800");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const pages = await this.requestPages(url.toString());
    return this.pickImage(pages, params.placeName);
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

  /**
   * 从 pages 中挑选第一个通过过滤器的文件图片（含作者/许可信息）。
   * 过滤器（顺序）：
   *   1. 文件坐标必须位于马来西亚 bbox 内（圆形搜索在边境附近可能越界；
   *      坐标缺失的文件无法确认在马来西亚 → 不通过）；
   *   2. 文件标题必须通过黑名单过滤（排除 logo/flag/map 等非地点图）；
   *   3. 若提供 placeName：优先选择标题含地点名关键词的文件，
   *      无匹配则回退到第一个通过上述过滤的文件。
   * 全部不过滤 → 返回 null（确定无图，可安全缓存）。
   */
  private pickImage(
    pages: Record<string, MediaWikiPageDto>,
    placeName?: string
  ): WikimediaFileMeta | null {
    const passed: Array<{ title: string; file: WikimediaFileMeta }> = [];
    for (const page of Object.values(pages)) {
      const coord = page.coordinates?.[0];
      // 1. 文件坐标马来西亚校验（缺失 → 不通过）
      if (
        !coord ||
        typeof coord.lat !== "number" ||
        typeof coord.lon !== "number" ||
        !isInMalaysiaBounds(coord.lat, coord.lon)
      ) {
        continue;
      }
      // 2. 文件标题黑名单过滤（去除 "File:" 前缀后判定）
      const title = (page.title ?? "").replace(/^File:/i, "");
      if (isNonPlaceImageTitle(title)) continue;

      // 3. 解析图片 URL + 作者/许可（extmetadata）；无可用 URL → 不通过
      const file = wikimediaFileMetaFromImageInfo(page.imageinfo?.[0]);
      if (!file) continue;
      passed.push({ title, file });
    }
    if (passed.length === 0) return null;

    // 4. 地点名关键词优先：标题含地点名关键词的文件优先，无匹配取第一个
    if (placeName?.trim()) {
      const preferred = passed.find((item) =>
        titleContainsPlaceName(item.title, placeName)
      );
      if (preferred) return preferred.file;
    }
    return passed[0].file;
  }
}

export const wikimediaGeosearchApi = new WikimediaGeosearchApi();
