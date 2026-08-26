/**
 * DiscoveryService — 模块 03 目的地探索业务逻辑（Business Logic Layer）
 *
 * 职责：
 *   - 智能搜索与多维筛选（关键词 / 体验类型 / 州属 / 室内外场景）；
 *   - 搜索框输入自动联想（真实 Geoapify autocomplete）；
 *   - 灵感合辑、节日活动（含周边推荐）聚合；
 *   - POI 收藏状态合并（外部数据 + 用户收藏数据 → 领域形态 PoiItem）。
 *   - Recommended Places（官方品质评级）独立展示：不受搜索与筛选影响。
 *
 * 数据来源（真实第三方 API，见 api_layer）：
 *   - 地点搜索 / 联想 → Geoapify Geocoding API（限定马来西亚 countrycode:my）；
 *   - 地点图片（统一链路 getPlaceImage，Wikimedia 前端直连 + Mapillary
 *     后端代理，均带马来西亚范围与地点/景点过滤）：
 *       Wikipedia 条目配图（"地点名 Malaysia"，强制马来西亚）→
 *       Wikimedia Commons Geosearch（按经纬度，马来西亚 bbox + 半径上限
 *       5000m + 文件坐标/标题过滤）→ Mapillary 兜底（马来西亚 bbox，
 *       仅当经纬度齐全）；
 *   - Recommended Places → Cloudflare D1 中官方品质评级数据（提供
 *     officalQualityRating_hardcode.json 所含信息：公司名/地址/电话/评级
 *     有效期/品质等级，及同步时 Nominatim 补全的经纬度），卡片图片复用
 *     统一图片链路（与 Search&Filter 同一封装、同一缓存）；
 *   - 灵感合辑 → InspirationsService（Wikivoyage 主题自动发现与内容聚合）；
 *   - 筛选字典 → DiscoveryExternalApi（暂无免费数据源，mock 占位）。
 *   - 节日活动 → Cloudflare D1（parsed_events.json 经 DEV 按钮同步，Data Access 层读取）。
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
import {
  wikidataApi,
  type WikidataPlaceDto,
} from "../../api_layer/03_Destination_Discovery_&_Inspiration/WikidataApi";
import { wikipediaImageApi } from "../../api_layer/03_Destination_Discovery_&_Inspiration/WikipediaImageApi";
import { wikivoyageImageApi } from "../../api_layer/03_Destination_Discovery_&_Inspiration/WikivoyageImageApi";
import { wikimediaGeosearchApi } from "../../api_layer/03_Destination_Discovery_&_Inspiration/WikimediaGeosearchApi";
import { mapillaryApi } from "../../api_layer/03_Destination_Discovery_&_Inspiration/MapillaryApi";
import { MALAYSIA_BBOX } from "../../api_layer/03_Destination_Discovery_&_Inspiration/MalaysiaBounds";
import type { WikimediaFileMeta } from "../../api_layer/03_Destination_Discovery_&_Inspiration/WikimediaFileMetaApi";
import type { FavoritesRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository";
import type { FavoriteItemEntity } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository";
import {
  currentUserId,
  sharedFavoritesRepository,
} from "./FavoritesService";
import type { OfficialQualityRatingEntity } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository";
import type { OfficialQualityRatingRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository";
import { remoteQualityRatingRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteQualityRatingRepository";
import { remoteEventRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteEventRepository";
import type { EventRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/EventRepository";
import type { PlaceImageCacheRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/PlaceImageCacheRepository";
import {
  parsePlaceImageEntry,
  serializePlaceImageEntry,
  type PlaceImageCacheEntry,
} from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/PlaceImageCacheRepository";
import { remotePlaceImageCacheRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/RemotePlaceImageCacheRepository";
import type {
  EventFeedItem,
  FilterOptions,
  PlaceDetail,
  PlaceImageAttribution,
  PlaceImageResult,
  PoiItem,
  SearchFilters,
  StateInfo,
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

/**
 * 详情页搜索兜底路径的返回条数上限。
 * Geoapify 免费套餐按请求计费，放宽 limit 不增加请求次数；
 * 官方评级地点已由 D1 直查，此值仅影响普通搜索结果地点的匹配成功率。
 */
const DETAIL_SEARCH_LIMIT = 20;

/**
 * 推荐种子词单次 Geoapify 搜索返回条数上限。
 * 放宽条数提高"具体实体"命中率（验证机制过滤道路/街区后仍有候选），
 * 1 次请求 = 1 credit，与 limit 无关，不增加免费额度消耗。
 */
const RECOMMENDED_SEARCH_LIMIT = 5;

/** Wikidata 来源地点的 placeId 前缀（与 Geoapify place_id 区分） */
const WIKIDATA_PLACE_ID_PREFIX = "wikidata:";

/** 马来西亚在 Wikidata 的国家实体 id（P17 country 属性取值） */
const MALAYSIA_WIKIDATA_ID = "Q833";
// 马来西亚大致边界（bbox）：共享常量见 api_layer MalaysiaBounds.ts
// （MALAYSIA_BBOX），本文件仅用于 Wikidata 实体坐标兜底过滤。

// ---------------------------------------------------------------------------
// 马来西亚州/联邦直辖区别名表（筛选 state 维度用）
// ---------------------------------------------------------------------------
// Geoapify（OSM 数据）对马来西亚返回的 state 字段与常用显示名存在差异
// （实测：Penang → "Pulau Pinang"、Malacca → "Melaka"、Kuala Lumpur →
// "Kuala Lumpur" 等）。筛选面板候选用显示名（见 DiscoveryExternalApi），
// 匹配时以归一化后的"包含"比较命中任一别名，兼容两种写法。
// 注意：别名全部小写（matchesState 归一化后比较）。
const STATE_ALIASES: Record<string, string[]> = {
  Johor: ["johor"],
  Kedah: ["kedah"],
  Kelantan: ["kelantan"],
  "Kuala Lumpur": ["kuala lumpur"],
  Labuan: ["labuan"],
  Melaka: ["melaka", "malacca"],
  "Negeri Sembilan": ["negeri sembilan"],
  Pahang: ["pahang"],
  Penang: ["penang", "pulau pinang", "pinang"],
  Perak: ["perak"],
  Perlis: ["perlis"],
  Putrajaya: ["putrajaya"],
  Sabah: ["sabah"],
  Sarawak: ["sarawak"],
  Selangor: ["selangor"],
  Terengganu: ["terengganu"],
};

