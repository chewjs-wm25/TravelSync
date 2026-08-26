/**
 * types.ts — 模块 03 领域模型总出口（Business Logic Layer）
 *
 * 依赖方向：Presentation → Business Logic → Data Access / API。
 * 本文件为领域类型唯一出口：Presentation 只允许从这里导入类型；
 * 下层（data_access_layer / api_layer）的类型也经此 re-export，
 * 保证上层不直接依赖下层、下层不反向依赖上层。
 */

// ---------------------------------------------------------------------------
// re-export 下层类型（BL 可正向依赖下层）
// ---------------------------------------------------------------------------

export type { GeoapifyPlaceDto } from "../../api_layer/03_Destination_Discovery_&_Inspiration/GeoapifyGeocodingApi";

import type {
  FavoriteItemEntity,
  FavoritesRepository,
} from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository";

export type {
  FavoriteItemEntity,
  FavoritesRepository,
};

import type { PlaceImageAttribution } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/PlaceImageCacheRepository";

export type { PlaceImageAttribution };

export type {
  OfficialQualityRatingEntity,
  OfficialQualityRatingRepository,
} from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository";

export type { PushToRoutePlannerResult } from "./RoutePlannerBridge";

// ---------------------------------------------------------------------------
// 领域类型
// ---------------------------------------------------------------------------

/** 室内外场景分类（与 SearchAndFilter 的场景标签页对应） */
export type activeType = "indoor" | "outdoor" | "all";

/** 搜索与多维筛选条件（组合后驱动 POI 查询/过滤） */
export interface SearchFilters {
  /** 关键词（地点、地标、主题） */
  query: string;
  /** 体验类型（如 "Cultural Heritage"），空串表示不限 */
  experienceType: string;
  /** 室内外场景（"all" 表示不限） */
  scene: activeType;
  /** 马来西亚州/联邦直辖区（如 "Penang"），空串表示不限 */
  state: string;
}

/**
 * 灵感合辑条目（数据源：Wikivoyage 自动发现的主题 + 真实内容聚合，
 * 见 InspirationsService；默认展示 3 个，可"生成更多"）。
 */
export interface Collection {
  /** 主题源标识："cat:{CategoryTitle}" | "topics" | "itineraries" */
  id: string;
  /** 展示标题：分类名（去 "Category:" 前缀）或固定主题名 */
  title: string;
  /** 副标题：州文章导语（数据驱动，可能为空） */
  subtitle: string;
  /** 封面图（成员中首个有图文章的缩略图；无 → ""，前端渐变占位） */
  imageUrl: string;
  /** 成员数量（实际命中数） */
  memberCount: number;
  /** Wikivoyage Star 条目数量（pageprops 徽章检测） */
  starCount: number;
  /** 主题来源类型（决定详情页聚合方式） */
  source: "category" | "topics" | "itineraries";
  /** source=category 时的完整分类名（详情页聚合用） */
  categoryTitle?: string;
}

/** 合辑成员目的地条目（Wikivoyage 文章映射后的领域形态） */
export interface CollectionPlaceItem {
  /** 文章标题（Wikivoyage 内唯一，作条目 id） */
  id: string;
  title: string;
  /** Wikivoyage 导语摘要（exintro，纯文本，2 句） */
  extract: string;
  imageUrl: string;
  /** Wikivoyage Star 徽章（社区质量评级，与官方品质徽章区分） */
  isStar: boolean;
  lat?: number;
  lon?: number;
  /** 完整指南外部链接 */
  wikivoyageUrl: string;
}

/** 合辑详情（合辑摘要 + 成员列表） */
export interface CollectionDetail extends Collection {
  items: CollectionPlaceItem[];
}

/** 附近灵感条目（geosearch 附近目的地） */
export interface NearbyInspiration {
  title: string;
  imageUrl: string;
  isStar: boolean;
  /** 距中心点距离（米） */
  distanceMeters: number;
  wikivoyageUrl: string;
}

/** 设施状态标签（无障碍、停车等基础设施状态） */
export interface FacilityTag {
  type: string;
  label: string;
  status: "available" | "limited" | "unavailable";
}

