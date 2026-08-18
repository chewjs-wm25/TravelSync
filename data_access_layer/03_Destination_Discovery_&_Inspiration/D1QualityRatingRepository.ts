/**
 * D1QualityRatingRepository — 模块 03 官方评级仓储的 Cloudflare D1 实现（Data Access Layer, 服务端）
 *
 * 职责：以 Cloudflare D1 持久化官方品质评级（JSON 原始字段 + Geoapify 补全详情），
 *       实现 OfficialQualityRatingRepository 接口。全部数据库操作（建表、查询、批量 upsert）
 *       内聚在本类，不包含任何 HTTP / 路由逻辑（传输由 Route API 承担）。
 *
 * 使用方式：由 Route API（app/03_Destination_Discovery_&_Inspiration/api/official-quality-ratings）以 D1 binding 实例化，
 *           浏览器端经 RemoteQualityRatingRepository → Route API → 本类完成读写。
 */

import type { D1Database } from "@cloudflare/workers-types";
import type {
  OfficialQualityRatingEntity,
  OfficialQualityRatingRepository,
} from "./OfficialQualityRatingRepository";

/** upsert 用全部列（INSERT 与 ON CONFLICT DO UPDATE 共用） */
const UPSERT_COLUMNS =
  "json_id, company_name, company_address, company_phone, duration, award_category, " +
  "place_id, name, formatted, address_line1, address_line2, city, state, country, " +
  "country_code, category, result_type, lat, lon, confidence, synced_at";

export class D1QualityRatingRepository implements OfficialQualityRatingRepository {
  constructor(private readonly db: D1Database) {}

  /** 懒建表：首次访问时确保 official_quality_ratings 表存在（幂等，见 schema.sql） */
  private async ensureTable(): Promise<void> {
    await this.db
      .prepare(
        "CREATE TABLE IF NOT EXISTS official_quality_ratings (" +
          "json_id         TEXT PRIMARY KEY, " +
          "company_name    TEXT NOT NULL, " +
          "company_address TEXT NOT NULL, " +
          "company_phone   TEXT, " +
          "duration        TEXT NOT NULL, " +
          "award_category  TEXT NOT NULL, " +
          "place_id        TEXT, " +
          "name            TEXT, " +
          "formatted       TEXT, " +
          "address_line1   TEXT, " +
          "address_line2   TEXT, " +
          "city            TEXT, " +
          "state           TEXT, " +
          "country         TEXT, " +
          "country_code    TEXT, " +
          "category        TEXT, " +
          "result_type     TEXT, " +
          "lat             REAL, " +
          "lon             REAL, " +
          "confidence      REAL, " +
          "synced_at       INTEGER NOT NULL" +
          ")"
      )
      .run();
  }

  async listAll(): Promise<OfficialQualityRatingEntity[]> {
    await this.ensureTable();
    const { results } = await this.db
      .prepare(
        "SELECT json_id AS jsonId, company_name AS companyName, " +
          "company_address AS companyAddress, company_phone AS companyPhone, " +
          "duration, award_category AS awardCategory, place_id AS placeId, name, " +
          "formatted, address_line1 AS addressLine1, address_line2 AS addressLine2, " +
          "city, state, country, country_code AS countryCode, category, " +
          "result_type AS resultType, lat, lon, confidence, synced_at AS syncedAt " +
          "FROM official_quality_ratings ORDER BY json_id ASC"
      )
      .all<OfficialQualityRatingEntity>();
    return results;
  }

  async upsertAll(items: OfficialQualityRatingEntity[]): Promise<number> {
    await this.ensureTable();
    const stmt = this.db.prepare(
      `INSERT INTO official_quality_ratings (${UPSERT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ` +
        "ON CONFLICT(json_id) DO UPDATE SET " +
        "company_name = excluded.company_name, " +
        "company_address = excluded.company_address, " +
        "company_phone = excluded.company_phone, " +
        "duration = excluded.duration, " +
        "award_category = excluded.award_category, " +
        "place_id = excluded.place_id, " +
        "name = excluded.name, " +
        "formatted = excluded.formatted, " +
        "address_line1 = excluded.address_line1, " +
        "address_line2 = excluded.address_line2, " +
        "city = excluded.city, " +
        "state = excluded.state, " +
        "country = excluded.country, " +
        "country_code = excluded.country_code, " +
        "category = excluded.category, " +
        "result_type = excluded.result_type, " +
        "lat = excluded.lat, " +
        "lon = excluded.lon, " +
        "confidence = excluded.confidence, " +
        "synced_at = excluded.synced_at"
    );
    for (const item of items) {
      await stmt
        .bind(
          item.jsonId,
          item.companyName,
          item.companyAddress,
          item.companyPhone,
          item.duration,
          item.awardCategory,
          item.placeId,
          item.name,
          item.formatted,
          item.addressLine1 ?? null,
          item.addressLine2 ?? null,
          item.city ?? null,
          item.state ?? null,
          item.country ?? null,
          item.countryCode ?? null,
          item.category ?? null,
          item.resultType ?? null,
          item.lat ?? null,
          item.lon ?? null,
          item.confidence ?? null,
          item.syncedAt
        )
        .run();
    }
    return items.length;
  }

  /** 清空全部官方评级数据；返回删除条数（表不存在时按 0 处理） */
  async clearAll(): Promise<number> {
    const result = await this.db
      .prepare("DELETE FROM official_quality_ratings")
      .run();
    return result.meta.changes;
  }
}
