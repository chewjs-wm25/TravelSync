/**
 * DiscoveryExternalApi — 模块 03 外部第三方 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与外部第三方 API 交流（Geoapify 地理编码 / 官方活动数据源等）；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 当前状态：
 *   - 地点搜索与自动联想 → 真实 Geoapify Geocoding API（见 ./GeoapifyGeocodingApi.ts）；
 *   - 灵感合辑 / 节日活动 / 筛选维度字典 → 暂无免费数据源，暂以硬编码 mock 占位。
 *
 * 未来对接点（仅需替换各方法内部实现，方法签名保持不变，上层无需改动）：
 *   - fetchCollections   → 官方灵感合辑 / 内容 API
 *   - fetchEvents        → 官方节日活动日历 API（含活动场地周边推荐）
 *   - fetchFilterOptions → 筛选维度字典 API（体验类型 / 品质评级）
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述第三方 API 返回结构）
// ---------------------------------------------------------------------------

export interface NearbyPlaceDto {
  name: string;
  category: "hotel" | "restaurant" | "food";
  distanceKm: number;
}

export interface EventDto {
  id: string;
  name: string;
  dateRange: string;
  description: string;
  venue?: string;
  nearby: NearbyPlaceDto[];
}

export interface CollectionDto {
  id: string;
  title: string;
  imageUrl: string;
}

export interface FilterOptionsDto {
  experienceTypes: string[];
}

// ---------------------------------------------------------------------------
// Mock 数据（硬编码占位，未来替换为真实第三方 API 响应）
// 注：旅游规划范围仅限马来西亚（项目约束）。
// ---------------------------------------------------------------------------

const MOCK_COLLECTIONS: CollectionDto[] = [
  { id: "col-george-town-trail", title: "George Town Heritage Trail", imageUrl: "" },
  { id: "col-penang-food-trail", title: "Penang Hawker Food Trail", imageUrl: "" },
  { id: "col-kl-art-circuit", title: "KL Art & Museum Circuit", imageUrl: "" },
];

const MOCK_EVENTS: EventDto[] = [
  {
    id: "evt-rwfm",
    name: "Rainforest World Music Festival",
    dateRange: "2025-06-27 ~ 2025-06-29",
    description:
      "Experience world-class ethnic music performances at the Sarawak Cultural Village.",
    venue: "Sarawak Cultural Village, Kuching",
    nearby: [
      { name: "Riverside Majestic Hotel", category: "hotel", distanceKm: 4.2 },
      { name: "Top Spot Food Court", category: "food", distanceKm: 3.8 },
    ],
  },
  {
    id: "evt-thaipusam",
    name: "Thaipusam Festival",
    dateRange: "2025-02-11 ~ 2025-02-11",
    description: "Witness the spectacular Hindu procession to the Batu Caves temple.",
    venue: "Batu Caves, Selangor",
    nearby: [
      { name: "Batu Caves Hotel", category: "hotel", distanceKm: 0.5 },
      { name: "Jalan Alor Night Market", category: "food", distanceKm: 0.3 },
    ],
  },
];

const MOCK_FILTER_OPTIONS: FilterOptionsDto = {
  // 与 BL 层 Geoapify 结果推断映射（geoapifyToPoiItem）的 experienceType 取值保持一致
  experienceTypes: [
    "Cities & Towns",
    "Attractions & Landmarks",
    "Museums & Culture",
    "Food & Dining",
    "Shopping",
    "Nature & Adventure",
    "Discover Malaysia",
  ],
};

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class DiscoveryExternalApi {
  async fetchCollections(): Promise<CollectionDto[]> {
    return MOCK_COLLECTIONS;
  }

  async fetchEvents(): Promise<EventDto[]> {
    return MOCK_EVENTS;
  }

  async fetchFilterOptions(): Promise<FilterOptionsDto> {
    return MOCK_FILTER_OPTIONS;
  }
}

export const discoveryExternalApi = new DiscoveryExternalApi();
