/**
 * WikimediaFileMetaApi — 模块 03 Wikimedia Commons 文件元数据查询（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Wikimedia Commons MediaWiki API 交流，按文件名批量查询文件页
 *     imageinfo（iiurlwidth 缩略图 + extmetadata 作者/许可信息）；
 *   - 供 Wikipedia / Wikivoyage 图片环节复用（两阶段取图的第二阶段）：
 *     条目首图 URL → 提取文件名 → 本客户端批量换取缩略图 URL 与作者/许可。
 *
 * 官方文档：
 *   - MediaWiki API: https://www.mediawiki.org/wiki/API:Main_page
 *   - 图片信息:      prop=imageinfo（iiprop=url / iiurlwidth 缩略图）
 *   - 元数据:        iiprop=extmetadata（Artist / Credit / LicenseShortName /
 *                   LicenseUrl 等，值为 HTML 字符串，需清洗为纯文本）
 *
 * 开源协议保证（与展示合规相关）：
 *   - Wikimedia Commons 仅收录自由许可文件（CC BY-SA / CC BY / 公有领域等），
 *     因此**仅接受来自 Commons 的文件**即保证开源协议；各语言 Wiki 的本地文件
 *     （如 fair use 图片）在 Commons 查询中无 imageinfo，本客户端跳过——
 *     拿不到作者/许可声明的图片不返回，上层继续下一图片来源。
 *
 * 返回语义（供上层决定是否缓存）：
 *   - 返回 Map：文件名 → 文件元数据（缩略图 URL + 作者/许可），仅含查询成功
 *     且来自 Commons 且有可用图片 URL 的文件；完全无结果返回空 Map（确定无图）；
 *   - 抛出 Error：请求失败（网络错误 / HTTP 非 2xx / 响应异常），属瞬时状态，
 *     上层不得缓存"无图"结论，应允许下次重试。
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 MediaWiki 返回结构）
// ---------------------------------------------------------------------------

/** extmetadata 条目（value 为 HTML 字符串） */
interface ExtMetadataEntry {
  value?: string;
}

/** MediaWiki imageinfo 条目（本客户端仅用到缩略图 URL 与 extmetadata） */
interface ImageInfoDto {
  /** iiurlwidth 请求的缩略图 URL（可直接热链） */
  thumburl?: string;
  /** 原图 URL（thumburl 缺失时的兜底） */
  url?: string;
  /** extmetadata：作者/许可/归属等元数据（值为 HTML） */
  extmetadata?: Record<string, ExtMetadataEntry>;
}

/** MediaWiki query 响应中的单个页面 */
interface MediaWikiPageDto {
  /** 文件页标题（如 "File:Batu Caves stairs 2022-05.jpg"，规范化后） */
  title?: string;
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
// 文件元数据形态（供上层展示与缓存）
// ---------------------------------------------------------------------------

/** Commons 文件元数据（作者与许可信息，纯文本；缺失字段为 undefined） */
export interface WikimediaFileMeta {
  /** 缩略图 URL（upload.wikimedia.org，可直接热链） */
  thumbUrl: string;
  /** 原作者（纯文本，如 "Chainwit."） */
  artist?: string;
  /** 许可短名（如 "CC BY-SA 4.0"） */
  licenseName?: string;
  /** 许可链接（如 "https://creativecommons.org/licenses/by-sa/4.0"） */
  licenseUrl?: string;
  /** 归属文本（Commons Credit 字段，HTML 已清洗为纯文本） */
  credit?: string;
}

/** imageinfo 条目的最小结构（本模块各 Wikimedia 客户端共用的解析输入） */
export interface WikimediaImageInfoLike {
  thumburl?: string;
  url?: string;
  extmetadata?: Record<string, { value?: string }>;
}

/** 清洗 HTML 字符串为纯文本（去标签 + 解码常用实体 + 压缩空白） */
export function cleanWikimediaHtml(html?: string): string | undefined {
  if (!html) return undefined;
  const cleaned = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || undefined;
}

/**
 * 从 imageinfo 条目解析文件元数据（缩略图 URL + 作者/许可）。
 * 返回 null = 该条目无可用图片 URL（本地文件 / 数据异常），调用方跳过。
 */
export function wikimediaFileMetaFromImageInfo(
  info: WikimediaImageInfoLike | undefined
): WikimediaFileMeta | null {
  if (!info) return null;
  const thumbUrl = info.thumburl ?? info.url;
  if (!thumbUrl || !/^https?:\/\//i.test(thumbUrl)) return null;
  const meta = info.extmetadata ?? {};
  return {
    thumbUrl,
    artist: cleanWikimediaHtml(meta.Artist?.value),
    licenseName: cleanWikimediaHtml(meta.LicenseShortName?.value),
    licenseUrl: cleanWikimediaHtml(meta.LicenseUrl?.value),
    credit: cleanWikimediaHtml(meta.Credit?.value),
  };
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class WikimediaFileMetaApi {
  /** Wikimedia Commons MediaWiki API 端点 */
  private readonly commonsBaseUrl = "https://commons.wikimedia.org/w/api.php";

  /**
   * 按文件名批量查询 Commons 文件元数据（缩略图 URL + 作者/许可）。
   * fileNames 为文件名（如 "Batu_Caves_stairs_2022-05.jpg"，可带下划线）。
   * 返回 Map 的键与传入文件名一致（下划线形态，忽略大小写）；
   * 非 Commons 文件（本地文件/不存在/无图片 URL）不在结果中。
   */
  async fetchCommonsFileMeta(
    fileNames: string[],
    width = 800
  ): Promise<Record<string, WikimediaFileMeta>> {
    const valid = fileNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    if (valid.length === 0) return {};

    const url = new URL(this.commonsBaseUrl);
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", valid.map((name) => `File:${name}`).join("|"));
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|extmetadata");
    url.searchParams.set("iiurlwidth", String(width));
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const data = await this.requestPages(url.toString());

    // 响应中文件页标题为规范化形式（下划线→空格），映射回调用方文件名（下划线形态）
    const normalizedKey = (title: string): string => title.replace(/ /g, "_");

    const result: Record<string, WikimediaFileMeta> = {};
    for (const page of Object.values(data)) {
      const info = page.imageinfo?.[0];
      // 无 imageinfo = 非 Commons 文件（本地文件/不存在）→ 跳过（不返回）
      if (!info) continue;
      const title = (page.title ?? "").replace(/^File:/i, "");
      if (!title) continue;
      const fileMeta = wikimediaFileMetaFromImageInfo(info);
      if (!fileMeta) continue;
      result[normalizedKey(title)] = fileMeta;
    }
    return result;
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
        `Wikimedia Commons metadata request failed (network error): ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      // 429 限流 / 4xx / 5xx 均为瞬时失败：抛出，由上层决定不缓存"无图"
      throw new Error(
        `Wikimedia Commons metadata request failed: HTTP ${res.status} ${res.statusText}`
      );
    }

    let data: MediaWikiQueryResponse;
    try {
      data = (await res.json()) as MediaWikiQueryResponse;
    } catch {
      throw new Error("Wikimedia Commons metadata response parse failed");
    }

    if (data.error) {
      throw new Error(
        `Wikimedia Commons API error: ${data.error.code ?? ""} ${data.error.info ?? ""}`
      );
    }

    return data.query?.pages ?? {};
  }
}

export const wikimediaFileMetaApi = new WikimediaFileMetaApi();
