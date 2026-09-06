/**
 * EventSyncService — 模块 03 节日/活动同步业务逻辑（Business Logic Layer, 浏览器端）
 *
 * 职责（单一）：
 *   - 编排"触发一次活动同步"的浏览器端入口：委托 RemoteEventRepository.syncFromWeb()
 *     调用服务端 Route API，由服务端在 Cloudflare Worker 内完成
 *     "malaysia.travel 官网爬取 → 写入 D1 → 镜像清理"全流程（浏览器端无法直连官网：
 *     官网无 CORS 且需 X-Requested-With 请求头，爬虫只能在服务端执行）；
 *   - 幂等策略：按 id（title 生成的 slug）upsert，重复执行仅覆盖更新；
 *     官网列表之外的旧行（已结束/已下架活动）由服务端镜像清理；
 *   - 本类不再读取任何本地 JSON（parsed_events.json / HardcodedEventRepository 已退出
 *     活动数据链路，文件按约定保留在仓库但不被引用）。
 *
 * 依赖方向：Business Logic → Data Access Layer（远程 D1 仓储）
 */

import { remoteEventRepository } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteEventRepository";

/** 同步结果统计（供 UI 反馈展示；与既有接口保持兼容） */
export interface EventSyncResult {
  /** 官网解析出的活动总条数 */
  total: number;
  /** 实际写入 D1 的条数 */
  synced: number;
  /** 写入失败被跳过的条数 */
  failed: number;
}

export class EventSyncService {
  /**
   * 触发一次全量同步（服务端执行）：
   * 服务端 Route API（POST /…/api/events/sync）内完成官网爬取、upsert 与镜像清理，
   * 此处仅透传统计；pruned/skipped 明细经控制台提示（UI 无需展示）。
   */
  async syncEvents(): Promise<EventSyncResult> {
    const stats = await remoteEventRepository.syncFromWeb();
    if (stats.pruned > 0 || stats.skipped > 0) {
      console.log(
        `[EventSync] pruned ${stats.pruned} stale · skipped ${stats.skipped} malformed`
      );
    }
    return {
      total: stats.total,
      synced: stats.synced,
      failed: stats.failed,
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
