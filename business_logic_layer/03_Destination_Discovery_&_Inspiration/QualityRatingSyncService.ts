/**
 * QualityRatingSyncService — 模块 03 官方品质评级同步业务逻辑（Business Logic Layer, 浏览器端）
 *
 * 职责（单一）：
 *   - syncQualityRatings（全量，Admin Panel 按钮）：两阶段——
 *     ① 委托 RemoteQualityRatingRepository.syncFromWeb() 触发服务端 Route API
 *        "MOTAC 官网爬取 → upsert D1 →（跳过率 ≤25% 时）镜像清理"（浏览器端无法
 *        直连官网：跨域被 CORS 拦截，爬虫只能在 Cloudflare Worker 内执行）；
 *     ② 读取 D1 当前名单，对 lat/lon 缺失的行逐条调用 Nominatim 地理编码补全
 *        （前端实现原则；沿用"逗号递减"降级与 1 请求/秒限速，失败不阻塞，
 *        失败明细经 failures 返回并在终端逐条打印）并批量 upsert 回 D1。
 *     每日 Cron 只执行①（不带坐标，D1 upsert 的 Geo 列 COALESCE 保留已补坐标）；
 *   - syncQualityRatingsSample(count)（快速测试按钮）：仅导入官网前 count 条，
 *     不做地理编码、服务端不执行镜像清理——秒级验证爬虫/入库链路；
 *   - 幂等策略：D1 表以 json_id（公司名+地址哈希）为主键，upsert 天然幂等；
 *   - 防重策略：模块级 running 标志拒绝并发调用（单例服务级保险；跨刷新/跨标签页
 *     的防重由 Presentation 层 localStorage 运行标记负责）；
 *   - 进度回调：可选 onProgress(done, total) 供 UI 实时展示阶段②进度
 *     （支撑超时警告体验；阶段①为单次请求无逐条进度）。
 *
 * 数据源说明：原 hardcode JSON（officalQualityRating_hardcode.json）已退出同步链路
 * （文件与 HardcodedQualityRatingRepository 按仓库约定保留但不被引用，
 * 镜像 HardcodedEventRepository 先例）。
 *
 * 依赖方向：Business Logic → API Layer（Nominatim）/ Data Access Layer（远程 D1 仓储）
 */

