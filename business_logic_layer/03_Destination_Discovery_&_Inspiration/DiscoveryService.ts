/**
 * DiscoveryService — 模块 03 目的地探索业务逻辑（Business Logic Layer）
 *
 * 职责：
 *   - 智能搜索与多维筛选（关键词 / 体验类型 / 品质评级 / 穆斯林友好 / 室内外场景）；
 *   - 搜索框输入自动联想（真实 Geoapify autocomplete）；
 *   - 灵感合辑、节日活动（含周边推荐）聚合；
 *   - POI 收藏状态合并（外部数据 + 用户收藏数据 → 领域形态 PoiItem）。
 *
 * 数据来源（真实第三方 API，见 api_layer）：
 *   - 地点搜索 / 联想 → Geoapify Geocoding API（限定马来西亚 countrycode:my）；
 *   - 灵感合辑 / 节日活动 / 筛选字典 → DiscoveryExternalApi（暂无免费数据源，mock 占位）。
 *
 * 依赖方向：Business Logic → API Layer（GeoapifyGeocodingApi / DiscoveryExternalApi）
 *                Business Logic → Data Access Layer（FavoritesRepository）
 * 说明：前端可完成的逻辑全部在本层完成（浏览器端执行），不依赖后端服务。
 */

import { discoveryExternalApi } from "../../api_layer/03_Destination_Discovery_&_Inspiration/DiscoveryExternalApi";
import {
  geoapifyGeocodingApi,
  type GeoapifyPlaceDto,
} from "../../api_layer/03_Destination_Discovery_&_Inspiration/GeoapifyGeocodingApi";
import { geoapifyPlaceDetailsApi } from "../../api_layer/03_Destination_Discovery_&_Inspiration/PlaceDetailsApi";
import { unsplashApi } from "../../api_layer/03_Destination_Discovery_&_Inspiration/UnsplashApi";
import type { FavoritesRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository";
import {
  CURRENT_USER_ID,
  sharedFavoritesRepository,
} from "./FavoritesService";
import type { OfficialQualityRatingEntity } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository";
import type { OfficialQualityRatingRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository";
import { remoteQualityRatingRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteQualityRatingRepository";
import type {
  Collection,
  EventFeedItem,
  FilterOptions,
  PlaceDetail,
  PoiItem,
  SearchFilters,
  SuggestionItem,
} from "./types";

/**
 * 马来西亚热门目的地种子词：
 * 搜索框为空时的"推荐"来源——每个种子词经 Geoapify 真实搜索取 top1，
 * 保证整页数据全部来自真实第三方 API（不再使用硬编码 mock POI）。
 */
const POPULAR_DESTINATIONS = [
  "Kuala Lumpur",
  "Penang",
  "Langkawi",
  "Malacca",
  "Johor Bahru",
  "Cameron Highlands",
  "Kota Kinabalu",
  "Kuching",
];

// ---------------------------------------------------------------------------
// Geoapify → PoiItem 映射与缺失字段推断（占位）
// Geoapify 为免费地理编码服务，不含门票/营业时间/设施/官方评级等旅游字段，
// 以下推断值仅为保持现有卡片 UI 完整而设，均已注明占位语义。
// ---------------------------------------------------------------------------

/** 官方评级 awardCategory（"Platinum" / "Gold" / "Silver"）→ 品质徽章等级 */
function awardCategoryToBadge(
  category: string
): NonNullable<PoiItem["qualityBadge"]> | undefined {
  const lower = category.toLowerCase();
  if (lower.includes("platinum")) return "platinum";
  if (lower.includes("gold")) return "gold";
  if (lower.includes("silver")) return "silver";
  return undefined;
}

/** 官方评级实体 → PoiItem 形态（徽章/地址/有效期取自官方评级数据，其余按现有推断） */
function toQualityRatedPoiItem(
  item: OfficialQualityRatingEntity,
  isFavourite: boolean
): PoiItem {
  const category = item.category ?? "";
  return {
    id: `geo-${item.placeId}`,
    placeId: item.placeId ?? undefined,
    name: item.name ?? item.companyName,
    imageUrl: "", // 官方评级数据无图片
    qualityBadge: awardCategoryToBadge(item.awardCategory),
    ratingDuration: item.duration,
    formatted: item.formatted ?? item.companyAddress,
    isFavourite,
    isOpenNow: true, // 占位：免费地理数据无营业时间
    suggestedDuration: inferSuggestedDuration(category),
    ticketPrice: "—", // 占位：免费地理数据无门票信息
    facilities: [], // 占位：免费地理数据无设施信息
    scene: inferScene(category, item.resultType ?? undefined),
    experienceType: inferExperienceType(category, item.resultType ?? undefined),
    isMuslimFriendly: true, // 占位：马来西亚整体对穆斯林游客友好
  };
}

/** 室内/室外场景：由 Geoapify 分类关键词推断（占位，默认 outdoor） */
function inferScene(category: string, resultType?: string): PoiItem["scene"] {
  const c = `${category} ${resultType ?? ""}`.toLowerCase();
  const indoorHints = [
    "museum",
    "arts_centre",
    "theatre",
    "library",
    "gallery",
    "cinema",
    "mall",
    "aquarium",
    "shopping",
  ];
  const outdoorHints = [
    "park",
    "natural",
    "beach",
    "mountain",
    "water",
    "garden",
    "viewpoint",
    "zoo",
    "stadium",
    "attraction",
  ];
  if (indoorHints.some((hint) => c.includes(hint))) return "indoor";
  if (outdoorHints.some((hint) => c.includes(hint))) return "outdoor";
  return "outdoor";
}

/** 体验类型：由 Geoapify 分类映射（与筛选字典 FilterOptionsDto 取值一致） */
function inferExperienceType(
  category: string,
  resultType?: string
): string {
  const c = `${category} ${resultType ?? ""}`.toLowerCase();
  if (
    ["museum", "arts_centre", "theatre", "gallery", "cinema", "library"].some(
      (hint) => c.includes(hint)
    )
  )
    return "Museums & Culture";
  if (
    ["restaurant", "cafe", "food", "bar", "fast_food"].some((hint) =>
      c.includes(hint)
    )
  )
    return "Food & Dining";
  if (["shop", "mall", "market"].some((hint) => c.includes(hint)))
    return "Shopping";
  if (
    [
      "park",
      "natural",
      "beach",
      "mountain",
      "garden",
      "zoo",
      "viewpoint",
      "sport",
    ].some((hint) => c.includes(hint))
  )
    return "Nature & Adventure";
  if (
    ["tourism", "attraction", "monument", "landmark"].some((hint) =>
      c.includes(hint)
    )
  )
    return "Attractions & Landmarks";
  if (
    ["administrative", "city", "town", "district"].some((hint) =>
      c.includes(hint)
    )
  )
    return "Cities & Towns";
  return "Discover Malaysia";
}

/** 建议停留时长：由分类粗略推断（占位） */
function inferSuggestedDuration(category: string): string {
  const c = category.toLowerCase();
  if (
    ["museum", "gallery", "arts"].some((hint) => c.includes(hint))
  )
    return "2-3 hrs";
  if (
    ["park", "garden", "beach", "natural", "mountain"].some((hint) =>
      c.includes(hint)
    )
  )
    return "2-3 hrs";
  return "1-2 hrs";
}

/** Geoapify 地点 DTO → 领域形态 PoiItem（缺失字段以推断值占位） */
function toPoiItem(place: GeoapifyPlaceDto): PoiItem {
  const category = place.category ?? "";
  return {
    id: `geo-${place.placeId}`,
    name: place.name,
    imageUrl: "", // 占位：免费地理数据无图片
    isOpenNow: true, // 占位：免费地理数据无营业时间
    suggestedDuration: inferSuggestedDuration(category),
    ticketPrice: "—", // 占位：免费地理数据无门票信息
    facilities: [], // 占位：免费地理数据无设施信息
    scene: inferScene(category, place.resultType),
    experienceType: inferExperienceType(category, place.resultType),
    isMuslimFriendly: true, // 占位：马来西亚整体对穆斯林游客友好
    isFavourite: false,
  };
}

/** Geoapify 地点 DTO → 地点详情（PoiItem + 完整地理字段） */
function toPlaceDetail(place: GeoapifyPlaceDto): PlaceDetail {
  return {
    ...toPoiItem(place),
    placeId: place.placeId,
    formatted: place.formatted,
    addressLine1: place.addressLine1,
    addressLine2: place.addressLine2,
    city: place.city,
    state: place.state,
    country: place.country,
    countryCode: place.countryCode,
    category: place.category,
    resultType: place.resultType,
    lat: place.lat,
    lon: place.lon,
  };
}

/** 地点图片缓存的 sessionStorage 键（跨页面导航复用结果，避免重复消耗免费额度） */
const PLACE_IMAGE_CACHE_KEY = "module03-place-image-cache";

export class DiscoveryService {
  constructor(
    private readonly externalApi = discoveryExternalApi,
    private readonly favoritesRepo: FavoritesRepository = sharedFavoritesRepository,
    private readonly geocodingApi = geoapifyGeocodingApi,
    private readonly qualityRatingRepo: OfficialQualityRatingRepository = remoteQualityRatingRepository,
    private readonly placeDetailsApi = geoapifyPlaceDetailsApi,
    private readonly unsplashClient = unsplashApi,
  ) {}

  /** 空搜索时热门目的地推荐结果缓存（真实数据，仅拉取一次避免重复消耗免费额度） */
  private popularPlacesCache?: GeoapifyPlaceDto[];

  /** 筛选面板候选项（体验类型） */
  async getFilterOptions(): Promise<FilterOptions> {
    const dto = await this.externalApi.fetchFilterOptions();
    return {
      experienceTypes: dto.experienceTypes,
    };
  }

  /** 灵感合辑列表 */
  async getCollections(): Promise<Collection[]> {
    const dtos = await this.externalApi.fetchCollections();
    return dtos.map(({ id, title, imageUrl }) => ({ id, title, imageUrl }));
  }

  /** 节日活动流（活动 + 周边住宿/餐饮推荐） */
  async getEventFeed(): Promise<EventFeedItem[]> {
    const dtos = await this.externalApi.fetchEvents();
    return dtos.map(({ id, name, dateRange, description, venue, nearby }) => ({
      id,
      name,
      dateRange,
      description,
      venue,
      nearby: nearby.map(({ name: placeName, category, distanceKm }) => ({
        name: placeName,
        category,
        distanceKm,
      })),
    }));
  }

  /** 搜索框输入联想（真实 Geoapify autocomplete，仅限马来西亚） */
  async getSuggestions(query: string): Promise<SuggestionItem[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const places = await this.geocodingApi.autocompletePlaces(trimmed, 6);
    return places.map(({ placeId, name, formatted, lat, lon }) => ({
      placeId,
      name,
      formatted,
      lat,
      lon,
    }));
  }

  /**
   * 按关键词搜索地点详情列表（搜索结果页数据源）。
   * 真实 Geoapify 正向搜索，返回含完整地理字段的 PlaceDetail[]。
   * 品质徽章：仅当 Geoapify place_id 命中 D1 官方评级数据时合并（未命中无徽章）。
   */
  async searchPlaceDetails(query: string): Promise<PlaceDetail[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const [places, badgeMap] = await Promise.all([
      this.geocodingApi.searchPlaces(trimmed, 10),
      this.getQualityBadgeMap(),
    ]);
    return places.map((place) => ({
      ...toPlaceDetail(place),
      qualityBadge: badgeMap.get(place.placeId),
    }));
  }

  /**
   * 按 place_id 获取单个地点详情（地点详情页数据源）。
   * Geoapify 无按 id 查询端点：以搜索词重新正向搜索，匹配返回中的 place_id。
   * 无搜索词时返回 null（place_id 不能作为 text 查询，避免返回错误地点）。
   * 品质徽章：仅当 place_id 命中 D1 官方评级数据时合并（未命中无徽章）。
   */
  async getPlaceDetail(
    placeId: string,
    queryText: string
  ): Promise<PlaceDetail | null> {
    const trimmed = queryText.trim();
    if (!trimmed) return null;
    const [places, badgeMap] = await Promise.all([
      this.geocodingApi.searchPlaces(trimmed, 5),
      this.getQualityBadgeMap(),
    ]);
    const place = places.find((p) => p.placeId === placeId);
    return place
      ? { ...toPlaceDetail(place), qualityBadge: badgeMap.get(place.placeId) }
      : null;
  }

  /**
   * 地点图片聚合（带缓存）：
   *   1. 缓存命中直接返回（含 "" 无图结果，避免重复消耗免费额度）；
   *   2. 先经 Geoapify Place Details API 抓取 wiki_and_media.image（免费媒体图）；
   *   3. 抓不到 → 按地名关键词（地点名 + Malaysia）调用免费 Unsplash API 兜底占位图；
   *   4. 仍无 → 返回 ""（前端展示渐变占位，不破坏页面）。
   * 所有外部请求失败均静默降级（客户端内部已吞错），图片增强不影响列表功能。
   * 缓存：内存 Map + sessionStorage 双层（跨页面导航复用；SSR/隐私模式下安全降级为纯内存）。
   */
  async getPlaceImage(placeId: string, placeName: string): Promise<string> {
    if (!placeId.trim()) return "";
    const cache = this.getImageCache();
    const cached = cache.get(placeId);
    if (cached !== undefined) return cached;

    const inFlight = this.imageInFlight.get(placeId);
    if (inFlight) return inFlight;

    const promise = (async () => {
      let image: string | null = null;
      try {
        image = await this.placeDetailsApi.getWikiMediaImage(placeId);
      } catch {
        image = null; // 客户端已降级，防御性兜底
      }
      if (!image) {
        try {
          image = await this.unsplashClient.searchPhoto(
            `${placeName.trim()} Malaysia`
          );
        } catch {
          image = null;
        }
      }
      return image ?? "";
    })()
      .then((url) => {
        cache.set(placeId, url);
        this.persistImageCache();
        return url;
      })
      .finally(() => {
        this.imageInFlight.delete(placeId);
      });

    this.imageInFlight.set(placeId, promise);
    return promise;
  }

  /** 地点图片内存缓存（懒初始化；null 表示尚未初始化） */
  private imageCache: Map<string, string> | null = null;

  /** 进行中的图片请求（同一 placeId 并发去重，避免重复消耗免费额度） */
  private imageInFlight = new Map<string, Promise<string>>();

  /** 懒加载图片缓存：内存 Map + 从 sessionStorage 恢复（不可用时纯内存） */
  private getImageCache(): Map<string, string> {
    if (!this.imageCache) {
      this.imageCache = new Map();
      if (typeof window !== "undefined") {
        try {
          const raw = window.sessionStorage.getItem(PLACE_IMAGE_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, string>;
            for (const [id, url] of Object.entries(parsed)) {
              this.imageCache.set(id, url);
            }
          }
        } catch {
          // sessionStorage 不可用（隐私模式等）：仅内存缓存
        }
      }
    }
    return this.imageCache;
  }

  /** 将图片缓存持久化到 sessionStorage（尽力而为，失败不影响功能） */
  private persistImageCache(): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        PLACE_IMAGE_CACHE_KEY,
        JSON.stringify(Object.fromEntries(this.getImageCache()))
      );
    } catch {
      // 忽略：缓存写入失败不影响功能
    }
  }

  /**
   * 官方评级徽章映射：D1 全部评级条目 → placeId → 徽章等级。
   * D1 读取失败时静默降级为空映射（搜索/详情仍可用，只是无徽章展示）。
   */
  private async getQualityBadgeMap(): Promise<
    Map<string, NonNullable<PoiItem["qualityBadge"]>>
  > {
    try {
      const items = await this.qualityRatingRepo.listAll();
      const map = new Map<string, NonNullable<PoiItem["qualityBadge"]>>();
      for (const item of items) {
        if (!item.placeId) continue;
        const badge = awardCategoryToBadge(item.awardCategory);
        if (badge) map.set(item.placeId, badge);
      }
      return map;
    } catch {
      return new Map();
    }
  }

  /**
   * 推荐地点（Recommended Places）：读取 Cloudflare D1 中官方品质评级数据
   * （浏览器端经 Route API → D1），映射为 PoiItem 并按筛选条件过滤。
   * 仅返回已成功匹配 Geoapify 地点（placeId 非空）的评级条目。
   */
  async getQualityRatedPois(filters: SearchFilters): Promise<PoiItem[]> {
    const [items, favorites] = await Promise.all([
      this.qualityRatingRepo.listAll(),
      this.favoritesRepo.listItems(CURRENT_USER_ID),
    ]);
    const favouriteIds = new Set(favorites.map((item) => item.id));

    return items
      .filter((item) => item.placeId && item.name)
      .map((item) =>
        toQualityRatedPoiItem(item, favouriteIds.has(`geo-${item.placeId}`))
      )
      .filter((poi) => {
        if (filters.scene !== "all" && poi.scene !== filters.scene) return false;
        if (
          filters.experienceType &&
          poi.experienceType !== filters.experienceType
        )
          return false;
        if (filters.isMuslimFriendly && !poi.isMuslimFriendly) return false;
        return true;
      });
  }

  /**
   * 搜索 + 多维筛选 + 合并收藏状态（业务编排，全部在 BL 完成）。
   * 数据源为真实 Geoapify：query 非空 → 正向搜索；query 为空 → 热门目的地推荐。
   * 返回的 PoiItem.isFavourite 由用户收藏数据（Data Access）合并得出。
   */
  async searchPois(filters: SearchFilters): Promise<PoiItem[]> {
    const [places, favorites] = await Promise.all([
      this.fetchPlaces(filters.query),
      this.favoritesRepo.listItems(CURRENT_USER_ID),
    ]);
    const favouriteIds = new Set(favorites.map((item) => item.id));

    return places
      .map(toPoiItem)
      .filter((poi) => {
        if (filters.scene !== "all" && poi.scene !== filters.scene) return false;
        if (filters.experienceType && poi.experienceType !== filters.experienceType)
          return false;
        if (filters.isMuslimFriendly && !poi.isMuslimFriendly) return false;
        return true;
      })
      .map((poi) => ({
        ...poi,
        isFavourite: favouriteIds.has(poi.id),
      }));
  }

  /**
   * 真实地点数据源：
   *   - query 非空 → Geoapify 正向搜索（匹配由 API 完成，本地不再按关键词过滤）；
   *   - query 为空 → 热门目的地种子词并行搜索各取 top1（首次结果缓存）。
   */
  private async fetchPlaces(query: string): Promise<GeoapifyPlaceDto[]> {
    const trimmed = query.trim();
    if (trimmed) {
      return this.geocodingApi.searchPlaces(trimmed);
    }
    if (!this.popularPlacesCache) {
      const results = await Promise.all(
        POPULAR_DESTINATIONS.map((seed) => this.geocodingApi.searchPlaces(seed, 1))
      );
      this.popularPlacesCache = results.flatMap((result) => result.slice(0, 1));
    }
    return this.popularPlacesCache;
  }
}

export const discoveryService = new DiscoveryService();
