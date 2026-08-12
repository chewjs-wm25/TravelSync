/**
 * QualityRatingSyncService — 模块 03 官方品质评级同步业务逻辑（Business Logic Layer）
 *
 * 职责（单一）：
 *   - 编排"官方评级 hardcode JSON → Geoapify 补全地点详情 → 写入 Cloudflare D1"全流程；
 *   - 匹配策略：先按 company_name 搜索（top1），无结果回退 company_address（top1），
 *     仍无结果则跳过该条（不写入 D1）；
 *   - 幂等策略：已存在有效 Geoapify place_id 的条目不再调用 Geoapify（节省免费额度），
 *     仅用 JSON 原始字段覆盖更新；
 *   - Geoapify 请求分批并发（默认 5 并发），避免免费套餐限流。
 *
 * 依赖方向：Business Logic → Data Access Layer（JSON 仓储 / 远程 D1 仓储）
 *                Business Logic → API Layer（GeoapifyGeocodingApi）
 */

import { geoapifyGeocodingApi } from "../../api_layer/03_Destination_Discovery_&_Inspiration/GeoapifyGeocodingApi";
import type { GeoapifyPlaceDto } from "../../api_layer/03_Destination_Discovery_&_Inspiration/GeoapifyGeocodingApi";
import { hardcodedQualityRatingRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/HardcodedQualityRatingRepository";
import { remoteQualityRatingRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteQualityRatingRepository";
import type { OfficialQualityRatingEntity } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository";

/** 同步结果统计（供 UI 反馈展示） */
export interface QualityRatingSyncResult {
  /** JSON 总条数 */
  total: number;
  /** 实际写入 D1 的条数（含保留旧 Geoapify 详情仅更新 JSON 字段的） */
  synced: number;
  /** 本次新调用 Geoapify 并匹配成功的条数 */
  newlyGeocoded: number;
  /** Geoapify 匹配失败被跳过（未写入）的条数 */
  failed: number;
}

/** Geoapify 请求并发上限（免费套餐限制，分批串行执行） */
const GEOCODING_CONCURRENCY = 5;

export class QualityRatingSyncService {
  /**
   * 执行一次全量同步：
   * 1. 读取 hardcode JSON 全量条目；
   * 2. 读取 D1 已有记录，构建 jsonId → 已有 Geoapify 详情 的映射（幂等去重）；
   * 3. 逐条（分批并发）Geoapify 匹配：已有 place_id 直接复用，否则 name → address 回退搜索；
   * 4. 批量 upsert 到 D1，返回统计。
   */
  async syncQualityRatings(): Promise<QualityRatingSyncResult> {
    const jsonItems = hardcodedQualityRatingRepository.listAll();
    const existing = await remoteQualityRatingRepository.listAll();
    const existingByJsonId = new Map(
      existing.map((item) => [item.jsonId, item])
    );

    let newlyGeocoded = 0;
    let failed = 0;
    const toUpsert: OfficialQualityRatingEntity[] = [];

    // 分批并发（每批 GEOCODING_CONCURRENCY 条，批间串行）
    for (let i = 0; i < jsonItems.length; i += GEOCODING_CONCURRENCY) {
      const chunk = jsonItems.slice(i, i + GEOCODING_CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (jsonItem) => {
          const existingItem = existingByJsonId.get(jsonItem.jsonId);
          // 幂等：已匹配成功的条目复用旧 Geoapify 详情，不再消耗额度
          if (existingItem?.placeId) {
            return this.mergeJsonFields(jsonItem, existingItem);
          }
          const place = await this.geocodeOrNull(jsonItem);
          if (!place) {
            failed += 1;
            return null;
          }
          newlyGeocoded += 1;
          return this.toEntity(jsonItem, place);
        })
      );
      for (const entity of results) {
        if (entity) toUpsert.push(entity);
      }
    }

    const synced =
      toUpsert.length > 0
        ? await remoteQualityRatingRepository.upsertAll(toUpsert)
        : 0;

    return {
      total: jsonItems.length,
      synced,
      newlyGeocoded,
      failed,
    };
  }

  /** name → address 两级回退搜索，取 top1；两级均无结果返回 null */
  private async geocodeOrNull(
    item: OfficialQualityRatingEntity
  ): Promise<GeoapifyPlaceDto | null> {
    const queries = [item.companyName, item.companyAddress];
    for (const query of queries) {
      if (!query?.trim()) continue;
      try {
        const places = await geoapifyGeocodingApi.searchPlaces(query, 1);
        if (places.length > 0) return places[0];
      } catch {
        // 单条查询失败（网络/限流）按匹配失败处理，继续后续条目
      }
    }
    return null;
  }

  /** JSON 字段覆盖 + 复用已有 Geoapify 详情（幂等路径） */
  private mergeJsonFields(
    jsonItem: OfficialQualityRatingEntity,
    existingItem: OfficialQualityRatingEntity
  ): OfficialQualityRatingEntity {
    return {
      ...existingItem,
      jsonId: jsonItem.jsonId,
      companyName: jsonItem.companyName,
      companyAddress: jsonItem.companyAddress,
      companyPhone: jsonItem.companyPhone,
      duration: jsonItem.duration,
      awardCategory: jsonItem.awardCategory,
      syncedAt: Date.now(),
    };
  }

  /** JSON 条目 + Geoapify top1 结果 → 完整实体 */
  private toEntity(
    jsonItem: OfficialQualityRatingEntity,
    place: GeoapifyPlaceDto
  ): OfficialQualityRatingEntity {
    return {
      jsonId: jsonItem.jsonId,
      companyName: jsonItem.companyName,
      companyAddress: jsonItem.companyAddress,
      companyPhone: jsonItem.companyPhone,
      duration: jsonItem.duration,
      awardCategory: jsonItem.awardCategory,
      placeId: place.placeId,
      name: place.name,
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
      confidence: place.confidence,
      syncedAt: Date.now(),
    };
  }
}

export const qualityRatingSyncService = new QualityRatingSyncService();
