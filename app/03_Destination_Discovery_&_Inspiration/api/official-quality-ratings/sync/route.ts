/**
 * app/03_Destination_Discovery_&_Inspiration/api/official-quality-ratings/sync/route.ts
 * — 模块 03 官方品质评级同步 Route API（薄传输桥）
 *
 * 职责（单一）：HTTP 传输层。
 *   - 解析可选 body { limit?: number }（空 body / 未传 → 全量同步；
 *     limit 传入 → 快速测试模式：仅导入官网前 limit 条、永不镜像清理）；
 *   - 获取 Cloudflare D1 binding（TEST_DB）；
 *   - 实例化 D1QualityRatingRepository 并注入 QualityRatingWebSyncService，
 *     触发"MOTAC 官网爬取 → upsert → （跳过率 ≤25% 时）镜像清理 D1"全流程；
 *   - 序列化统计响应。
 *
 * 授权：DEV 同步入口，与既有 DEV 端点一致不做管理员会话校验（原 requireAdmin
 *       已移除），幂等且单次开销极小；每日 Cloudflare Cron（cron-worker.ts 的
 *       scheduled）与 DEV 页面 Sync Quality Ratings / Sync first 3 按钮均经本端点触发。
 *
 * 本文件不含任何 SQL / 爬虫 / 业务逻辑（分别位于 Data Access 层
 * D1QualityRatingRepository / API 层 MotacMyTqaApi / Business Logic 层
 * QualityRatingWebSyncService）。
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { qualityRatingWebSyncService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/server/QualityRatingWebSyncService";
import { D1QualityRatingRepository } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/D1QualityRatingRepository";

/** limit 合法上界：官网当前约 136 条，200 足以单次取全；防御异常大值 */
const LIMIT_MAX = 200;

/**
 * POST /03_Destination_Discovery_&_Inspiration/api/official-quality-ratings/sync
 * body（可选）：{ limit?: number } —— 未传 = 全量；1 ≤ limit ≤ 200 = 快速测试前 N 条。
 * → 爬取 MOTAC 官网并同步至 D1，返回 { total, synced, failed, pruned, skipped }。
 * 200 成功 / 409 并发同步中 / 502 爬取或写入失败（错误消息含原因，D1 数据不受影响）。
 */
export async function POST(request: Request) {
  // 解析可选 limit：非法值（非整数 / 越界）一律视为未传 → 全量同步
  const body = (await request.json().catch(() => null)) as {
    limit?: unknown;
  } | null;
  const rawLimit = body?.limit;
  const limit =
    typeof rawLimit === "number" &&
    Number.isInteger(rawLimit) &&
    rawLimit >= 1 &&
    rawLimit <= LIMIT_MAX
      ? rawLimit
      : undefined;

  const { env } = await getCloudflareContext({ async: true });
  const repo = new D1QualityRatingRepository(env.TEST_DB);
  try {
    const stats = await qualityRatingWebSyncService.syncFromWeb(repo, { limit });
    return Response.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 并发同步（防重标志拒绝）→ 409；其余（官网不可达/解析为空/写库失败等）→ 502
    const status = message.includes("already in progress") ? 409 : 502;
    return Response.json({ message }, { status });
  }
}
