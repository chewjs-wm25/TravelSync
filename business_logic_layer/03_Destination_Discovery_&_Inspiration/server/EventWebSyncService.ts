/**
 * EventWebSyncService — 模块 03 活动"官网爬取 → D1"服务端编排（Business Logic Layer, server）
 *
 * 职责（单一）：
 *   - 编排"malaysia.travel 官网爬取 → 映射 EventEntity → 写入/镜像清理 Cloudflare D1"全流程，
 *     仅在服务端运行（官网请求需 XHR 头且无浏览器 CORS，故不能放前端）；
 *   - 依赖方向：Business Logic(server) → API Layer（MalaysiaTravelEventsApi）/ Data Access
 *     Layer（D1EventRepository）。实例由模块 03 Route API 以 D1 binding 构造后注入；
 *   - 幂等策略：按 id（title 生成的 slug）upsert，重复执行仅覆盖更新；
 *   - 镜像清理策略：爬取结果为空或失败时绝不动 D1（异常向上抛）；存在 skipped（个别卡片
 *     解析失败）时跳过清理（防止把官网结构临时解析失败的活动误删），仅做 upsert；
 *     全部成功解析时才执行 deleteIdsNotIn 删除"本次列表之外"的旧行，使 D1 始终等于官网
 *     当前列表（官网只展示进行中/未来活动，已结束活动随列表自然移除）；
 *   - 防重策略：模块级单例 running 标志拒绝同一 isolate 内并发同步（与
 *     QualityRatingSyncService 同款保险；跨 isolate 由幂等 upsert 兜底）。
 */

import { malaysiaTravelEventsApi } from "../../../api_layer/03_Destination_Discovery_&_Inspiration/MalaysiaTravelEventsApi";
import type { D1EventRepository } from "../../../data_access_layer/03_Destination_Discovery_&_Inspiration/D1EventRepository";
import type { EventEntity } from "../../../data_access_layer/03_Destination_Discovery_&_Inspiration/EventRepository";

/** 一次"官网爬取同步"的统计结果（供 Route API 返回 JSON / 日志） */
export interface EventWebSyncStats {
  /** 官网解析出的卡片总数 */
  total: number;
  /** 实际写入 D1 的条数 */
  synced: number;
  /** 写入失败被跳过的条数（upsert 抛错时不返回，恒为 0，保留兼容语义） */
  failed: number;
  /** 被镜像清理（官网列表之外）的旧行数；skipped>0 时为 0 */
  pruned: number;
  /** 因结构不完整被跳过的官网卡片数（>0 时本次不执行镜像清理） */
  skipped: number;
}

/** 并发拒绝错误消息中的识别片段（Route API 据此返回 409） */
const CONCURRENT_SYNC_MESSAGE = "Event sync already in progress";

/** 由活动 title 生成稳定 slug 作为 id（用于 D1 主键，保证幂等；逻辑与原
 *  HardcodedEventRepository 一致，作为服务端专用实现保留在编排层） */
function titleToSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `evt-${title.length}`;
}

export class EventWebSyncService {
  /** 模块级防重标志：同一 isolate 内同一时刻只允许一个同步进程 */
  private running = false;

  /**
   * 执行一次全量同步：
   * 1. 爬取官网当前/未来活动列表（失败或为空 → 抛错，D1 不动）；
   * 2. 映射为 EventEntity（id = title slug，syncedAt = now）；
   * 3. 批量 upsert 到 D1；
   * 4. 全部卡片解析成功（skipped === 0）时，删除 D1 中不在本次列表内的旧行；
   * 5. 返回统计。并发调用（running 为 true）直接抛错拒绝。
   */
  async syncFromWeb(repo: D1EventRepository): Promise<EventWebSyncStats> {
    if (this.running) {
      throw new Error(CONCURRENT_SYNC_MESSAGE);
    }
    this.running = true;
    try {
      const { events, skipped } = await malaysiaTravelEventsApi.fetchCurrentEvents();
      // 空结果已在 API 层抛错；此处再防御一次，确保任何空列表都不会触发清库
      if (events.length === 0) {
        throw new Error(
          "EventWebSyncService: scraped event list is empty — refusing to sync/clean"
        );
      }

      const now = Date.now();
      const toUpsert: EventEntity[] = events.map((event) => ({
        id: titleToSlug(event.title),
        title: event.title,
        categories: event.categories,
        date: event.date,
        location: event.location,
        url: event.url,
        syncedAt: now,
      }));

      const synced = await repo.upsertAll(toUpsert);

      let pruned = 0;
      if (skipped === 0) {
        // 全部卡片解析成功 → 镜像清理：删除官网列表中已不存在的旧行（含已结束活动）
        pruned = await repo.deleteIdsNotIn(toUpsert.map((item) => item.id));
      }

      return {
        total: toUpsert.length,
        synced,
        failed: toUpsert.length - synced,
        pruned,
        skipped,
      };
    } finally {
      this.running = false;
    }
  }
}

export const eventWebSyncService = new EventWebSyncService();
