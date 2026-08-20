/**
 * InspirationsService — 模块 03 灵感集锦业务逻辑（Business Logic Layer）
 *
 * 职责：
 *   - 灵感合辑主题的自动发现（Wikivoyage 马来西亚分类树动态遍历，
 *     主题清单全部来自 API 响应，无硬编码/人工策展主题）；
 *   - 合辑内容聚合（分类成员 / 专题文章 / 马来西亚行程 → 领域形态
 *     Collection，含封面、成员数、Star 数统计）；
 *   - 附近灵感推荐（geosearch 附近目的地，按距离排序）；
 *   - 合辑数据缓存（主题池 sessionStorage TTL 24h + 成员聚合会话内存）
 *     与失败降级（失败不缓存，下次自动重试）。
 *
 * 数据来源（真实第三方 API，见 api_layer）：
 *   - 主题池：Category:Malaysia 分类树（2 层遍历：马来西亚 → 区域 → 州/专题）
 *     + Category:South_East_Asia_itineraries（成员经马来西亚 bbox 坐标过滤）；
 *   - 成员内容：Wikivoyage 文章（导语 extract / 缩略图 pageimages / Star 徽章
 *     pageprops / 坐标 coordinates）；
 *   - 附近推荐：Wikivoyage geosearch（ns=0 目的地文章）。
 *
 * 依赖方向：Business Logic → API Layer（WikivoyageApi）
 * 说明：前端可完成的逻辑全部在本层完成（浏览器端执行），不依赖后端服务。
 */

import {
  wikivoyageApi,
  wikivoyageArticleUrl,
  type WikivoyageApi,
  type WikivoyagePageDto,
} from "../../api_layer/03_Destination_Discovery_&_Inspiration/WikivoyageApi";
import { isInMalaysiaBounds } from "../../api_layer/03_Destination_Discovery_&_Inspiration/MalaysiaBounds";
import type {
  Collection,
  CollectionDetail,
  CollectionPlaceItem,
  NearbyInspiration,
} from "./types";

// ---------------------------------------------------------------------------
// 常量（数据源声明与缓存策略；非主题硬编码）
// ---------------------------------------------------------------------------

/** 马来西亚根分类（主题发现的树根） */
const MALAYSIA_ROOT_CATEGORY = "Category:Malaysia";
/** 行程源分类（东南亚行程，成员经马来西亚 bbox 过滤） */
const ITINERARIES_SOURCE_CATEGORY = "Category:South_East_Asia_itineraries";
/** 分类标题前缀（区分子分类与普通文章） */
const CATEGORY_TITLE_PREFIX = "Category:";
/** 主题池缓存键（sessionStorage；v1 版本键，结构变更时升版） */
const POOL_CACHE_KEY = "module03:inspiration-pool:v1";
/**
 * 批次游标缓存键（sessionStorage）：记录主题池已消费到的位置。
 * 与合辑展示状态同步持久化——刷新/返回主页后 Generate more 从游标
 * 继续，不会重复返回已展示主题（跳过的失败主题已计入游标）。
 */
const BATCH_CURSOR_KEY = "module03:inspiration-cursor:v1";
/** 主题池缓存有效期（Wikivoyage 分类结构低频变化） */
const POOL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** 默认批大小（首页默认展示数） */
const DEFAULT_BATCH_SIZE = 3;
/** 累计展示上限（达到后 Generate more 切换为外链按钮） */
export const MAX_COLLECTIONS_DISPLAYED = 9;
/** Star 条目徽章键（Wikivoyage 社区质量评级；实测与 Category:Star articles 脱节） */
const STAR_BADGE_KEY = "wikibase-badge-Q17559452";
/** 附近灵感搜索半径（米） */
const NEARBY_RADIUS_METERS = 10000;
/** 分类主题成员聚合上限 */
const CATEGORY_MEMBER_LIMIT = 100;
/** 合辑封面/成员缩略图宽度（960px：卡片与详情页 Hero 共用） */
const COLLECTION_THUMB_WIDTH = 960;
/**
 * 请求间隔（毫秒）：分散突发请求，降低 Wikivoyage 匿名限流触发概率
 * （共享出口 IP 场景下尤其重要，见 WikivoyageApi 429 重试注释）。
 */
