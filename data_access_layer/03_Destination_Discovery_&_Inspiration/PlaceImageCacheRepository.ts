/**
 * PlaceImageCacheRepository — 模块 03 地点图片缓存仓储（Data Access Layer, Cloudflare KV）
 *
 * 职责（单一）：
 *   - 提供以 place id 为键的地点图片缓存读写接口（Cloudflare KV 实现）；
 *   - 不包含业务判断（缓存策略由 Business Logic Layer 编排）。
 *
 * 键设计：`module03:place-image:v5:{placeId}` —— 图片与 place id 一一关联，
 *         键前缀用于隔离键空间；v5 前缀使 v4 及更早缓存（旧值格式无署名
 *         信息，且旧查询链的"确定无图"结果会阻挡新增的 Wikivoyage 环节）
 *         整体失效——图片链路（v5）新增 Wikivoyage 首环节并携带作者/许可
 *         署名信息，必须升键重新查询。
 *
 * 值语义（v5，来源引用格式，供上层决定缓存策略）：
 *   - 缓存值为 PlaceImageCacheEntry 的 JSON 序列化字符串：
 *       {"source":"wikimedia","url":"...","attribution":{...}}
 *         Wikipedia/Wikivoyage/Commons 永久 URL，可直接使用；attribution 为
 *         作者/许可信息（CC BY-SA 等开源协议署名展示所需，永久有效）；
 *       {"source":"mapillary","imageId":"...","attribution":{...}}
 *         Mapillary 图片 id（thumb URL 有时效，每次查询需用 id 换取新 URL，
 *         **不得缓存 URL**）；attribution 为固定署名（Mapillary contributors）；
 *   - 空字符串 "" 表示"已确定无图"（等价于 {"source":"none"}）；
 *   - get 返回 null 表示未缓存（键不存在），与"确定无图"（"" / none）严格区分。
 *
 * 序列化兼容：parsePlaceImageEntry 对非 JSON 的纯 URL 字符串仍视为 wikimedia 来源
 * （防御性兼容；v5 键前缀下正常不会出现旧格式数据，attribution 缺失时上层按
 * 无署名信息处理）。
 *
 * 实现类：
 *   - CloudflareKvPlaceImageCacheRepository：Worker/Route API 端，直连 KV binding
 *     （env.PLACE_IMAGE_CACHE），由 Route API（app/03_Destination_Discovery_&_Inspiration/api/place-image）实例化；
 *   - RemotePlaceImageCacheRepository（见同目录 RemotePlaceImageCacheRepository.ts）：
 *     浏览器端，经 Route API 完成读写。
 *
 * 依赖方向：浏览器端 BL → RemotePlaceImageCacheRepository → Route API
 *                → CloudflareKvPlaceImageCacheRepository → KV。
 */

/** KV 键前缀（隔离键空间，图片与 place id 关联） */
export const PLACE_IMAGE_CACHE_KEY_PREFIX = "module03:place-image:v5:";

/** 由 place id 生成 KV 键 */
export function placeImageCacheKey(placeId: string): string {
  return `${PLACE_IMAGE_CACHE_KEY_PREFIX}${placeId.trim()}`;
}

// ---------------------------------------------------------------------------
// 缓存条目类型与序列化（v5 来源引用格式）
// ---------------------------------------------------------------------------

/** 图片来源：wikimedia（URL 永久可直接用）｜mapillary（URL 有时效，存 id 换新 URL）｜none（确定无图） */
export type PlaceImageCacheSource = "wikimedia" | "mapillary" | "none";

/**
 * 图片署名信息（开源协议展示合规，如 CC BY-SA 4.0 的署名要求：
 * 保留原作者 + 许可声明）。字段与 Wikimedia extmetadata / Mapillary
 * 固定署名对应；缺失字段为 undefined。
 */
export interface PlaceImageAttribution {
  /** 原作者（纯文本，如 "Chainwit."） */
  artist?: string;
  /** 许可短名（如 "CC BY-SA 4.0"） */
  licenseName?: string;
  /** 许可链接（如 "https://creativecommons.org/licenses/by-sa/4.0"） */
  licenseUrl?: string;
  /** 归属文本（Commons Credit 字段清洗后的纯文本） */
  credit?: string;
}