// ---------------------------------------------------------------------------
// Recommended Places 实体验证机制
// ---------------------------------------------------------------------------
// 目标：推荐卡片展示的数据必须是"具体实体"（amenity / building /
// commercial / tourism 等 POI），而不是道路或街区（street / highway /
// district / suburb 等）。判定基于 Geoapify 返回的 result_type（OSM 风格
// 分类，如 "building"）与 category（如 "amenity.restaurant"）：
//   1. 命中黑名单（道路/街区/区域碎片）→ 不合格，触发 Wikidata 兜底；
//   2. 命中白名单（具体实体类）→ 合格且优先展示；
//   3. 其余（city / town / state 等大地点）→ 不算道路或街区，合格但
//      排在具体实体之后（城市级结果保留，避免城市种子词误伤）。
// 注：Geoapify 免费套餐无 result_type 完整枚举文档，词表按 OSM 分层
// 常见取值维护，判定时均转小写比较。

/** 道路/街区/区域碎片类 result_type（命中即不合格） */
const BLOCKED_RESULT_TYPES = new Set([
  "street",
  "highway",
  "road",
  "footway",
  "cycleway",
  "path",
  "service_road",
  "district",
  "suburb",
  "quarter",
  "neighbourhood",
  "borough",
  "municipality",
  "county",
  "province",
  "region",
  "locality",
  "postcode",
  "hamlet",
  "isolated_dwelling",
  "boundary",
]);

/** 具体实体类 result_type（命中即优先） */
const ENTITY_RESULT_TYPES = new Set([
  "amenity",
  "building",
  "commercial",
  "tourism",
  "leisure",
  "natural",
  "water",
  "railway",
  "historic",
  "shop",
  "office",
  "education",
  "healthcare",
  "entertainment",
  "finance",
  "food",
  "sport",
  "craft",
  "aeroway",
  "man_made",
  "military",
  "mountain",
  "peak",
  "viewpoint",
  "beach",
  "island",
  "cave",
  "waterfall",
  "garden",
  "zoo",
  "stadium",
  "museum",
  "attraction",
  "landmark",
  "monument",
  "place_of_worship",
]);

/** 具体实体类 category 前缀（result_type 缺失/特殊时按 category 识别） */
const ENTITY_CATEGORY_PREFIXES = [
  "amenity.",
  "building.",
  "commercial.",
  "tourism.",
  "leisure.",
  "natural.",
  "water.",
  "railway.",
  "historic.",
  "shop.",
  "office.",
  "education.",
  "healthcare.",
  "entertainment.",
  "finance.",
  "food.",
  "sport.",
  "craft.",
  "aeroway.",
  "man_made.",
  "military.",
  "place_of_worship.",
  "attraction.",
  "museum.",
];

/** 判定：是否道路/街区等非具体实体（黑名单命中 → 不合格，触发 Wikidata 兜底） */
function isRejectedPlace(place: GeoapifyPlaceDto): boolean {
  const resultType = (place.resultType ?? "").toLowerCase();
  return BLOCKED_RESULT_TYPES.has(resultType);
}

/** 判定：是否具体实体（白名单命中 → 推荐优先展示） */
function isConcreteEntity(place: GeoapifyPlaceDto): boolean {
  const resultType = (place.resultType ?? "").toLowerCase();
  if (ENTITY_RESULT_TYPES.has(resultType)) return true;
  const category = (place.category ?? "").toLowerCase();
  return ENTITY_CATEGORY_PREFIXES.some((prefix) => category.startsWith(prefix));
}

/** 推荐候选挑选：过滤道路/街区，具体实体优先，其次大地点（city/town/state 等） */
function pickBestRecommendation(
  places: GeoapifyPlaceDto[]
): GeoapifyPlaceDto | undefined {
  const valid = places.filter((place) => !isRejectedPlace(place));
  return valid.find(isConcreteEntity) ?? valid[0];
}

// ---------------------------------------------------------------------------
// Wikidata 兜底工具（Geoapify 返回道路/街区时的备用数据源）
// ---------------------------------------------------------------------------

/** 判定：Wikidata 实体是否位于马来西亚（P17 国家命中优先，坐标 bbox 兜底） */
function isInMalaysia(place: WikidataPlaceDto): boolean {
  if (place.countryId === MALAYSIA_WIKIDATA_ID) return true;
  if (typeof place.lat === "number" && typeof place.lon === "number") {
    return (
      place.lat >= MALAYSIA_BBOX.minLat &&
      place.lat <= MALAYSIA_BBOX.maxLat &&
      place.lon >= MALAYSIA_BBOX.minLon &&
      place.lon <= MALAYSIA_BBOX.maxLon
    );
  }
  return false;
}

/** Wikidata 实体 → GeoapifyPlaceDto 兼容形态（placeId 带 wikidata: 前缀区分来源） */
function toWikidataPlaceDto(place: WikidataPlaceDto): GeoapifyPlaceDto {
  return {
    placeId: `${WIKIDATA_PLACE_ID_PREFIX}${place.id}`,
    name: place.label,
    formatted: `${place.label}, Malaysia`,
    country: "Malaysia",
    countryCode: "my",
    resultType: "wikidata",
    lat: place.lat ?? 0,
    lon: place.lon ?? 0,
  };
}

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

/**
 * 官方评级实体 → PoiItem 形态。
 * 提供 officalQualityRating_hardcode.json 所含信息（公司名/地址/电话/评级
 * 有效期/品质等级）+ Nominatim 补全的经纬度；其余 Geoapify 补全字段不再使用，
 * 展示字段置空（Recommended Places 卡片不展示这些推断值）。
 */
