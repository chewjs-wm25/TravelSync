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
 *   - 节日活动 → 已迁移至 Cloudflare D1（parsed_events.json 经 DEV 按钮同步），
 *     由 Data Access 层 Event 仓储读取，不再经本 API。
 *
 * 未来对接点（仅需替换各方法内部实现，方法签名保持不变，上层无需改动）：
 *   - fetchFilterOptions → 筛选维度字典 API（体验类型）
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述第三方 API 返回结构）
// ---------------------------------------------------------------------------

export interface FilterOptionsDto {
  experienceTypes: string[];
  /** 马来西亚州/联邦直辖区候选（Geoapify state 字段的显示名，如 "Penang"） */
  states: string[];
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

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class DiscoveryExternalApi {
  async fetchFilterOptions(): Promise<FilterOptionsDto> {
    return MOCK_FILTER_OPTIONS;
  }
}

export const discoveryExternalApi = new DiscoveryExternalApi();
