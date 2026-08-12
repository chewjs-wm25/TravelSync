/**
 * OfficialQualityRatingRepository — 模块 03 官方品质评级仓储接口（Data Access Layer）
 *
 * 职责（单一）：
 *   - 封装"官方品质评级"数据的持久化读写（来源：官方评级 hardcode JSON，
 *     经 Geoapify 补全地点详情后写入 Cloudflare D1）；
 *   - 不包含任何业务判断（匹配/回退策略由 Business Logic Layer 负责）。
 *
 * 实现类：
 *   - HardcodedQualityRatingRepository（浏览器端）：直接读取 officalQualityRating_hardcode.json；
 *   - D1QualityRatingRepository（服务端）：操作 Cloudflare D1（SQL 内聚于此）；
 *   - RemoteQualityRatingRepository（浏览器端）：经 Route API 转发到服务端实现。
 *
 * 调用方（Business Logic Layer）只依赖本接口，切换实现时无需改动。
 */

// ---------------------------------------------------------------------------
// 实体类型（对应 D1 表 official_quality_ratings 的一行）
// ---------------------------------------------------------------------------

/** 官方品质评级条目：JSON 原始字段 + Geoapify 补全的地点详情 */
export interface OfficialQualityRatingEntity {
  /** JSON 原始条目 id（D1 主键） */
  jsonId: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string | null;
  /** 官方评级有效期（如 "07/08/25 - 06/08/28"） */
  duration: string;
  /** 官方品质评级（Platinum / Gold / Silver） */
  awardCategory: string;
  // ---- Geoapify 补全字段（未匹配到地点时为 null） ----
  /** Geoapify place_id */
  placeId: string | null;
  name: string | null;
  formatted: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  countryCode?: string | null;
  category?: string | null;
  resultType?: string | null;
  lat?: number | null;
  lon?: number | null;
  /** Geoapify 匹配置信度 0~1 */
  confidence?: number | null;
  /** 写入/更新时间戳（毫秒） */
  syncedAt: number;
}

// ---------------------------------------------------------------------------
// 仓储接口
// ---------------------------------------------------------------------------

export interface OfficialQualityRatingRepository {
  /** 列出全部官方评级条目 */
  listAll(): Promise<OfficialQualityRatingEntity[]>;
  /** 批量写入/更新（按 jsonId upsert）；返回实际写入条数 */
  upsertAll(items: OfficialQualityRatingEntity[]): Promise<number>;
}
