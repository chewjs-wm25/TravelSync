/**
 * DiscoveryExternalApi — 模块 03 外部第三方 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与外部第三方 API 交流（Geoapify 地理编码 / 官方活动数据源等）；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 当前状态：
 *   - 地点搜索与自动联想 → 真实 Geoapify Geocoding API（见 ./GeoapifyGeocodingApi.ts）；
 *   - 灵感合辑 → 已迁至真实 Wikivoyage API（见 ./WikivoyageApi.ts，
 *     由 Business Logic 层 InspirationsService 编排主题自动发现与内容聚合）；
 *   - 筛选维度字典 → 暂无免费数据源，暂以硬编码静态候选占位：
 *       - 体验类型（experienceTypes）：与 BL 层 Geoapify 结果推断映射取值一致；
 *       - 马来西亚州/直辖区（states）：Geoapify 结果 state 字段的静态地理事实
 *         （马来西亚 13 州 + 3 联邦直辖区，不含在搜索结果中提取，因候选须完整）。
 *   - 州/省信息（StateInfo，供模块 02 创建旅行时选择州/省）→ 暂无免费数据源，
 *     暂以硬编码静态候选占位（州首府/主要城市坐标，imageUrl 空串由前端占位）；
 *   - 节日活动 → 已迁移至 Cloudflare D1（parsed_events.json 经 DEV 按钮同步），
 *     由 Data Access 层 Event 仓储读取，不再经本 API。
 *
 * 未来对接点（仅需替换各方法内部实现，方法签名保持不变，上层无需改动）：
 *   - fetchFilterOptions → 筛选维度字典 API（体验类型）
 *   - fetchStateInfo → 州/省信息 API（含州级坐标与封面图）
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述第三方 API 返回结构）
// ---------------------------------------------------------------------------

export interface FilterOptionsDto {
  experienceTypes: string[];
  /** 马来西亚州/联邦直辖区候选（Geoapify state 字段的显示名，如 "Penang"） */
  states: string[];
}

/** 州/省信息 DTO（对外提供；坐标遵循 guideline §5 扁平 lat/lon 标准） */
export interface StateInfoDto {
  /** 州/联邦直辖区标识（小写 slug，如 "penang"、"kuala-lumpur"） */
  stateId: string;
  /** 州/联邦直辖区显示名（与 FilterOptionsDto.states 一致） */
  name: string;
  /** 州首府/主要城市纬度 */
  lat: number;
  /** 州首府/主要城市经度 */
  lon: number;
  /** 州封面图 URL（暂无数据源，空串由前端渐变占位） */
  imageUrl: string;
}

// ---------------------------------------------------------------------------
// 静态候选数据（硬编码占位，未来替换为真实第三方 API 响应）
// 注：旅游规划范围仅限马来西亚（项目约束）。
// ---------------------------------------------------------------------------

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
  // 马来西亚 13 州 + 3 联邦直辖区（静态地理事实；Geoapify state 字段的实际取值
  // 与显示名存在差异，如 "Pulau Pinang" ↔ Penang，匹配逻辑在 BL 层别名表处理）
  states: [
    "Johor",
    "Kedah",
    "Kelantan",
    "Kuala Lumpur",
    "Labuan",
    "Melaka",
    "Negeri Sembilan",
    "Pahang",
    "Penang",
    "Perak",
    "Perlis",
    "Putrajaya",
    "Sabah",
    "Sarawak",
    "Selangor",
    "Terengganu",
  ],
};

/**
 * 州/省信息静态候选（硬编码占位，未来替换为真实第三方 API 响应）。
 * 坐标取州首府/主要城市（静态地理事实，供模块 02 创建旅行时选择州/省并
 * 在地图上定位）；imageUrl 暂无数据源，空串由前端渐变占位。
 */
const MOCK_STATE_INFO: StateInfoDto[] = [
  { stateId: "johor", name: "Johor", lat: 1.4927, lon: 103.7414, imageUrl: "" },
  { stateId: "kedah", name: "Kedah", lat: 6.1184, lon: 100.3685, imageUrl: "" },
  { stateId: "kelantan", name: "Kelantan", lat: 6.1256, lon: 102.2383, imageUrl: "" },
  { stateId: "kuala-lumpur", name: "Kuala Lumpur", lat: 3.139, lon: 101.6869, imageUrl: "" },
  { stateId: "labuan", name: "Labuan", lat: 5.2831, lon: 115.2308, imageUrl: "" },
  { stateId: "melaka", name: "Melaka", lat: 2.1896, lon: 102.2501, imageUrl: "" },
  { stateId: "negeri-sembilan", name: "Negeri Sembilan", lat: 2.7258, lon: 101.9424, imageUrl: "" },
  { stateId: "pahang", name: "Pahang", lat: 3.8077, lon: 103.326, imageUrl: "" },
  { stateId: "penang", name: "Penang", lat: 5.4141, lon: 100.3288, imageUrl: "" },
  { stateId: "perak", name: "Perak", lat: 4.5975, lon: 101.0901, imageUrl: "" },
  { stateId: "perlis", name: "Perlis", lat: 6.44, lon: 100.1988, imageUrl: "" },
  { stateId: "putrajaya", name: "Putrajaya", lat: 2.9264, lon: 101.6964, imageUrl: "" },
  { stateId: "sabah", name: "Sabah", lat: 5.9804, lon: 116.0735, imageUrl: "" },
  { stateId: "sarawak", name: "Sarawak", lat: 1.5533, lon: 110.3592, imageUrl: "" },
  { stateId: "selangor", name: "Selangor", lat: 3.0738, lon: 101.5183, imageUrl: "" },
  { stateId: "terengganu", name: "Terengganu", lat: 5.3302, lon: 103.1408, imageUrl: "" },
];

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class DiscoveryExternalApi {
  async fetchFilterOptions(): Promise<FilterOptionsDto> {
    return MOCK_FILTER_OPTIONS;
  }

  /** 州/省信息（供模块 02 创建旅行时选择州/省；当前为硬编码静态候选占位） */
  async fetchStateInfo(): Promise<StateInfoDto[]> {
    return MOCK_STATE_INFO;
  }
}

export const discoveryExternalApi = new DiscoveryExternalApi();
