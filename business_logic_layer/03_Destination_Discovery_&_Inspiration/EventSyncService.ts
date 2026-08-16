/**
 * EventSyncService — 模块 03 节日/活动同步业务逻辑（Business Logic Layer）
 *
 * 职责（单一）：
 *   - 编排"parsed_events.json 硬编码数据 → 写入 Cloudflare D1"全流程；
 *   - 幂等策略：按 id（title 生成的 slug）upsert，重复执行仅覆盖更新；
 *   - 无外部 API 依赖（Event 数据为官方爬取结果，无需补全）。
 *
 * 依赖方向：Business Logic → Data Access Layer（JSON 仓储 / 远程 D1 仓储）
 */

import { hardcodedEventRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/HardcodedEventRepository";
import { remoteEventRepository } from "../../data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteEventRepository";

/** 同步结果统计（供 UI 反馈展示） */
export interface EventSyncResult {
  /** JSON 总条数 */
  total: number;
  /** 实际写入 D1 的条数 */
  synced: number;
  /** 写入失败被跳过的条数 */
  failed: number;
}

export class EventSyncService {
  /**
   * 执行一次全量同步：
   * 1. 读取 parsed_events.json 全量条目；
   * 2. 填充 syncedAt 时间戳；
   * 3. 批量 upsert 到 D1（按 id 幂等），返回统计。
   */
  async syncEvents(): Promise<EventSyncResult> {
    const jsonItems = hardcodedEventRepository.listAll();
    const now = Date.now();
    const toUpsert = jsonItems.map((item) => ({ ...item, syncedAt: now }));

    const synced =
      toUpsert.length > 0
        ? await remoteEventRepository.upsertAll(toUpsert)
        : 0;

    return {
      total: jsonItems.length,
      synced,
      failed: jsonItems.length - synced,
    };
  }

  /**
   * 清空全部活动数据（DEV 工具）：调远程仓储 DELETE 全部 D1 events 记录，
   * 返回实际删除条数。失败时抛错由调用方反馈。
   */
  async clearEvents(): Promise<number> {
    return remoteEventRepository.clearAll();
  }
}

export const eventSyncService = new EventSyncService();
