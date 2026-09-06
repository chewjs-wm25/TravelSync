/**
 * HardcodedQualityRatingRepository — 模块 03 官方评级数据源实现（Data Access Layer, 浏览器端）
 *
 * @deprecated 本文件与 officalQualityRating_hardcode.json 已退出官方评级数据链路：
 * 数据源已切换为 MOTAC 官网实时爬虫（api_layer/.../MotacMyTqaApi → 服务端
 * QualityRatingWebSyncService，每日 cron / Admin Panel 按钮触发）。按仓库约定
 * （镜像 HardcodedEventRepository 先例）文件保留但不被任何代码引用，便于回滚。
 *
 * 历史职责：读取官方评级爬取结果（officalQualityRating_hardcode.json）并映射为
 * OfficialQualityRatingEntity 列表（Geoapify 字段初始为 null，待同步时补全）；
 * 不包含匹配/回退等业务判断（由 Business Logic Layer 负责）。
 */

import rawData from "./officalQualityRating_hardcode.json";
import type { OfficialQualityRatingEntity } from "./OfficialQualityRatingRepository";

/** JSON 原始行形态（与 officalQualityRating_hardcode.json 结构一致） */
interface RawOfficialQualityRating {
  id: string;
  company_name: string;
  company_address: string;
  company_phone: string | null;
  duration: string;
  award_category: string;
}

export class HardcodedQualityRatingRepository {
  /** 读取 JSON 全量条目（Geoapify 字段均为 null，等待同步补全） */
  listAll(): OfficialQualityRatingEntity[] {
    const rows = rawData as RawOfficialQualityRating[];
    return rows.map((row) => ({
      jsonId: row.id,
      companyName: row.company_name,
      companyAddress: row.company_address,
      companyPhone: row.company_phone,
      duration: row.duration,
      awardCategory: row.award_category,
      placeId: null,
      name: null,
      formatted: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      country: null,
      countryCode: null,
      category: null,
      resultType: null,
      lat: null,
      lon: null,
      confidence: null,
      syncedAt: 0,
    }));
  }
}

export const hardcodedQualityRatingRepository =
  new HardcodedQualityRatingRepository();
