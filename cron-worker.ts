/**
 * cron-worker.ts — OpenNext Custom Worker（根目录，基础设施文件，非业务 Module）
 *
 * 背景：OpenNext 生成的 worker（.open-next/worker.js）只导出 fetch 处理器，无法响应
 * Cloudflare Cron Trigger 的 scheduled 事件。按官方 Custom Worker 方案
 * （https://opennext.js.org/cloudflare/howtos/custom-worker），本文件复用生成的 fetch
 * 处理器并追加 scheduled 处理器，使"每天自动同步"成为可能。
 *
 * 行为：scheduled 触发时，把事件转成对本站两个同步端点的一次内部调用（直接调用
 * worker.fetch，与真实 HTTP 请求完全同链路——D1 绑定经 getCloudflareContext 正常注入）：
 *   1. 模块 03 活动同步：/03_Destination_Discovery_&_Inspiration/api/events/sync
 *      → malaysia.travel 官网爬取 → D1 upsert/镜像清理；
 *   2. 模块 03 官方品质评级同步：/03_Destination_Discovery_&_Inspiration/api/
 *      official-quality-ratings/sync → MOTAC 官网 admin-ajax 爬取 → D1 upsert/
 *      （跳过率 ≤25% 时）镜像清理。
 * 两者各自独立 try/catch：任一失败不影响另一个，错误进入运行日志（wrangler tail 可见）。
 *
 * 部署：wrangler.json 的 "main" 指向本文件，并配置 "triggers": { "crons": [...] }。
 * 必须先执行 opennextjs-cloudflare build 生成 .open-next 产物，再 wrangler deploy。
 */

// @ts-ignore .open-next/worker.js 由 opennextjs-cloudflare build 生成（可能晚于 typecheck 存在）
import openNextWorker from "./.open-next/worker.js";

/** 模块 03 活动同步端点路径（与 RemoteEventRepository 的 EVENTS_API 常量一致，保留字面 &） */
const EVENTS_SYNC_PATH = "/03_Destination_Discovery_&_Inspiration/api/events/sync";

/** 模块 03 官方品质评级同步端点路径（与 RemoteQualityRatingRepository 的 QUALITY_RATINGS_API 常量一致） */
const QUALITY_RATINGS_SYNC_PATH =
  "/03_Destination_Discovery_&_Inspiration/api/official-quality-ratings/sync";

/** 把一次内部 POST 转发给 OpenNext fetch 处理器，返回 { status, body }（错误转成日志字符串） */
async function internalPost(
  path: string,
  env: unknown,
  ctx: ExecutionContext
): Promise<string> {
  // 合成 origin：路径路由不依赖 host，仅需合法 https URL 即可命中本站路由
  const request = new Request(`https://travel-sync.cron${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const response = await openNextWorker.fetch(request, env, ctx);
  const body = await response.text();
  return `HTTP ${response.status} ${body}`;
}

/**
 * Worker 默认导出：复用 OpenNext 的 fetch 处理（所有正常 HTTP 请求），
 * 追加 scheduled 处理（每日 cron 自动同步活动与官方品质评级）。
 */
export default {
  fetch: openNextWorker.fetch,

  /** 每日定时任务：依次触发活动同步与官方品质评级同步（官网爬取 → D1） */
  async scheduled(
    _controller: ScheduledController,
    env: unknown,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(
      (async () => {
        // 1) 活动同步（历史先有；失败不影响评级同步）
        try {
          console.log(
            `[cron] events sync → ${await internalPost(EVENTS_SYNC_PATH, env, ctx)}`
          );
        } catch (err) {
          console.error("[cron] events sync failed:", err);
        }
        // 2) 官方品质评级同步（MOTAC 官网 → D1）
        try {
          console.log(
            `[cron] quality ratings sync → ${await internalPost(
              QUALITY_RATINGS_SYNC_PATH,
              env,
              ctx
            )}`
          );
        } catch (err) {
          console.error("[cron] quality ratings sync failed:", err);
        }
      })()
    );
  },
};