import { nominatimApi } from "../../api_layer/03_Destination_Discovery_&_Inspiration/NominatimApi";
import { remoteQualityRatingRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteQualityRatingRepository";
import type { OfficialQualityRatingEntity } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository";

/** 单条地理编码失败明细（供 UI 在终端打印 / 展示"哪个地点无法获取到地点信息"） */
export interface QualityRatingSyncFailure {
  /** 条目 id（D1 主键 jsonId） */
  jsonId: string;
  /** 公司名称 */
  companyName: string;
  /** 公司地址（用于 Nominatim 查询的原始地址） */
  companyAddress: string;
  /** 失败原因："no-match"（请求成功但无匹配）或瞬时错误消息（网络/限流/HTTP 错误） */
  reason: string;
}

/** 同步结果统计（供 UI 反馈展示；total/synced 为官网爬取统计，newlyGeocoded/failed 为地理编码阶段统计） */
export interface QualityRatingSyncResult {
  /** 官网抓取卡片总数（服务端 stats.total） */
  total: number;
  /** 服务端实际写入 D1 的条数（stats.synced） */
  synced: number;
  /** 地理编码阶段成功补全经纬度的条数 */
  newlyGeocoded: number;
  /** 地理编码失败（无匹配或瞬时失败）条数，lat/lon 保持 null 照常入库 */
  failed: number;
  /** 地理编码失败明细，供 UI 终端打印具体地点 */
  failures: QualityRatingSyncFailure[];
  /** 服务端镜像清理（官网列表之外）的旧行数（快速测试模式恒为 0） */
  pruned?: number;
  /** 服务端解析失败被跳过的官网卡片数（>25% 时服务端不执行清理） */
  skipped?: number;
}

/** 同步进度回调（阶段②每处理完一条调用一次，供 UI 展示进度与超时提醒） */
export type QualityRatingSyncProgressCallback = (
  done: number,
  total: number
) => void;

export class QualityRatingSyncService {
  /** 模块级防重标志：同一时刻只允许一个同步进程（单例服务级保险） */
  private running = false;

  /**
   * 执行一次全量同步（DEV 全量按钮）：
   * ① 服务端爬取 MOTAC 官网 → upsert →（跳过率 ≤25% 时）镜像清理 D1；
   * ② 对 D1 中 lat/lon 缺失的行逐条调用 Nominatim 按公司地址补全经纬度
   *    （失败或无匹配保持 null，失败明细经 failures 返回并在终端逐条打印），
   *    批量 upsert 回 D1。
   * 并发调用（running 为 true）时直接抛错，拒绝重复进程。
   */
  async syncQualityRatings(
    onProgress?: QualityRatingSyncProgressCallback
  ): Promise<QualityRatingSyncResult> {
    if (this.running) {
      throw new Error("Sync already in progress");
    }
    this.running = true;

    try {
      // ---- 阶段①：服务端爬虫同步（MOTAC 官网 → D1） ----
      const web = await remoteQualityRatingRepository.syncFromWeb();
      if (web.pruned > 0 || web.skipped > 0) {
        console.log(
          `[SyncQualityRatings] web sync: pruned ${web.pruned} stale · skipped ${web.skipped} malformed (≤25% rule)`
        );
      }

      // ---- 阶段②：仅对缺失坐标的行做客户端地理编码补全 ----
      const items = await remoteQualityRatingRepository.listAll();
      const needGeo = items.filter((item) => item.lat == null || item.lon == null);

      const toUpsert: OfficialQualityRatingEntity[] = [];
      const failures: QualityRatingSyncFailure[] = [];
      let newlyGeocoded = 0;
      for (let i = 0; i < needGeo.length; i++) {
        const item = needGeo[i];
        let lat: number | null = null;
        let lon: number | null = null;
        try {
          const coord = await nominatimApi.geocodeAddress(item.companyAddress);
          if (coord) {
            lat = coord.lat;
            lon = coord.lon;
            newlyGeocoded += 1;
          } else {
            // 请求成功但全部降级尝试均无匹配：不落库"有坐标"结论，记录明细
            const failure: QualityRatingSyncFailure = {
              jsonId: item.jsonId,
              companyName: item.companyName,
              companyAddress: item.companyAddress,
              reason: "no-match (all fallback attempts returned empty)",
            };
            failures.push(failure);
            console.warn("[SyncQualityRatings] geocode failed:", failure);
          }
        } catch (err) {
          // 瞬时失败（网络/限流）：该条 lat/lon 保持 null，记录明细，允许下次重试
          const failure: QualityRatingSyncFailure = {
            jsonId: item.jsonId,
            companyName: item.companyName,
            companyAddress: item.companyAddress,
            reason: err instanceof Error ? err.message : String(err),
          };
          failures.push(failure);
          console.warn("[SyncQualityRatings] geocode failed:", failure);
        }
        toUpsert.push({ ...item, lat, lon, syncedAt: Date.now() });
        onProgress?.(i + 1, needGeo.length);
      }

      if (toUpsert.length > 0) {
        await remoteQualityRatingRepository.upsertAll(toUpsert);
      }

      return {
        total: web.total,
        synced: web.synced,
        newlyGeocoded,
        failed: failures.length,
        failures,
        pruned: web.pruned,
        skipped: web.skipped,
      };
    } finally {
      this.running = false;
    }
  }

  /**
   * 快速测试模式（DEV "Sync first N" 按钮）：仅导入官网前 count 条。
   * 服务端单请求完成（limit 模式永不清库），本方法不做地理编码——秒级返回，
   * 用于快速验证爬虫解析 → D1 入库链路，避免全量 + 地理编码占用大量测试时间。
   */
  async syncQualityRatingsSample(count = 3): Promise<QualityRatingSyncResult> {
    if (this.running) {
      throw new Error("Sync already in progress");
    }
    this.running = true;

    try {
      const web = await remoteQualityRatingRepository.syncFromWeb({
        limit: count,
      });
      console.log(
        `[SyncQualityRatings] sample mode: imported first ${web.synced}/${web.total} (limit=${count}, no prune, no geocode)`
      );
      return {
        total: web.total,
        synced: web.synced,
        newlyGeocoded: 0,
        failed: 0,
        failures: [],
        pruned: 0,
        skipped: web.skipped,
      };
    } finally {
      this.running = false;
    }
  }

  /**
   * 清空全部官方评级数据（Admin Panel 工具）：调远程仓储 DELETE 全部 D1
   * official_quality_ratings 记录，返回实际删除条数。失败时抛错由调用方反馈。
   */
  async clearQualityRatings(): Promise<number> {
    return remoteQualityRatingRepository.clearAll();
  }
}

export const qualityRatingSyncService = new QualityRatingSyncService();
