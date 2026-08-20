/**
 * QualityRatingSyncService — 模块 03 官方品质评级同步业务逻辑（Business Logic Layer）
 *
 * 职责（单一）：
 *   - 编排"官方评级 hardcode JSON → Nominatim 地理编码 → 写入 Cloudflare D1"全流程；
 *   - 逐条以公司地址（Company Address）调用 Nominatim API 查询经纬度（限马来西亚，
 *     免费无需 key；客户端内置"逗号递减"降级与限速），与 JSON 原字段（公司名/地址/
 *     电话/评级有效期/品质等级）一并写入 D1；placeId/分类等其余补全字段保持 null；
 *   - 容错策略：单条查询失败（无匹配或瞬时错误）不阻塞录入，该条 lat/lon 保持
 *     null 照常入库，由统计字段反馈，并收集失败明细（companyName/companyAddress/
 *     reason）供 UI 在终端打印"哪个地点无法获取到地点信息"；
 *   - 幂等策略：D1 表以 json_id 为主键，upsert 天然幂等；
 *   - 防重策略：模块级 running 标志拒绝并发调用（单例服务级保险；跨刷新/跨标签页
 *     的防重由 Presentation 层 localStorage 运行标记负责）；
 *   - 进度回调：可选 onProgress(done, total) 供 UI 实时展示进度（支撑超时警告体验）。
 *
 * 依赖方向：Business Logic → API Layer（Nominatim）/ Data Access Layer（JSON 仓储 / 远程 D1 仓储）
 */

import { nominatimApi } from "../../api_layer/03_Destination_Discovery_&_Inspiration/NominatimApi";
import { hardcodedQualityRatingRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/HardcodedQualityRatingRepository";
import { remoteQualityRatingRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteQualityRatingRepository";
import type { OfficialQualityRatingEntity } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository";

/** 单条同步失败明细（供 UI 在终端打印 / 展示"哪个地点无法获取到地点信息"） */
export interface QualityRatingSyncFailure {
  /** JSON 条目 id */
  jsonId: string;
  /** 公司名称 */
  companyName: string;
  /** 公司地址（用于 Nominatim 查询的原始地址） */
  companyAddress: string;
  /** 失败原因："no-match"（请求成功但无匹配）或瞬时错误消息（网络/限流/HTTP 错误） */
  reason: string;
}

/** 同步结果统计（供 UI 反馈展示；接口保持兼容，字段语义随 Nominatim 更新） */
export interface QualityRatingSyncResult {
  /** JSON 总条数 */
  total: number;
  /** 实际写入 D1 的条数 */
  synced: number;
  /** 经 Nominatim 按公司地址成功补全经纬度的条数 */
  newlyGeocoded: number;
  /** 无坐标条数（Nominatim 无匹配或瞬时失败，lat/lon 保持 null 照常入库） */
  failed: number;
  /** 失败明细（无匹配或瞬时失败的逐条记录），供 UI 终端打印具体地点 */
  failures: QualityRatingSyncFailure[];
}

/** 同步进度回调（每处理完一条调用一次，供 UI 展示进度与超时提醒） */
export type QualityRatingSyncProgressCallback = (
  done: number,
  total: number
) => void;

export class QualityRatingSyncService {
  /** 模块级防重标志：同一时刻只允许一个同步进程（单例服务级保险） */
  private running = false;

  /**
   * 执行一次全量同步：
   * 1. 读取 hardcode JSON 全量条目；
   * 2. 逐条调用 Nominatim 按公司地址查询经纬度（客户端内置"逗号递减"降级
   *    与限速），成功则填充 lat/lon（失败或无匹配则保持 null，不阻塞录入，
   *    失败明细经 failures 返回并在终端逐条打印）；
   * 3. 批量 upsert 到 D1（JSON 原字段 + 经纬度），返回统计。
   * 并发调用（running 为 true）时直接抛错，拒绝重复进程。
   */
  async syncQualityRatings(
    onProgress?: QualityRatingSyncProgressCallback
  ): Promise<QualityRatingSyncResult> {
    if (this.running) {
      throw new Error("Sync already in progress");
    }
    this.running = true;

    const jsonItems = hardcodedQualityRatingRepository.listAll();
    const toUpsert: OfficialQualityRatingEntity[] = [];
    const failures: QualityRatingSyncFailure[] = [];
    let newlyGeocoded = 0;
    let failed = 0;

    try {
      for (const jsonItem of jsonItems) {
        let lat: number | null = null;
        let lon: number | null = null;
        try {
          const coord = await nominatimApi.geocodeAddress(
            jsonItem.companyAddress
          );
          if (coord) {
            lat = coord.lat;
            lon = coord.lon;
            newlyGeocoded += 1;
          } else {
            // 请求成功但全部降级尝试均无匹配：不落库"有坐标"结论，记录明细
            failed += 1;
            const failure: QualityRatingSyncFailure = {
              jsonId: jsonItem.jsonId,
              companyName: jsonItem.companyName,
              companyAddress: jsonItem.companyAddress,
              reason: "no-match (all fallback attempts returned empty)",
            };
            failures.push(failure);
            // 终端（浏览器 Console）逐条打印：哪个地点无法获取到地点信息
            console.warn("[SyncQualityRatings] geocode failed:", failure);
          }
        } catch (err) {
          // 瞬时失败（网络/限流）：不落库"无坐标"结论，该条 lat/lon 保持 null，
          // 记录明细与原因，允许下次重试
          failed += 1;
          const failure: QualityRatingSyncFailure = {
            jsonId: jsonItem.jsonId,
            companyName: jsonItem.companyName,
            companyAddress: jsonItem.companyAddress,
            reason: err instanceof Error ? err.message : String(err),
          };
          failures.push(failure);
          // 终端（浏览器 Console）逐条打印：哪个地点无法获取到地点信息
          console.warn("[SyncQualityRatings] geocode failed:", failure);
        }
        toUpsert.push({ ...jsonItem, lat, lon, syncedAt: Date.now() });
        onProgress?.(newlyGeocoded + failed, jsonItems.length);
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
        failures,
      };
    } finally {
      this.running = false;
    }
  }

  /**
   * 清空全部官方评级数据（DEV 工具）：调远程仓储 DELETE 全部 D1
   * official_quality_ratings 记录，返回实际删除条数。失败时抛错由调用方反馈。
   */
  async clearQualityRatings(): Promise<number> {
    return remoteQualityRatingRepository.clearAll();
  }
}

export const qualityRatingSyncService = new QualityRatingSyncService();