const REQUEST_SPACING_MS = 250;

/** 延时工具（分散请求节奏用） */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// 内部类型与工具
// ---------------------------------------------------------------------------

/** 主题池条目（内部形态：聚合前只有元数据） */
interface CollectionTheme {
  id: string;
  title: string;
  subtitle: string;
  source: "category" | "topics" | "itineraries";
  /** source=category 时的完整分类名 */
  categoryTitle?: string;
  /** topics/itineraries 的成员文章标题清单（池构建时确定） */
  memberTitles?: string[];
}

/** 主题池 sessionStorage 存储形态 */
interface PoolCachePayload {
  savedAt: number;
  themes: CollectionTheme[];
}

/** 尝试 URL 解码（解码失败时返回原值，幂等安全） */
function tryDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** 判定文章坐标是否位于马来西亚（行程主题成员过滤用） */
function isPageInMalaysia(page: WikivoyagePageDto): boolean {
  const coord = page.coordinates?.[0];
  return (
    typeof coord?.lat === "number" &&
    typeof coord?.lon === "number" &&
    isInMalaysiaBounds(coord.lat, coord.lon)
  );
}

/** Wikivoyage 文章 DTO → 合辑成员领域形态 */
function toCollectionPlaceItem(page: WikivoyagePageDto): CollectionPlaceItem {
  const coord = page.coordinates?.[0];
  return {
    id: page.title,
    title: page.title,
    extract: page.extract ?? "",
    imageUrl: page.thumbnail?.source ?? "",
    isStar: STAR_BADGE_KEY in (page.pageprops ?? {}),
    lat: typeof coord?.lat === "number" ? coord.lat : undefined,
    lon: typeof coord?.lon === "number" ? coord.lon : undefined,
    wikivoyageUrl: wikivoyageArticleUrl(page.title),
  };
}