/** 地点决策卡片条目（BL 聚合外部数据 + 用户收藏状态后的领域形态） */
export interface PoiItem {
  id: string;
  /**
   * 地点标识：搜索来源为 Geoapify place_id（跳转地点详情页用）；
   * 官方评级（Recommended Places）来源为 JSON 条目 id，placeId 可为空
   * （sync 不再补全 Geoapify 字段）。
   */
  placeId?: string;
  /** 地点坐标（Geoapify 来源填充；官方评级/收藏来源无坐标） */
  lat?: number;
  lon?: number;
  name: string;
  imageUrl: string;
  /**
   * 官方品质评级徽章（数据源：Cloudflare D1 中爬取的 Offical Quality Rating，
   * 来自 officalQualityRating_hardcode.json 同步）。
   * 仅当地点与官方评级匹配（placeId 命中）时才存在；未匹配的地点不展示徽章。
   */
  qualityBadge?: "platinum" | "gold" | "silver";
  /** 官方评级有效期（如 "07/08/25 - 06/08/28"，来自官方评级数据） */
  ratingDuration?: string;
  /**
   * 完整格式化地址（官方评级地点的展示地址）
   */
  formatted?: string;
  /** 马来西亚州/联邦直辖区（Geoapify 来源填充，如 "Pulau Pinang"；官方评级来源无） */
  state?: string;
  /** 联系电话（官方评级数据 company_phone；仅 Recommended Places 提供） */
  phone?: string;
  /** 是否已被用户收藏（由 BL 合并 Data Access 数据得出） */
  isFavourite: boolean;
  isOpenNow: boolean;
  suggestedDuration: string;
  ticketPrice: string;
  bestVisitTime?: string;
  facilities: FacilityTag[];
  scene: "indoor" | "outdoor";
  experienceType: string;
}

/** 节日/活动条目（数据源：Cloudflare D1 中 parsed_events.json 同步的官方活动） */
export interface EventItem {
  id: string;
  /** 活动名称 */
  title: string;
  /** 活动分类（如 "Arts & Culture"、"Sports"） */
  categories: string[];
  /** 活动举办日期区间（如 "19 Jun 2026 - 25 Apr 2027"） */
  date: string;
  /** 活动举办地点 */
  location: string;
  /** 活动官方页面 URL（点击卡片外部打开） */
  url: string;
}

/** 活动场地周边的住宿/餐饮推荐 */
export interface NearbyPlace {
  name: string;
  category: "hotel" | "restaurant" | "food";
  distanceKm: number;
}

/** 节日活动 + 其周边推荐（BL 聚合后的活动流条目；当前数据源无周边推荐，恒为空） */
export interface EventFeedItem extends EventItem {
  nearby: NearbyPlace[];
}

/** 搜索联想建议条目（真实 Geoapify autocomplete 结果的领域形态） */
export interface SuggestionItem {
  placeId: string;
  name: string;
  /** 完整格式化地址（如 "Batu Caves, Selangor, Malaysia"） */
  formatted: string;
  lat: number;
  lon: number;
}

/**
 * 地点详情（搜索结果/详情页形态）：PoiItem 展示字段 + Geoapify 完整地理字段。
 * 由 BL 聚合（toPlaceDetail），供搜索结果页与地点详情页使用。
 */
export interface PlaceDetail extends PoiItem {
  /** Geoapify place_id */
  placeId: string;
  /** 完整格式化地址 */
  formatted: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country: string;
  countryCode: string;
  /** 地点分类（如 "tourism.attraction"） */
  category?: string;
  /** 结果类型（city / amenity / tourism / street ...） */
  resultType?: string;
  lat: number;
  lon: number;
}

/** 收藏夹条目（领域形态，与 DA 实体一致；每个用户只有一个收藏夹） */
export type SavedItem = FavoriteItemEntity;

/** 筛选面板的候选项（体验类型 / 马来西亚州属） */
export interface FilterOptions {
  experienceTypes: string[];
  /** 马来西亚州/联邦直辖区候选（Geoapify state 字段的显示名，如 "Penang"） */
  states: string[];
}

/**
 * 地点图片查询结果（BL 统一图片链路 getPlaceImage 的返回形态）。
 * url 为空串表示确定无图（前端以无图 Icon 展示）；有图时 attribution
 * 携带开源协议署名信息（原作者 + 许可声明，CC BY-SA 等），展示必须保留。
 */
export interface PlaceImageResult {
  /** 图片 URL（upload.wikimedia.org / Mapillary 签名 URL，可直接热链） */
  url: string;
  /** 作者/许可署名信息（开源协议展示合规） */
  attribution?: PlaceImageAttribution;
}

/**
 * 州/省信息（供模块 02 创建旅行时选择州/省；字段遵循 guideline §5 坐标标准，
 * 数据源见 api_layer DiscoveryExternalApi.fetchStateInfo，当前为静态候选占位）。
 */
export interface StateInfo {
  /** 州/联邦直辖区标识（小写 slug，如 "penang"、"kuala-lumpur"） */
  stateId: string;
  /** 州/联邦直辖区显示名（如 "Penang"） */
  name: string;
  /** 州首府/主要城市纬度 */
  lat: number;
  /** 州首府/主要城市经度 */
  lon: number;
  /** 州封面图 URL（暂无数据源，空串由前端渐变占位） */
  imageUrl: string;
}