function toQualityRatedPoiItem(
  item: OfficialQualityRatingEntity,
  isFavourite: boolean
): PoiItem {
  return {
    id: `json-${item.jsonId}`,
    placeId: item.placeId ?? undefined,
    lat: item.lat ?? undefined,
    lon: item.lon ?? undefined,
    name: item.companyName,
    imageUrl: "", // 图片另经统一图片链路获取（Wikipedia/Commons 前端直连 + Mapillary 后端代理），见 getPlaceImage
    qualityBadge: awardCategoryToBadge(item.awardCategory),
    ratingDuration: item.duration,
    formatted: item.companyAddress,
    phone: item.companyPhone ?? undefined,
    isFavourite,
    isOpenNow: false, // JSON 无营业状态信息
    suggestedDuration: "", // JSON 无建议停留时长信息
    ticketPrice: "", // JSON 无门票信息
    facilities: [], // JSON 无设施信息
    scene: "outdoor", // JSON 无室内外分类信息（取默认值）
    experienceType: "", // JSON 无体验类型信息
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
    lat: place.lat,
    lon: place.lon,
    state: place.state ?? undefined,
    imageUrl: "", // 占位：免费地理数据无图片
    isOpenNow: true, // 占位：免费地理数据无营业时间
    suggestedDuration: inferSuggestedDuration(category),
    ticketPrice: "—", // 占位：免费地理数据无门票信息
    facilities: [], // 占位：免费地理数据无设施信息
    scene: inferScene(category, place.resultType),
    experienceType: inferExperienceType(category, place.resultType),
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

/**
 * 文本归一化（防重复去重键用）：
 * trim + 转小写 + 压缩连续空白，消除 "Batu  Caves" 与 "batu caves" 之类
 * 仅因大小写/多余空格而不同的同义展示文本，保证去重判定稳定。
 */
function normalizeSearchText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * 地点图片缓存的 sessionStorage 键（跨页面导航复用结果，避免重复消耗免费额度）。
 * v5：统一图片链路（v5，见 getPlaceImage）新增 Wikivoyage 首环节、并携带
 * 作者/许可署名信息（attribution，开源协议展示合规），v4 及更早缓存（旧值
 * 格式无署名、且旧"确定无图"结果会阻挡新环节）整体失效、重新查询；
 * 旧键在读取时顺手清除。
 * v5 值格式：值为 PlaceImageCacheEntry 的 JSON 序列化（wikimedia url +
 * attribution / mapillary imageId + attribution / "" 无图）。
 */
const PLACE_IMAGE_CACHE_KEY = "module03-place-image-cache-v5";
/** 旧版缓存键（v1–v4 可能含脏"无图"结果与旧值格式，读取时顺手清除） */
const LEGACY_PLACE_IMAGE_CACHE_KEYS = [
  "module03-place-image-cache-v4",
  "module03-place-image-cache-v3",
  "module03-place-image-cache-v2",
  "module03-place-image-cache",
];

/**
 * Mapillary 图片 URL 内存复用有效期：thumb_1024_url 带签名会过期，
 * 持久化缓存只存 imageId，URL 仅在内存短期复用，过期后用 id 重新换取。
 */
const MAPILLARY_URL_TTL_MS = 60 * 60 * 1000;

/**
 * Commons Geosearch 统一搜索半径（米，上限值，见 WikimediaGeosearchApi）：
 * 统一图片链路固定 5000m——Recommended Places 的坐标为 Nominatim 降级
 * 命中的区域中心，需大半径覆盖附近地标；精确坐标也统一使用
 * （geosearch 按距离排序取首图，仍相对相关；文件坐标逐条马来西亚校验）。
 */
const RECOMMENDED_GEOSEARCH_RADIUS_METERS = 5000;

/**
 * Mapillary 图片的固定署名（Mapillary 服务条款：图片为 CC BY-SA 4.0，
 * 署名 "Mapillary contributors"；免费 API 不返回逐图作者，统一署名）。
 */
const MAPILLARY_ATTRIBUTION = {
  artist: "Mapillary contributors",
  licenseName: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
} as const;

/** 内存短期 URL 缓存条目 */
interface ImageUrlCacheEntry {
  url: string;
  /** 过期时间戳；Infinity = 永久（wikimedia 来源 URL） */
  expiresAt: number;
  /** 作者/许可署名信息（开源协议展示合规；wikimedia/mapillary 来源均存在） */
  attribution?: PlaceImageAttribution;
}

export class DiscoveryService {
  constructor(
    private readonly externalApi = discoveryExternalApi,
    private readonly favoritesRepo: FavoritesRepository = sharedFavoritesRepository,
    private readonly geocodingApi = geoapifyGeocodingApi,
    private readonly qualityRatingRepo: OfficialQualityRatingRepository = remoteQualityRatingRepository,
    private readonly eventRepo: EventRepository = remoteEventRepository,
    private readonly wikivoyageImageClient = wikivoyageImageApi,
    private readonly wikipediaImageClient = wikipediaImageApi,
    private readonly wikimediaGeosearchClient = wikimediaGeosearchApi,
    private readonly mapillaryClient = mapillaryApi,
    private readonly wikidataClient = wikidataApi,
    private readonly placeImageCache: PlaceImageCacheRepository = remotePlaceImageCacheRepository,
  ) {}

  /** 空搜索时热门目的地推荐结果缓存（真实数据，仅拉取一次避免重复消耗免费额度） */
  private popularPlacesCache?: GeoapifyPlaceDto[];

  /** 筛选面板候选项（体验类型 / 马来西亚州属） */
  async getFilterOptions(): Promise<FilterOptions> {
    const dto = await this.externalApi.fetchFilterOptions();
    return {
      experienceTypes: dto.experienceTypes,
      states: dto.states,
    };
  }

  /**
   * 州/省信息（供模块 02 创建旅行时选择州/省；字段遵循 guideline §5 坐标标准）。
   * 数据源：api_layer DiscoveryExternalApi.fetchStateInfo（当前为静态候选占位，
   * 未来替换真实 API 时签名不变）；浏览器端 BL 直接编排，不依赖后端服务。
   */
  async getStateInfo(): Promise<StateInfo[]> {
    const dto = await this.externalApi.fetchStateInfo();
    return dto.map(({ stateId, name, lat, lon, imageUrl }) => ({
      stateId,
      name,
      lat,
      lon,
      imageUrl,
    }));
  }

  /**
   * 灵感合辑：已迁至 InspirationsService（Wikivoyage 主题自动发现），
   * 调用方（Presentation hooks）改经 inspirationsService 获取。
   */

  /**
   * 节日活动流（活动 + 周边住宿/餐饮推荐）。
   * 数据源：Cloudflare D1 中 parsed_events.json 同步的官方活动（经 Route API 读取）。
   */
  async getEventFeed(): Promise<EventFeedItem[]> {
    const items = await this.eventRepo.listAll();
    return items.map(({ id, title, categories, date, location, url }) => ({
      id,
      title,
      categories,
      date,
      location,
      url,
      nearby: [], // 数据源无周边推荐，恒为空
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
   * 防重复：Geoapify 对同一地点可能返回多个条目（同一 POI 的多个 OSM 对象 /
   * 多个 place_id，或不同层级重复命中），返回前按"名称 + 地址"去重（见
   * dedupePlaceDetails），保证搜索结果页不出现名称、地址完全相同的地点。
   * filters：可选；传入时在返回前应用多维筛选（场景 / 体验类型 / 州属），
   * 筛选全部基于 Geoapify 真实返回字段（category 推断 + state），见 applyPoiFilters。
   */
  async searchPlaceDetails(
    query: string,
    filters?: SearchFilters
  ): Promise<PlaceDetail[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const [places, badgeMap] = await Promise.all([
      this.geocodingApi.searchPlaces(trimmed, 10),
      this.getQualityBadgeMap(),
    ]);
    const results = this.dedupePlaceDetails(
      places.map((place) => ({
        ...toPlaceDetail(place),
        qualityBadge: badgeMap.get(place.placeId),
      }))
    );
    return filters ? this.applyPoiFilters(results, filters) : results;
  }

  // -------------------------------------------------------------------------
  // 多维筛选核心（场景 / 体验类型 / 州属 / 品质评级）
  // -------------------------------------------------------------------------

  /**
   * 州属筛选匹配：Geoapify state 字段值与筛选候选项的别名包含比较。
   * 候选显示名（如 "Penang"）经别名表映射后与归一化 state 值双向包含匹配，
   * 兼容 "Pulau Pinang" / "Melaka" / "Malacca" 等 OSM 实际取值；
   * state 字段缺失的地点不匹配任何州属筛选（诚实过滤）。
   */
  private matchesState(
    stateValue: string | undefined,
    selectedState: string
  ): boolean {
    if (!stateValue) return false;
    const norm = normalizeSearchText(stateValue);
    const aliases = STATE_ALIASES[selectedState] ?? [selectedState];
    return aliases.some((alias) => norm.includes(alias) || alias.includes(norm));
  }

  /**
   * 对已加载的 POI 列表应用多维筛选（纯计算，不发起请求）。
   * 筛选维度全部基于 POI 携带的真实数据：
   *   - scene：Geoapify 分类推断值（官方评级数据无分类信息，取默认 outdoor）；
   *   - experienceType：Geoapify 分类推断值（官方评级数据为空串）；
   *   - state：Geoapify 真实州字段（官方评级数据无该字段）。
   * 注：品质评级（qualityBadge）不属于搜索筛选维度——Recommended Places
   * 独立展示官方评级数据，不受搜索栏筛选影响（见 getQualityRatedPois）。
   */
  applyPoiFilters<T extends PoiItem>(pois: T[], filters: SearchFilters): T[] {
    return pois.filter((poi) => {
      if (filters.scene !== "all" && poi.scene !== filters.scene) return false;
      if (
        filters.experienceType &&
        poi.experienceType !== filters.experienceType
      )
        return false;
      if (filters.state && !this.matchesState(poi.state, filters.state))
        return false;
      return true;
    });
  }

  /** 对已加载的地点详情列表应用多维筛选（搜索页复用，纯计算不发起请求） */
  filterPlaceDetails(
    details: PlaceDetail[],
    filters: SearchFilters
  ): PlaceDetail[] {
    return this.applyPoiFilters(details, filters);
  }

  /**
   * 搜索结果防重复地点（名称 + 地址去重）：
   * Geoapify 正向搜索对同一地点常返回多条近似条目——同一 POI 存在多个
   * OSM 对象 / 多个 place_id，或 street 与 amenity 等不同层级重复命中，
   * 导致搜索结果页出现名称、地址完全相同的地点卡片。
   * 去重规则：
   *   1. 去重键 = 归一化后的"名称 + 展示地址"（地址取 addressLine1 →
   *      addressLine2 → formatted 的优先顺序，与搜索结果卡片展示的地址一致，
   *      即用户视觉上"名称、地址一样"的卡片视为同一地点）；
   *   2. 保留首次出现项——Geoapify 结果按相关度排序，首个通常最匹配，
   *      其 placeId 亦用于详情页跳转与收藏；
   *   3. 无名称的条目直接剔除（无法展示也无法跳转详情）；
   *   4. 仅名称相同但地址不同（如不同城市的同名地点）不视为重复，均保留。
   */
  private dedupePlaceDetails(places: PlaceDetail[]): PlaceDetail[] {
    const seen = new Set<string>();
    const result: PlaceDetail[] = [];
    for (const place of places) {
      const name = normalizeSearchText(place.name);
      if (!name) continue; // 无名称条目直接剔除
      const address = normalizeSearchText(
        place.addressLine1 || place.addressLine2 || place.formatted
      );
      const key = `${name}\u0000${address}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(place);
    }
    return result;
  }

  /**
   * 按 place_id 获取单个地点详情（地点详情页数据源）。
   * 两级策略：
   *   1. 官方评级地点（Recommended Places 来源，D1 已存完整地理字段）：
   *      按 place_id 直接从官方评级数据读取，不依赖外部搜索——修复小地点
   *      （如 Mengkabong Bay）重搜 topN 匹配不上 place_id 导致详情页无法加载的问题；
   *   2. 其余地点（Geoapify 搜索结果）：以搜索词重新正向搜索并匹配 place_id 兜底
   *      （放宽返回条数提高匹配成功率；无搜索词时返回 null，
   *      place_id 不能作为 text 查询，避免返回错误地点）。
   * 品质徽章：官方评级命中直接映射 awardCategory；搜索兜底路径在 place_id 命中
   * D1 官方评级数据时合并（未命中无徽章）。
   */
  async getPlaceDetail(
    placeId: string,
    queryText: string
  ): Promise<PlaceDetail | null> {
    const rated = await this.findQualityRatedByPlaceId(placeId);
    if (rated) return this.toQualityRatedPlaceDetail(rated);

    const trimmed = queryText.trim();
    if (!trimmed) return null;

    // Wikidata 来源（Recommended Places 兜底）：placeId 形如 "wikidata:Qxxx"，
    // Geoapify 无法按该 placeId 匹配，改用地点名搜索取第一个合格结果，
    // 失败时直接用 Wikidata 实体数据构造详情。
    if (placeId.startsWith(WIKIDATA_PLACE_ID_PREFIX)) {
      return this.getWikidataPlaceDetail(placeId, trimmed);
    }

    const [places, badgeMap] = await Promise.all([
      this.geocodingApi.searchPlaces(trimmed, DETAIL_SEARCH_LIMIT),
      this.getQualityBadgeMap(),
    ]);
    const place = places.find((p) => p.placeId === placeId);
    return place
      ? { ...toPlaceDetail(place), qualityBadge: badgeMap.get(place.placeId) }
      : null;
  }

  /**
   * Wikidata 来源地点详情（Recommended Places 兜底卡片点击进入）：
   *   1. 用地点名（queryText）搜索 Geoapify，取第一个合格结果（过滤道路/街区，
   *      具体实体优先），复用既有 Geoapify 详情形态；
   *   2. Geoapify 搜索失败/无合格结果 → 用 Wikidata 实体数据直构详情
   *      （name / 坐标 / resultType=wikidata）。
   */
  private async getWikidataPlaceDetail(
    placeId: string,
    queryText: string
  ): Promise<PlaceDetail | null> {
    try {
      const places = await this.geocodingApi.searchPlaces(
        queryText,
        DETAIL_SEARCH_LIMIT
      );
      const place = pickBestRecommendation(places);
      if (place) return toPlaceDetail(place);
    } catch {
      // Geoapify 瞬时失败：继续走 Wikidata 直构兜底
    }

    const qid = placeId.slice(WIKIDATA_PLACE_ID_PREFIX.length);
    try {
      const [detail] = await this.wikidataClient.getPlaceDetails([qid]);
      if (
        !detail ||
        typeof detail.lat !== "number" ||
        typeof detail.lon !== "number"
      ) {
        return null;
      }
      const poi = toPoiItem(toWikidataPlaceDto(detail));
      return {
        ...poi,
        placeId,
        formatted: `${detail.label}, Malaysia`,
        country: "Malaysia",
        countryCode: "my",
        resultType: "wikidata",
        lat: detail.lat,
        lon: detail.lon,
      };
    } catch {
      return null;
    }
  }

  /**
   * 按 place_id 在官方评级数据中查找条目（D1 读取失败时静默降级返回 null，
   * 由调用方走搜索兜底路径）。
   */
  private async findQualityRatedByPlaceId(
    placeId: string
  ): Promise<OfficialQualityRatingEntity | null> {
    try {
      const items = await this.qualityRatingRepo.listAll();
      return items.find((item) => item.placeId === placeId && item.name) ?? null;
    } catch {
      return null;
    }
  }

  /** 官方评级条目 → 地点详情（D1 已存完整地理字段，无需再调 Geoapify） */
  private toQualityRatedPlaceDetail(
    item: OfficialQualityRatingEntity
  ): PlaceDetail | null {
    if (!item.placeId || !item.name || item.lat == null || item.lon == null) {
      return null;
    }
    return {
      ...toQualityRatedPoiItem(item, false),
      placeId: item.placeId,
      formatted: item.formatted ?? item.companyAddress,
      addressLine1: item.addressLine1 ?? undefined,
      addressLine2: item.addressLine2 ?? undefined,
      city: item.city ?? undefined,
      state: item.state ?? undefined,
      country: item.country ?? "",
      countryCode: item.countryCode ?? "",
      category: item.category ?? undefined,
      resultType: item.resultType ?? undefined,
      lat: item.lat,
      lon: item.lon,
    };
  }

  /**
   * 地点图片聚合（带缓存）——Recommended Places 与 Search&Filter 的统一封装：
   *   1. 内存短期 URL 缓存命中直接返回（wikimedia 来源长期有效；
   *      mapillary 来源 URL 带签名有时效，仅 1 小时内复用，过期用引用重新换取）；
   *   2. 引用缓存（来源引用格式，内存 + sessionStorage + Cloudflare KV）：
   *      - wikimedia 来源：URL 永久，直接返回；
   *      - mapillary 来源：用 imageId 换取当前有效 URL（持久化只存 id，不存 URL）；
   *      - none：确定无图，返回 null；
   *   3. 未命中时按统一链查询（Wikimedia 前端直连 + Mapillary 后端代理，
   *      均带过滤器——马来西亚范围 + 地点/景点图片 + 开源协议署名，详见 api_layer）：
   *      → Wikivoyage 条目配图（链首："intitle:{地点名} Malaysia" 标题搜索
   *        → 全文搜索兜底，条目标题关键词校验，Commons extmetadata 作者/许可）
   *      → Wikipedia 条目配图（"地点名 Malaysia"，API 层强制马来西亚关键词
   *        与首图黑名单过滤，排除 logo/flag/map 等非地点图）
   *      → Wikimedia Commons Geosearch（按经纬度，入口坐标须在马来西亚 bbox
   *        内、半径上限 5000m，逐文件坐标/标题过滤，标题含地点名者优先）
   *      → Mapillary 兜底（仅当 lat/lon 齐全，按经纬度搜索图片 id 再换取 URL；
   *        客户端 + 服务端双层马来西亚 bbox 校验，固定署名 Mapillary contributors）；
   *   4. 仍无 → 返回 null（前端以 Icon 表示无图，不破坏页面）。
   * 开源协议合规：返回结果携带 attribution（原作者 + 许可声明，如 CC BY-SA
   * 4.0），前端展示时必须保留（Wikimedia 来源经 Commons extmetadata 获取，
   * 仅接受来自 Commons 的文件——本地 fair use 图片无开源许可，直接跳过）。
   * 缓存键：placeId（调用方统一传 place.placeId ?? place.id，如 Geoapify
   * place_id / json-{jsonId}）；placeId 为空时以地点名作后备键。
   * 缓存策略（关键）：仅缓存"确定结果"——有图总缓存（mapillary 只缓存 imageId，
   * attribution 随条目缓存）；"确定无图"仅在所有数据源都**请求成功且确定无图**
   * 时缓存。瞬时失败（429 限流 / 网络错误 / 密钥未配置）由 API 客户端抛错，
   * 本方法不写入缓存，下次浏览自动重试，避免配额恢复后图片仍永久缺失。
   * 缓存层级：内存 URL 短期缓存 + 内存/sessionStorage 引用缓存（跨页面导航复用；
   * SSR/隐私模式下安全降级为纯内存）→ Cloudflare KV 引用缓存（跨会话持久，
   * 浏览器端经 Route API 读写；确定结果回写 KV）。
   */
  async getPlaceImage(
    placeId: string,
    placeName: string,
    lat?: number,
    lon?: number
  ): Promise<PlaceImageResult | null> {
    const cacheKey = placeId.trim() || placeName.trim();
    if (!cacheKey) return null;

    // 1. 内存短期 URL 缓存（wikimedia 长期 / mapillary 1 小时）
    const cached = this.getImageUrlCache().get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { url: cached.url, attribution: cached.attribution };
    }

    const inFlight = this.imageInFlight.get(cacheKey);
    if (inFlight) return inFlight;

    const promise = (async (): Promise<PlaceImageResult | null> => {
      // 2. 引用缓存（内存/sessionStorage 已合并加载，键与 place id 关联）
      const localRef = this.getImageRefCache().get(cacheKey);
      if (localRef) return this.resolveImageRef(cacheKey, localRef);

      // 3. Cloudflare KV 引用缓存：命中（含 none 确定无图）回填本地并返回
      //    （KV 不可用时静默降级，按未命中处理）
      try {
        const remoteRef = await this.placeImageCache.get(cacheKey);
        if (remoteRef !== null) {
          this.getImageRefCache().set(cacheKey, remoteRef);
          this.persistImageCache();
          return this.resolveImageRef(cacheKey, remoteRef);
        }
      } catch {
        // KV 缓存不可用（本地未启动 / 网络错误）：忽略，按未命中处理
      }

      let result: PlaceImageResult | null = null;
      let source: PlaceImageCacheEntry["source"] = "wikimedia";
      let mapillaryImageId = "";

      // 4. Wikivoyage 条目配图（前端直连，链首）：旅行指南条目首图
      //    （API 层强制：intitle:{地点名} Malaysia 标题搜索 → 全文搜索兜底、
      //    条目标题含地点名关键词校验、仅接受 Commons 文件并携带作者/许可）
      let wikivoyageDeterminate = true;
      try {
        const wikivoyageImage = await this.wikivoyageImageClient.findImage({
          placeName,
        });
        if (wikivoyageImage) result = this.wikimediaResult(wikivoyageImage);
      } catch {
        wikivoyageDeterminate = false; // 瞬时失败：不得据此缓存"无图"
      }

      // 5. Wikipedia 条目配图（前端直连）："地点名 Malaysia" 搜索条目取首图
      //    （API 层强制马来西亚关键词 + 首图黑名单过滤，排除 logo/flag/map 等）
      let wikipediaDeterminate = true;
      if (!result) {
        try {
          const wikipediaImage = await this.wikipediaImageClient.findImage({
            placeName,
          });
          if (wikipediaImage) result = this.wikimediaResult(wikipediaImage);
        } catch {
          wikipediaDeterminate = false; // 瞬时失败：不得据此缓存"无图"
        }
      }

      // 6. Wikimedia Commons Geosearch（前端直连，仅当经纬度齐全且上一步无图）：
      //    按经纬度搜索图片（API 层强制：入口坐标须在马来西亚 bbox 内、
      //    半径上限 5000m、逐文件坐标/标题过滤、标题含地点名者优先）
      let geosearchDeterminate = true;
      if (!result && lat != null && lon != null) {
        try {
          const geosearchImage =
            await this.wikimediaGeosearchClient.findImageByCoords({
              lat,
              lon,
              radiusMeters: RECOMMENDED_GEOSEARCH_RADIUS_METERS,
              placeName,
            });
          if (geosearchImage) result = this.wikimediaResult(geosearchImage);
        } catch {
          geosearchDeterminate = false; // 瞬时失败：不得据此缓存"无图"
        }
      }

      // 7. Mapillary 兜底（仅当经纬度齐全且前级均无图，经本地代理端点）：
      //    按经纬度搜索图片 id → 用 id 换取有时效的 URL；持久化只缓存 id
      //    （客户端 + 服务端双层马来西亚 bbox 校验，见 MapillaryApi / Route API；
      //    固定署名 Mapillary contributors, CC BY-SA 4.0）
      let mapillaryDeterminate = true;
      if (!result && lat != null && lon != null) {
        try {
          const foundId = await this.mapillaryClient.findImageId(lat, lon);
          if (foundId) {
            mapillaryImageId = foundId;
            const url = await this.mapillaryClient.getImageUrl(foundId);
            if (url) {
              result = {
                url,
                attribution: { ...MAPILLARY_ATTRIBUTION },
              };
              source = "mapillary";
            }
          }
        } catch {
          mapillaryDeterminate = false; // 瞬时失败：不得据此缓存"无图"
        }
      }

      // 有图总缓存；"确定无图"仅在所有数据源均确定无图时缓存（避免瞬时故障污染缓存）
      if (
        result ||
        (wikivoyageDeterminate &&
          wikipediaDeterminate &&
          geosearchDeterminate &&
          mapillaryDeterminate)
      ) {
        const entry: PlaceImageCacheEntry =
          result && source === "mapillary"
            ? {
                source: "mapillary",
                imageId: mapillaryImageId,
                attribution: result.attribution,
              }
            : result
              ? {
                  source: "wikimedia",
                  url: result.url,
                  attribution: result.attribution,
                }
              : { source: "none" };
        await this.persistDeterminateImage(cacheKey, entry);
        if (result) {
          // 回填内存短期 URL 缓存（mapillary 1 小时，wikimedia 长期）
          this.setImageUrlCache(
            cacheKey,
            result.url,
            source === "mapillary"
              ? Date.now() + MAPILLARY_URL_TTL_MS
              : Infinity,
            result.attribution
          );
        }
      }
      return result;
    })().finally(() => {
      this.imageInFlight.delete(cacheKey);
    });

    this.imageInFlight.set(cacheKey, promise);
    return promise;
  }

  /** Wikimedia 客户端结果（缩略图 URL + 作者/许可）→ 领域形态 PlaceImageResult */
  private wikimediaResult(meta: WikimediaFileMeta): PlaceImageResult {
    return {
      url: meta.thumbUrl,
      attribution: {
        artist: meta.artist,
        licenseName: meta.licenseName,
        licenseUrl: meta.licenseUrl,
        credit: meta.credit,
      },
    };
  }

  /**
   * 解析引用缓存条目为可展示结果（并回填内存短期 URL 缓存）。
   * 返回语义：null = 确定无图（none）；PlaceImageResult = 可展示图片（含署名）；
   * resolveImageRef 内部对 mapillary 换取失败返回 null（瞬时状态，不写缓存，
   * 下次重试）。
   */
  private async resolveImageRef(
    placeId: string,
    ref: PlaceImageCacheEntry
  ): Promise<PlaceImageResult | null> {
    if (ref.source === "none") return null;
    if (ref.source === "wikimedia") {
      if (ref.url) {
        this.setImageUrlCache(placeId, ref.url, Infinity, ref.attribution);
        return { url: ref.url, attribution: ref.attribution };
      }
      return null;
    }
    // mapillary：用持久化的 imageId 换取当前有效 URL（URL 有时效，仅内存短期复用）
    if (ref.imageId) {
      try {
        const url = await this.mapillaryClient.getImageUrl(ref.imageId);
        this.setImageUrlCache(
          placeId,
          url,
          Date.now() + MAPILLARY_URL_TTL_MS,
          ref.attribution
        );
        return { url, attribution: ref.attribution };
      } catch {
        return null; // 瞬时失败：引用缓存保留，下次查询用同一 id 重试
      }
    }
    return null;
  }

  /**
   * 确定结果（来源引用条目）写入三层缓存：
   * 内存引用 Map + sessionStorage + Cloudflare KV（KV 写入失败静默降级，不影响本次返回）。
   * 注意：mapillary 来源只写 imageId（URL 有时效，永不持久化）。
   */
  private async persistDeterminateImage(
    placeId: string,
    entry: PlaceImageCacheEntry
  ): Promise<void> {
    this.getImageRefCache().set(placeId, entry);
    this.persistImageCache();
    try {
      await this.placeImageCache.put(placeId, entry);
    } catch {
      // KV 缓存不可用（本地未启动 / 网络错误）：忽略，下次查询重试
    }
  }

  /**
   * 清空全部地点图片缓存（DEV 工具，供 DEV-ACCOUNT-STATE 页面按钮调用）：
   *   1. Cloudflare KV（经 Route API 逐键删除，仅本模块键前缀范围）；
   *   2. 浏览器 sessionStorage 各版本缓存键（v1/v2/v3）；
   *   3. 内存引用/URL 短期缓存与进行中请求表。
   * KV 清空失败时静默降级（仅清本地缓存），返回实际清除的 KV 条目数。
   */
  async clearImageCaches(): Promise<number> {
    let kvCleared = 0;
    try {
      kvCleared = await this.placeImageCache.clearAll();
    } catch {
      // KV 不可用（本地未启动 / 网络错误）：忽略，仅清本地缓存
    }
    this.imageRefCache?.clear();
    this.imageUrlCache?.clear();
    this.imageInFlight.clear();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(PLACE_IMAGE_CACHE_KEY);
        for (const legacyKey of LEGACY_PLACE_IMAGE_CACHE_KEYS) {
          window.sessionStorage.removeItem(legacyKey);
        }
      } catch {
        // sessionStorage 不可用：忽略
      }
    }
    return kvCleared;
  }

  /** 内存短期 URL 缓存（wikimedia 长期 / mapillary 1 小时；懒初始化） */
  private imageUrlCache: Map<string, ImageUrlCacheEntry> | null = null;

  /** 地点图片引用缓存（来源引用格式，懒初始化并从 sessionStorage 恢复） */
  private imageRefCache: Map<string, PlaceImageCacheEntry> | null = null;

  /** 进行中的图片请求（同一 placeId 并发去重，避免重复消耗免费额度） */
  private imageInFlight = new Map<string, Promise<PlaceImageResult | null>>();

  /** 懒加载内存短期 URL 缓存 */
  private getImageUrlCache(): Map<string, ImageUrlCacheEntry> {
    if (!this.imageUrlCache) {
      this.imageUrlCache = new Map();
    }
    return this.imageUrlCache;
  }

  /** 写入内存短期 URL 缓存（attribution 随条目缓存，开源协议署名展示所需） */
  private setImageUrlCache(
    placeId: string,
    url: string,
    expiresAt: number,
    attribution?: PlaceImageAttribution
  ): void {
    this.getImageUrlCache().set(placeId, { url, expiresAt, attribution });
  }

  /** 懒加载引用缓存：内存 Map + 从 sessionStorage 恢复（不可用时纯内存） */
  private getImageRefCache(): Map<string, PlaceImageCacheEntry> {
    if (!this.imageRefCache) {
      this.imageRefCache = new Map();
      if (typeof window !== "undefined") {
        try {
          // 清除旧版缓存键（v1 可能含瞬时失败写入的脏"无图"结果）
          for (const legacyKey of LEGACY_PLACE_IMAGE_CACHE_KEYS) {
            window.sessionStorage.removeItem(legacyKey);
          }
          const raw = window.sessionStorage.getItem(PLACE_IMAGE_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, string>;
            for (const [id, value] of Object.entries(parsed)) {
              const entry = parsePlaceImageEntry(value);
              if (entry) this.imageRefCache.set(id, entry);
            }
          }
        } catch {
          // sessionStorage 不可用（隐私模式等）：仅内存缓存
        }
      }
    }
    return this.imageRefCache;
  }

  /** 将引用缓存持久化到 sessionStorage（尽力而为，失败不影响功能） */
  private persistImageCache(): void {
    if (typeof window === "undefined") return;
    try {
      const serialized: Record<string, string> = {};
      for (const [id, entry] of this.getImageRefCache()) {
        serialized[id] = serializePlaceImageEntry(entry);
      }
      window.sessionStorage.setItem(
        PLACE_IMAGE_CACHE_KEY,
        JSON.stringify(serialized)
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
   * 当前登录用户的收藏数据（未登录返回空集，避免无意义的远程读取）。
   * 用户 ID 来自会话（currentUserId），服务端以会话凭证为准。
   */
  private async currentFavorites(): Promise<FavoriteItemEntity[]> {
    if (!currentUserId()) return [];
    return this.favoritesRepo.listItems();
  }

  /**
   * 推荐地点（Recommended Places）：读取 Cloudflare D1 中官方品质评级数据
   * （浏览器端经 Route API → D1），映射为 PoiItem。
   * 与搜索栏完全解绑：本方法不接受筛选条件，始终返回全部官方评级地点
   * （仅提供 officalQualityRating_hardcode.json 所含信息：公司名/地址/电话/
   * 评级有效期/品质等级），Recommended Places 只专注于展示 Offical Quality
   * Rating，不受搜索词、体验类型、州属、场景等搜索栏状态影响。
   */
  async getQualityRatedPois(): Promise<PoiItem[]> {
    const [items, favorites] = await Promise.all([
      this.qualityRatingRepo.listAll(),
      this.currentFavorites(),
    ]);
    const favouriteIds = new Set(favorites.map((item) => item.id));

    return this.dedupeQualityRatedItems(items).map((item) =>
      toQualityRatedPoiItem(item, favouriteIds.has(`json-${item.jsonId}`))
    );
  }

  /**
   * 官方评级条目按 jsonId 去重（同一 JSON 条目只保留一条）：
   * 优先保留品质等级最高者（platinum > gold > silver > 无等级），
   * 同级取 syncedAt 最新者；无 jsonId/companyName 的条目直接剔除。
   */
  private dedupeQualityRatedItems(
    items: OfficialQualityRatingEntity[]
  ): OfficialQualityRatingEntity[] {
    const badgeWeight: Record<string, number> = {
      platinum: 3,
      gold: 2,
      silver: 1,
    };
    const bestByJsonId = new Map<string, OfficialQualityRatingEntity>();
    for (const item of items) {
      if (!item.jsonId || !item.companyName) continue;
      const existing = bestByJsonId.get(item.jsonId);
      if (!existing) {
        bestByJsonId.set(item.jsonId, item);
        continue;
      }
      const existingWeight = badgeWeight[existing.awardCategory.toLowerCase()] ?? 0;
      const itemWeight = badgeWeight[item.awardCategory.toLowerCase()] ?? 0;
      if (
        itemWeight > existingWeight ||
        (itemWeight === existingWeight &&
          item.syncedAt >= existing.syncedAt)
      ) {
        bestByJsonId.set(item.jsonId, item);
      }
    }
    return Array.from(bestByJsonId.values());
  }

  /**
   * 搜索 + 多维筛选 + 合并收藏状态（业务编排，全部在 BL 完成）。
   * 数据源为真实 Geoapify：query 非空 → 正向搜索；query 为空 → 热门目的地推荐。
   * 返回的 PoiItem.isFavourite 由用户收藏数据（Data Access）合并得出。
   */
  async searchPois(filters: SearchFilters): Promise<PoiItem[]> {
    const [places, favorites] = await Promise.all([
      this.fetchPlaces(filters.query),
      this.currentFavorites(),
    ]);
    const favouriteIds = new Set(favorites.map((item) => item.id));

    return this.applyPoiFilters(
      places.map(toPoiItem),
      filters
    ).map((poi) => ({
      ...poi,
      isFavourite: favouriteIds.has(poi.id),
    }));
  }

  /**
   * 真实地点数据源：
   *   - query 非空 → Geoapify 正向搜索（匹配由 API 完成，本地不再按关键词过滤）；
   *   - query 为空 → Recommended Places：热门目的地种子词经实体验证机制
   *     过滤道路/街区后取最优结果（具体实体优先），全部不合格时用 Wikidata
   *     兜底寻找该地点的命名实体（首次结果缓存）。
   */
  private async fetchPlaces(query: string): Promise<GeoapifyPlaceDto[]> {
    const trimmed = query.trim();
    if (trimmed) {
      return this.geocodingApi.searchPlaces(trimmed);
    }
    if (!this.popularPlacesCache) {
      // Geoapify 阶段并行（快，配额按请求计费）；Wikidata 兜底阶段串行
      // （顺序逐个请求，避免并发瞬时请求触发 Wikidata 限流）。
      const geoResults = await Promise.all(
        POPULAR_DESTINATIONS.map((seed) =>
          this.geocodingApi.searchPlaces(seed, RECOMMENDED_SEARCH_LIMIT)
        )
      );
      const results: (GeoapifyPlaceDto | null)[] = [];
      for (let i = 0; i < POPULAR_DESTINATIONS.length; i++) {
        // 验证机制：过滤道路/街区，具体实体优先，其次大地点；
        // 结果全是道路/街区（或空）→ Wikidata 兜底寻找该地点的命名实体。
        const best = pickBestRecommendation(geoResults[i]);
        results.push(
          best ?? (await this.findWikidataPlace(POPULAR_DESTINATIONS[i]))
        );
      }
      this.popularPlacesCache = results.filter(
        (place): place is GeoapifyPlaceDto => place !== null
      );
    }
    return this.popularPlacesCache;
  }

  /**
   * Wikidata 兜底：按种子词搜索命名实体，过滤马来西亚后取第一个有坐标的。
   * Wikidata 瞬时失败（网络/限流）静默降级返回 null，由调用方跳过该种子词。
   */
  private async findWikidataPlace(
    query: string
  ): Promise<GeoapifyPlaceDto | null> {
    try {
      const candidates = await this.wikidataClient.searchPlaces(query, 5);
      if (candidates.length === 0) return null;
      const details = await this.wikidataClient.getPlaceDetails(
        candidates.map((candidate) => candidate.id)
      );
      const place = details.find(
        (item) =>
          isInMalaysia(item) &&
          typeof item.lat === "number" &&
          typeof item.lon === "number"
      );
      return place ? toWikidataPlaceDto(place) : null;
    } catch {
      return null;
    }
  }
}

export const discoveryService = new DiscoveryService();