/** 合辑详情 → 合辑摘要（剥离 items，供列表页卡片使用） */
function toCollectionSummary(detail: CollectionDetail): Collection {
  return {
    id: detail.id,
    title: detail.title,
    subtitle: detail.subtitle,
    imageUrl: detail.imageUrl,
    memberCount: detail.memberCount,
    starCount: detail.starCount,
    source: detail.source,
    categoryTitle: detail.categoryTitle,
  };
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

export class InspirationsService {
  constructor(private readonly api: WikivoyageApi = wikivoyageApi) {}

  // -------------------------------------------------------------------------
  // 对外方法
  // -------------------------------------------------------------------------

  /** 默认批合辑（主题池前 DEFAULT_BATCH_SIZE 个主题；重置批次游标） */
  async getCollections(): Promise<Collection[]> {
    this.ensureBatchCursorLoaded();
    this.batchCursor = 0;
    this.persistBatchCursor(0);
    return this.getCollectionBatch(0, DEFAULT_BATCH_SIZE);
  }

  /**
   * 下一批合辑（Generate more）：从批次游标继续（游标已跳过失败/空主题，
   * 不会重复返回已展示合辑）；数量钳制到累计上限 MAX_COLLECTIONS_DISPLAYED
   * 与主题池剩余量内；越界返回空数组。
   */
  async getMoreCollections(count = DEFAULT_BATCH_SIZE): Promise<Collection[]> {
    this.ensureBatchCursorLoaded();
    const pool = await this.getThemePool();
    const cappedCount = Math.min(count, Math.max(0, pool.length - this.batchCursor));
    if (cappedCount <= 0) return [];
    return this.getCollectionBatch(this.batchCursor, cappedCount);
  }

  /**
   * 合辑详情（先内存缓存；跨会话直连时按主题源聚合）。
   * 返回语义：null = 合辑确实不存在（主题池可用但无此 id）；
   * 抛出 Error = 主题池暂不可用（限流/网络），由 UI 展示"加载失败"可重试。
   */
  async getCollectionDetail(
    collectionId: string
  ): Promise<CollectionDetail | null> {
    const cached = this.detailCache.get(collectionId);
    if (cached) return cached;

    const theme = await this.findThemeById(collectionId);
    if (theme) return this.aggregateCollection(theme);

    // 主题未命中：池为空说明数据源暂不可用（限流/网络），抛错区分于"不存在"
    const pool = await this.getThemePool();
    if (pool.length === 0) {
      throw new Error("Inspiration theme pool unavailable");
    }
    return null;
  }

  /** 附近灵感（geosearch 附近目的地，按距离排序，含距离/图/Star 标注） */
  async getNearbyInspirations(
    lat: number,
    lon: number
  ): Promise<NearbyInspiration[]> {
    const nearby = await this.api.searchNearbyDestinations(
      lat,
      lon,
      NEARBY_RADIUS_METERS
    );
    return nearby.map((entry) => ({
      title: entry.title,
      imageUrl: entry.thumbnail?.source ?? "",
      isStar: STAR_BADGE_KEY in (entry.pageprops ?? {}),
      distanceMeters: entry.distanceMeters,
      wikivoyageUrl: wikivoyageArticleUrl(entry.title),
    }));
  }

  // -------------------------------------------------------------------------
  // 合辑批次与聚合
  // -------------------------------------------------------------------------

  /**
   * 取主题池 [startIndex, startIndex+count) 并聚合为合辑摘要（不含 items）。
   * 成员为空的主题（分类无成员/全部 missing）跳过，顺序推进补足本批数量；
   * 聚合为串行 + 请求间隔（抗匿名限流），单个主题失败（限流/网络）跳过，
   * 已成功的合辑仍正常返回（部分成功也展示，不整体失败）。
   * 结束后更新批次游标（含被跳过的主题），供下一批续取不重复。
   */
  private async getCollectionBatch(
    startIndex: number,
    count: number
  ): Promise<Collection[]> {
    const pool = await this.getThemePool();
    const results: Collection[] = [];
    let cursor = startIndex;

    const collectNext = async (): Promise<void> => {
      if (cursor >= pool.length || results.length >= count) return;
      const theme = pool[cursor];
      cursor++;
      try {
        await sleep(REQUEST_SPACING_MS);
        const detail = await this.aggregateCollection(theme);
        if (detail.memberCount > 0) results.push(toCollectionSummary(detail));
      } catch {
        // 单主题聚合失败（限流/网络）：跳过，由后续主题补足
      }
    };

    // 本批主题 + 空主题/失败跳过后补足，直至凑满 count 或池耗尽
    while (results.length < count && cursor < pool.length) {
      await collectNext();
    }

    // 游标推进（含跳过主题），持久化供下一批/下次浏览续取
    this.batchCursor = cursor;
    this.persistBatchCursor(cursor);
    return results;
  }

  /**
   * 聚合主题成员为合辑详情（含 items），并写入会话内存缓存。
   * 副标题为空时以封面成员导语兜底（数据驱动，无人工文案）。
   * 聚合失败向上抛错、不缓存（由 Presentation 展示降级态）。
   */
  private async aggregateCollection(
    theme: CollectionTheme
  ): Promise<CollectionDetail> {
    const cached = this.detailCache.get(theme.id);
    if (cached) return cached;

    let pages: WikivoyagePageDto[];
    if (theme.source === "category" && theme.categoryTitle) {
      pages = await this.api.getCategoryPages(
        theme.categoryTitle,
        CATEGORY_MEMBER_LIMIT,
        COLLECTION_THUMB_WIDTH
      );
    } else {
      pages = await this.api.getPagesByTitles(
        theme.memberTitles ?? [],
        COLLECTION_THUMB_WIDTH
      );
    }

    const items = pages.map(toCollectionPlaceItem);
    const coverItem = items.find((item) => item.imageUrl);
    const detail: CollectionDetail = {
      id: theme.id,
      title: theme.title,
      subtitle: theme.subtitle || coverItem?.extract || "",
      imageUrl: coverItem?.imageUrl ?? "",
      memberCount: items.length,
      starCount: items.filter((item) => item.isStar).length,
      source: theme.source,
      categoryTitle: theme.categoryTitle,
      items,
    };
    this.detailCache.set(theme.id, detail);
    return detail;
  }

  /**
   * 按 collectionId 在主题池中解析主题（池构建失败时返回 null）。
   * 兼容 id 的未编码/URL 编码形态（路由参数在不同环境下可能
   * 保留编码或已解码，两形态均尝试匹配）。
   */
  private async findThemeById(
    collectionId: string
  ): Promise<CollectionTheme | null> {
    const pool = await this.getThemePool();
    const decoded = tryDecodeURIComponent(collectionId);
    return (
      pool.find(
        (theme) => theme.id === collectionId || theme.id === decoded
      ) ?? null
    );
  }

  // -------------------------------------------------------------------------
  // 主题池构建与缓存
  // -------------------------------------------------------------------------

  /** 会话内存池缓存（懒加载，跨组件/页面共享） */
  private poolCache: CollectionTheme[] | null = null;
  /** 池构建进行中 Promise（并发去重：Generate more 连点等合并为一次构建） */
  private poolInFlight: Promise<CollectionTheme[]> | null = null;
  /** 成员聚合结果缓存（会话内；详情页命中 0 请求） */
  private detailCache = new Map<string, CollectionDetail>();
  /** 批次游标（已消费的主题池位置；-1 = 未初始化，懒读 sessionStorage） */
  private batchCursor = -1;

  /** 懒初始化批次游标（sessionStorage 恢复；不可用时从 0 开始） */
  private ensureBatchCursorLoaded(): void {
    if (this.batchCursor >= 0) return;
    if (typeof window === "undefined") {
      this.batchCursor = 0;
      return;
    }
    try {
      const raw = window.sessionStorage.getItem(BATCH_CURSOR_KEY);
      const parsed = raw ? Number(raw) : NaN;
      this.batchCursor =
        Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      this.batchCursor = 0;
    }
  }

  /** 批次游标写入 sessionStorage（尽力而为，失败不影响功能） */
  private persistBatchCursor(value: number): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(BATCH_CURSOR_KEY, String(value));
    } catch {
      // 忽略：缓存写入失败不影响功能
    }
  }

  /**
   * 获取主题池：内存 → sessionStorage（TTL 24h）→ 动态构建。
   * 构建失败返回空池且不缓存（限流/网络恢复后下次自动重试）。
   */
  private getThemePool(): Promise<CollectionTheme[]> {
    if (this.poolCache) return Promise.resolve(this.poolCache);
    if (this.poolInFlight) return this.poolInFlight;

    this.poolInFlight = this.loadPoolFromSession()
      .then((pool) => {
        this.poolCache = pool;
        return pool;
      })
      .catch(() =>
        this.buildThemePool().then((pool) => {
          this.poolCache = pool;
          this.persistPool(pool);
          return pool;
        })
      )
      .catch(() => {
        // 构建失败（限流/网络/分类结构变化）：返回空池，不缓存失败结论
        return [];
      })
      .finally(() => {
        this.poolInFlight = null;
      });
    return this.poolInFlight;
  }

  /** 从 sessionStorage 读取主题池（缺失/损坏/过期 → reject 触发重建） */
  private loadPoolFromSession(): Promise<CollectionTheme[]> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("sessionStorage unavailable"));
    }
    return new Promise((resolve, reject) => {
      try {
        const raw = window.sessionStorage.getItem(POOL_CACHE_KEY);
        if (!raw) {
          reject(new Error("no cached pool"));
          return;
        }
        const parsed = JSON.parse(raw) as PoolCachePayload;
        if (
          !parsed ||
          typeof parsed.savedAt !== "number" ||
          !Array.isArray(parsed.themes) ||
          Date.now() - parsed.savedAt > POOL_CACHE_TTL_MS
        ) {
          window.sessionStorage.removeItem(POOL_CACHE_KEY);
          reject(new Error("pool cache expired or invalid"));
          return;
        }
        resolve(parsed.themes);
      } catch {
        reject(new Error("pool cache read failed"));
      }
    });
  }

  /** 主题池写入 sessionStorage（尽力而为，失败不影响功能） */
  private persistPool(pool: CollectionTheme[]): void {
    if (typeof window === "undefined") return;
    try {
      const payload: PoolCachePayload = { savedAt: Date.now(), themes: pool };
      window.sessionStorage.setItem(POOL_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // 忽略：缓存写入失败不影响功能
    }
  }

  /**
   * 动态构建主题池（主题清单全部来自 API 响应，无硬编码主题）：
   *   1. Category:Malaysia 成员（子分类 + 文章，1 请求）→ 区域分类 + 专题文章；
   *   2. 并行遍历每个区域分类的子分类（4 请求）→ 叶子州分类；
   *   3. 分类主题 = 叶子州分类 + 区域分类（分类树顺序，数据驱动排序）；
   *   4. 州文章导语批量（1 请求，≤50 标题）→ 分类主题副标题；
   *   5. 行程：Category:South_East_Asia_itineraries 成员（1 请求）+
   *      文章详情（1 请求）→ 按坐标过滤马来西亚 → "Itineraries in Malaysia"；
   *   6. 专题文章（步骤 1 中的普通文章）→ "Travel Topics in Malaysia"。
   * 合成主题（5/6）的展示名为最小常量文案，成员清单全部动态；
   * 副标题留空由聚合时取首成员导语（数据驱动）。
   */
  private async buildThemePool(): Promise<CollectionTheme[]> {
    // 1. 根分类成员：子分类（区域）+ 普通文章（专题）
    const rootMembers = await this.api.listCategoryMembers(
      MALAYSIA_ROOT_CATEGORY,
      "subcat|page"
    );
    const regionCategories = rootMembers.filter((title) =>
      title.startsWith(CATEGORY_TITLE_PREFIX)
    );
    const topicTitles = rootMembers.filter(
      (title) => !title.startsWith(CATEGORY_TITLE_PREFIX)
    );

    // 2. 串行遍历区域子分类（叶子州分类；无子分类的区域自身即叶子）——
    //    串行 + 间隔避免突发请求触发 Wikivoyage 匿名限流
    const regionChildLists: string[][] = [];
    for (const region of regionCategories) {
      await sleep(REQUEST_SPACING_MS);
      regionChildLists.push(await this.api.listCategoryMembers(region, "subcat"));
    }

    // 3. 分类主题：叶子州分类在前、区域分类在后（均保留完整分类名）
    const leafCategories = regionChildLists.flat();
    const categoryThemes = [...leafCategories, ...regionCategories].map(
      (categoryTitle) => {
        const title = categoryTitle.slice(CATEGORY_TITLE_PREFIX.length);
        return {
          id: `cat:${categoryTitle}`,
          title,
          subtitle: "",
          source: "category" as const,
          categoryTitle,
        };
      }
    );

    // 4. 副标题：州文章导语批量（分类名去前缀 = 州文章标题，实测全部命中）
    await sleep(REQUEST_SPACING_MS);
    const subtitlePages = await this.api.getPagesByTitles(
      categoryThemes.map((theme) => theme.title)
    );
    const subtitleMap = new Map(
      subtitlePages.map((page) => [page.title, page.extract ?? ""])
    );
    for (const theme of categoryThemes) {
      theme.subtitle = subtitleMap.get(theme.title) ?? "";
    }

    // 5. 行程主题（成员经马来西亚 bbox 坐标过滤）
    await sleep(REQUEST_SPACING_MS);
    const itineraryTitles = await this.api.listCategoryMembers(
      ITINERARIES_SOURCE_CATEGORY,
      "page"
    );
    await sleep(REQUEST_SPACING_MS);
    const itineraryPages = await this.api.getPagesByTitles(itineraryTitles);
    const malaysiaItineraries = itineraryPages
      .filter((page) => isPageInMalaysia(page))
      .map((page) => page.title);

    // 6. 组装主题池：分类主题 → 专题 → 行程
    const themes: CollectionTheme[] = [...categoryThemes];
    if (topicTitles.length > 0) {
      themes.push({
        id: "topics",
        title: "Travel Topics in Malaysia",
        subtitle: "",
        source: "topics",
        memberTitles: topicTitles,
      });
    }
    if (malaysiaItineraries.length > 0) {
      themes.push({
        id: "itineraries",
        title: "Itineraries in Malaysia",
        subtitle: "",
        source: "itineraries",
        memberTitles: malaysiaItineraries,
      });
    }
    return themes;
  }
}

export const inspirationsService = new InspirationsService();