/** 地点图片缓存条目（KV 存 JSON 序列化字符串；"确定无图"存空串兼容旧格式） */
export interface PlaceImageCacheEntry {
  source: PlaceImageCacheSource;
  /** wikimedia 来源的永久图片 URL（source=wikimedia 时存在） */
  url?: string;
  /** mapillary 来源的图片 id（source=mapillary 时存在，每次查询换取有时效的 URL） */
  imageId?: string;
  /** 作者/许可署名信息（开源协议展示所需；none 来源不存在） */
  attribution?: PlaceImageAttribution;
}

/** 序列化缓存条目为 KV 存储字符串；确定无图 → ""（兼容旧版 "" 语义） */
export function serializePlaceImageEntry(entry: PlaceImageCacheEntry): string {
  if (entry.source === "none") return "";
  return JSON.stringify(entry);
}

/**
 * 反序列化 KV 存储字符串为缓存条目。
 * 返回语义：null = 未缓存；{source:"none"} = 确定无图；其余为具体来源条目。
 * 旧格式兼容：非 JSON 的 http(s) URL → wikimedia 来源；空串 → none。
 */
export function parsePlaceImageEntry(
  raw: string | null
): PlaceImageCacheEntry | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return { source: "none" };

  try {
    const parsed = JSON.parse(trimmed) as PlaceImageCacheEntry;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.source === "wikimedia" ||
        parsed.source === "mapillary" ||
        parsed.source === "none")
    ) {
      return parsed;
    }
  } catch {
    // 非 JSON → 落入下方旧格式兼容分支
  }

  if (/^https?:\/\//i.test(trimmed)) {
    // 旧格式：纯 URL（Geoapify/Wikimedia 永久 URL），视为 wikimedia 来源
    return { source: "wikimedia", url: trimmed };
  }
  return { source: "none" };
}

export interface PlaceImageCacheRepository {
  /**
   * 读取缓存条目。
   * 返回语义：null = 未缓存；{source:"none"} = 已缓存"确定无图"；其余为来源引用。
   */
  get(placeId: string): Promise<PlaceImageCacheEntry | null>;
  /** 写入缓存条目；空 placeId 为 no-op */
  put(placeId: string, entry: PlaceImageCacheEntry): Promise<void>;
  /** 清空全部地点图片缓存（仅本键前缀范围），返回清除的条目数 */
  clearAll(): Promise<number>;
}

/**
 * 仓储所需的最小 KV 结构（get/put/list/delete）。
 * 不绑定 @cloudflare/workers-types 的具体类型：@opennextjs/cloudflare 的
 * CloudflareEnv 类型与 workers-types 的 KVNamespace 结构不完全兼容，
 * 用结构类型（structural typing）同时兼容两者。
 */
export interface PlaceImageKvBinding {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{
    keys: Array<{ name: string }>;
    list_complete?: boolean;
    cursor?: string;
  }>;
  delete(key: string): Promise<void>;
}

/** Cloudflare KV 实现（服务端直连 KV binding，无 HTTP 逻辑） */
export class CloudflareKvPlaceImageCacheRepository implements PlaceImageCacheRepository {
  constructor(private readonly kv: PlaceImageKvBinding) {}

  async get(placeId: string): Promise<PlaceImageCacheEntry | null> {
    const key = placeImageCacheKey(placeId);
    if (!placeId.trim()) return null;
    const raw = await this.kv.get(key);
    return parsePlaceImageEntry(raw);
  }

  async put(placeId: string, entry: PlaceImageCacheEntry): Promise<void> {
    const key = placeImageCacheKey(placeId);
    if (!placeId.trim()) return;
    await this.kv.put(key, serializePlaceImageEntry(entry));
  }

  /**
   * 清空全部地点图片缓存（仅 PLACE_IMAGE_CACHE_KEY_PREFIX 前缀范围）。
   * 逐页 list + 逐个 delete，返回清除的条目数；无键时返回 0。
   */
  async clearAll(): Promise<number> {
    let count = 0;
    let cursor: string | undefined;
    do {
      const page = await this.kv.list({
        prefix: PLACE_IMAGE_CACHE_KEY_PREFIX,
        cursor,
      });
      for (const key of page.keys) {
        await this.kv.delete(key.name);
        count++;
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    return count;
  }
}
