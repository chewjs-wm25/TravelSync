/**
 * app/03_Destination_Discovery_&_Inspiration/api/events/route.ts — 模块 03 节日/活动 Route API（薄传输桥）
 *
 * 职责（单一）：HTTP 传输层。
 *   - 解析 / 校验请求参数；
 *   - 获取 Cloudflare D1 binding（TEST_DB）；
 *   - 实例化 D1EventRepository 并委托其方法；
 *   - 序列化响应。
 *
 * 授权：
 *   - GET（公开读）保持匿名可访问；
 *   - POST（批量 upsert）/ DELETE（清空）为 DEV 工具同步/清空入口，
 *     不再要求管理员会话（原 requireAdmin 限制已移除），仅保留 items 非空校验。
 *
 * 本文件不含任何 SQL / 数据库逻辑（数据库操作全部位于 Data Access 层
 * D1EventRepository 内）。
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1EventRepository } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/D1EventRepository";
import type { EventEntity } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/EventRepository";

/** 以当前环境 D1 binding 构建仓储实例 */
async function eventRepo(): Promise<D1EventRepository> {
  const { env } = await getCloudflareContext({ async: true });
  return new D1EventRepository(env.TEST_DB);
}

/** GET /03_Destination_Discovery_&_Inspiration/api/events → 全部节日/活动条目（公开读） */
export async function GET() {
  const repo = await eventRepo();
  const items = await repo.listAll();
  return Response.json(items);
}

/** POST /03_Destination_Discovery_&_Inspiration/api/events  body: { items } → 批量 upsert（DEV 同步入口，无会话授权） */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    items?: EventEntity[];
  } | null;
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json(
      { message: "items (non-empty array) is required" },
      { status: 400 }
    );
  }
  const repo = await eventRepo();
  const synced = await repo.upsertAll(items);
  return Response.json({ synced }, { status: 201 });
}

/** DELETE /03_Destination_Discovery_&_Inspiration/api/events → 清空全部活动数据，返回 { cleared }（DEV 清空入口，无会话授权） */
export async function DELETE() {
  const repo = await eventRepo();
  const cleared = await repo.clearAll();
  return Response.json({ cleared });
}
