/**
 * QualityRatingWebSyncService — 模块 03 官方品质评级"官网爬取 → D1"服务端编排
 * （Business Logic Layer, server）
 *
 * 职责（单一）：
 *   - 编排"MOTAC 官网 admin-ajax 爬取 → 映射 OfficialQualityRatingEntity → 写入 /
 *     镜像清理 Cloudflare D1"全流程，仅在服务端运行（MOTAC 跨域被浏览器 CORS 拦截，
 *     且每日 cron 在服务端触发，故爬虫不能放前端）；
 *   - 依赖方向：Business Logic(server) → API Layer（MotacMyTqaApi）/ Data Access
 *     Layer（D1QualityRatingRepository）。实例由模块 03 Route API 以 D1 binding
 *     构造后注入；
 *   - jsonId 策略：官网卡片无稳定条目 ID（行号随列表增删漂移），以
 *     fnv1a32(companyName|companyAddress) 派生稳定主键 `mytqa-<hex>`：
 *     upsert 天然幂等；同一营业场所跨每日刷新保持同一 jsonId → D1 中已补全的
 *     经纬度可跨刷新保留（upsert 的 Geo 列 COALESCE，见 D1QualityRatingRepository）；
 *   - 镜像清理规则（与 EventWebSyncService 的 skipped===0 严格规则不同，
 *     本模块按业务要求放宽）：允许"少量卡片解析失败"仍执行删旧导新，
 *     只要 跳过率 = skipped/(items+skipped) ≤ MAX_SKIP_RATE_FOR_PRUNE(25%)；
 *     跳过率超阈值或抓取为空 → 整体抛错，D1 不动（保留上次数据，下次重试）；
 *   - limit 模式（快速测试）：仅 upsert 前 N 条，**永不执行镜像清理**
 *     （避免把其余数据清空），也不做地理编码（地理编码属客户端阶段）；
 *   - 防重策略：模块级单例 running 标志拒绝同一 isolate 内并发同步
 *     （与 EventWebSyncService 同款保险；跨 isolate 由幂等 upsert 兜底）。
 */

import { motacMyTqaApi } from "../../../api_layer/03_Destination_Discovery_&_Inspiration/MotacMyTqaApi";
import type { D1QualityRatingRepository } from "../../../data_access_layer/03_Destination_Discovery_&_Inspiration/D1QualityRatingRepository";
import type { OfficialQualityRatingEntity } from "../../../data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository";

/** 一次"官网爬取同步"的统计结果（供 Route API 返回 JSON / 日志） */
export interface QualityRatingWebSyncStats {
  /** 官网抓取到的卡片总数（成功解析 items + 被跳过 skipped） */
  total: number;
  /** 实际写入 D1 的条数 */
  synced: number;
  /** 写入失败被跳过的条数（upsert 抛错时不返回，恒为 0，保留兼容语义） */
  failed: number;
  /** 被镜像清理（官网列表之外）的旧行数；未达清理条件时为 0 */
  pruned: number;
  /** 因结构不完整被跳过的官网卡片数（>25% 时本次不执行镜像清理） */
  skipped: number;
}

/** 允许执行镜像清理的最大跳过率（本模块放宽版规则：≤25% 即可删旧导新） */
export const MAX_SKIP_RATE_FOR_PRUNE = 0.25;

/** 并发拒绝错误消息中的识别片段（Route API 据此返回 409） */
const CONCURRENT_SYNC_MESSAGE = "Quality rating sync already in progress";

/**
 * fnv1a32 哈希 → 16 进制（8 位，含前导零），用于派生稳定 jsonId。
 * 仅需唯一性/稳定性，非加密用途；同名同址视作同一营业场所。
 */
function fnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** 由公司名 + 公司地址派生稳定 jsonId（D1 主键，幂等依据） */
export function makeQualityRatingJsonId(
  companyName: string,
  companyAddress: string
): string {
  const raw = `${companyName.trim().toLowerCase()}|${companyAddress
    .trim()
    .toLowerCase()}`;
  return `mytqa-${fnv1a32Hex(raw)}`;
}

export class QualityRatingWebSyncService {
  /** 模块级防重标志：同一 isolate 内同一时刻只允许一个同步进程 */
  private running = false;

  /**
   * 执行一次全量/限量同步：
   * 1. 爬取 MOTAC 官网 MyTQA 列表（全量分页或 limit 单次；失败/为空 → 抛错，D1 不动）；
   * 2. 映射为 OfficialQualityRatingEntity（jsonId = 名+址哈希，Geo 补全字段 null）；
   * 3. 批量 upsert 到 D1（Geo 列 COALESCE，保留已补全的经纬度）；
   * 4. 仅"全量模式 且 抓取非空 且 跳过率 ≤25%"时执行镜像清理
   *    （删除 D1 中不在本次列表内的旧行）；limit 模式永不清理；
   * 5. 返回统计。并发调用（running 为 true）直接抛错拒绝。
   */
  async syncFromWeb(
    repo: D1QualityRatingRepository,
    options?: { limit?: number }
  ): Promise<QualityRatingWebSyncStats> {
    if (this.running) {
      throw new Error(CONCURRENT_SYNC_MESSAGE);
    }
    this.running = true;
    try {
      const limit = options?.limit;
      const { items, skipped } = await motacMyTqaApi.fetchAll({ limit });
      // 空结果已在 API 层抛错；此处再防御一次，确保任何空列表都不会触发清库
      if (items.length === 0) {
        throw new Error(
          "QualityRatingWebSyncService: scraped list is empty — refusing to sync/clean"
        );
      }

      const now = Date.now();
      const toUpsert: OfficialQualityRatingEntity[] = items.map((item) => ({
        jsonId: makeQualityRatingJsonId(item.companyName, item.companyAddress),
        companyName: item.companyName,
        companyAddress: item.companyAddress,
        companyPhone: item.companyPhone,
        duration: item.duration,
        awardCategory: item.awardCategory,
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
        syncedAt: now,
      }));

      const synced = await repo.upsertAll(toUpsert);

      let pruned = 0;
      if (limit === undefined) {
        // 放宽版清理规则：只要跳过率 ≤25% 就允许删旧导新（个别卡片因结构/识别
        // 问题无法导入不阻塞整体刷新）；空列表已在上面拒绝
        const totalCards = items.length + skipped;
        const skipRate = totalCards > 0 ? skipped / totalCards : 1;
        if (skipRate <= MAX_SKIP_RATE_FOR_PRUNE) {
          pruned = await repo.deleteIdsNotIn(toUpsert.map((item) => item.jsonId));
        }
      }

      return {
        total: items.length + skipped,
        synced,
        failed: items.length - synced,
        pruned,
        skipped,
      };
    } finally {
      this.running = false;
    }
  }
}

export const qualityRatingWebSyncService = new QualityRatingWebSyncService();
