/**
 * cron-worker.ts — OpenNext Custom Worker（根目录，基础设施文件，非业务 Module）
 *
 * 背景：OpenNext 生成的 worker（.open-next/worker.js）只导出 fetch 处理器，无法响应
 * Cloudflare Cron Trigger 的 scheduled 事件。按官方 Custom Worker 方案
 * （https://opennext.js.org/cloudflare/howtos/custom-worker），本文件复用生成的 fetch
 * 处理器并追加 scheduled 处理器，使"每天自动同步"成为可能。
 *
 * 行为（2026-09 安全更新）：模块 03 的同步/清空 Route API 已改为管理员会话专属
 * （requireAdmin，401/403）——scheduled 触发没有用户 cookie，不能再经 HTTP 端点
 * 触发同步。因此 scheduled 处理器改为【直接调用服务端同步服务】（同样在 Worker 内、
 * 使用同一 D1 binding，行为与端点一致，仅绕过 HTTP 鉴权层；系统级定时任务不属
 * "用户操作"，无需管理员身份）：
 *   1. 模块 03 活动同步：new D1EventRepository(TEST_DB) + eventWebSyncService
 *      → malaysia.travel 官网爬取 → D1 upsert/镜像清理；
 *   2. 模块 03 官方品质评级同步：new D1QualityRatingRepository(TEST_DB) +
 *      qualityRatingWebSyncService → MOTAC 官网 admin-ajax 爬取 → D1 upsert/
 *      （跳过率 ≤25% 时）镜像清理。
 * 两者各自独立 try/catch：任一失败不影响另一个，错误进入运行日志（wrangler tail 可见）。
 * 同步服务与 D1 仓储均不依赖 getCloudflareContext / process.env（仓储仅收 D1 binding，
 * 爬虫 API 为纯 fetch），在 scheduled 上下文安全可用。
 *
 * 部署：wrangler.json 的 "main" 指向本文件，并配置 "triggers": { "crons": [...] }。
 * 必须先执行 opennextjs-cloudflare build 生成 .open-next 产物，再 wrangler deploy。
 */

// @ts-ignore .open-next/worker.js 由 opennextjs-cloudflare build 生成（可能晚于 typecheck 存在）
import openNextWorker from "./.open-next/worker.js";
import { D1EventRepository } from "./data_access_layer/03_Destination_Discovery_&_Inspiration/D1EventRepository";
import { eventWebSyncService } from "./business_logic_layer/03_Destination_Discovery_&_Inspiration/server/EventWebSyncService";
import { D1QualityRatingRepository } from "./data_access_layer/03_Destination_Discovery_&_Inspiration/D1QualityRatingRepository";
import { qualityRatingWebSyncService } from "./business_logic_layer/03_Destination_Discovery_&_Inspiration/server/QualityRatingWebSyncService";

/**
 * Worker 默认导出：复用 OpenNext 的 fetch 处理（所有正常 HTTP 请求），
 * 追加 scheduled 处理（每日 cron 直接调用同步服务）。
 */
export default {
  fetch: openNextWorker.fetch,

  /** 每日定时任务：依次执行活动同步与官方品质评级同步（官网爬取 → D1，直连同步服务） */
  async scheduled(
    _controller: ScheduledController,
    env: unknown,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(
      (async () => {
        const { TEST_DB } = env as { TEST_DB?: D1Database };
        if (!TEST_DB) {
          console.error("[cron] TEST_DB binding missing — skip syncs");
          return;
        }
        // 1) 活动同步（历史先有；失败不影响评级同步）
        try {
          const stats = await eventWebSyncService.syncFromWeb(
            new D1EventRepository(TEST_DB)
          );
          console.log("[cron] events sync:", JSON.stringify(stats));
        } catch (err) {
          console.error("[cron] events sync failed:", err);
        }
        // 2) 官方品质评级同步（MOTAC 官网 → D1）
        try {
          const stats = await qualityRatingWebSyncService.syncFromWeb(
            new D1QualityRatingRepository(TEST_DB)
          );
          console.log("[cron] quality ratings sync:", JSON.stringify(stats));
        } catch (err) {
          console.error("[cron] quality ratings sync failed:", err);
        }
      })()
    );
  },
};
