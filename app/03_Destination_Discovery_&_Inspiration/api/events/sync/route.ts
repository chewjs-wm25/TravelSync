/**
 * app/03_Destination_Discovery_&_Inspiration/api/events/sync/route.ts — 模块 03 活动同步 Route API（薄传输桥）
 *
 * 职责（单一）：HTTP 传输层。
 *   - 获取 Cloudflare D1 binding（TEST_DB）；
 *   - 实例化 D1EventRepository 并注入 EventWebSyncService，触发
 *     "malaysia.travel 官网爬取 → upsert → 镜像清理 D1"全流程；
 *   - 序列化统计响应。
 *
 * 授权：管理员专属同步入口——POST 要求管理员会话（未登录 401 / 非 admin 403，
 *       requireAdmin，见 business_logic_layer/01_.../sessionHelper.ts）。每日
 *       Cloudflare Cron（cron-worker.ts 的 scheduled）改为在 scheduled 处理器内
 *       直接调用 EventWebSyncService，不再经本 HTTP 端点；Admin Panel 页面
 *       Sync Events 按钮经本端点触发（同源 cookie 会话自动携带）。
 *
 * 本文件不含任何 SQL / 爬虫逻辑（分别位于 Data Access 层 D1EventRepository
 * 与 API 层 MalaysiaTravelEventsApi / Business Logic 层 EventWebSyncService）。
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eventWebSyncService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/server/EventWebSyncService";
import { D1EventRepository } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/D1EventRepository";
import { requireAdmin } from "@/business_logic_layer/01_User_&_Account_Management/sessionHelper";

/**
 * POST /03_Destination_Discovery_&_Inspiration/api/events/sync
 * → 爬取官网活动并同步至 D1，返回 { total, synced, failed, pruned, skipped }。
 * 200 成功 / 401 未登录 / 403 非管理员 / 409 并发同步中 / 502 爬取或写入失败（错误消息含原因，D1 数据不受影响）。
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { env } = await getCloudflareContext({ async: true });
  const repo = new D1EventRepository(env.TEST_DB);
  try {
    const stats = await eventWebSyncService.syncFromWeb(repo);
    return Response.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 并发同步（防重标志拒绝）→ 409；其余（官网不可达/解析为空/写库失败等）→ 502
    const status = message.includes("already in progress") ? 409 : 502;
    return Response.json({ message }, { status });
  }
}
