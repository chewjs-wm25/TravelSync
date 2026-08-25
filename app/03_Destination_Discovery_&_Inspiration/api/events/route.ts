/**
 * app/03_Destination_Discovery_&_Inspiration/api/discovery/events_route.ts — 模块 03 节日/活动 Route API（薄传输桥）
 *
 * 职责（单一）：HTTP 传输层。
 *   - 解析 / 校验请求参数；
 *   - 获取 Cloudflare D1 binding（TEST_DB）；
 *   - 实例化 D1EventRepository 并委托其方法；
 *   - 序列化响应。
 *
 * 授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）：
 *   - GET（公开读）保持匿名可访问；
 *   - POST（批量 upsert）/ DELETE（清空）为危险写操作，
 *     必须管理员会话（401 未登录 / 403 非 admin），禁止匿名调用。
 *
 * 本文件不含任何 SQL / 数据库逻辑（数据库操作全部位于 Data Access 层
 * D1EventRepository 内）。
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1EventRepository } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/D1EventRepository";
import type { EventEntity } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/EventRepository";
import { requireAdmin } from "@/business_logic_layer/01_User_&_Account_Management/sessionHelper";

/** 以当前环境 D1 binding 构建仓储实例 */
async function eventRepo(): Promise<D1EventRepository> {
  const { env } = await getCloudflareContext({ async: true });
  return new D1EventRepository(env.TEST_DB);
}

/** GET /api/discovery/events → 全部节日/活动条目（公开读） */
export async function GET() {
  const repo = await eventRepo();
  const items = await repo.listAll();
  return Response.json(items);
}

/** POST /api/discovery/events  body: { items } → 批量 upsert（管理员） */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    items?: EventEntity[];
  } | null;
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json(
      { error: "items (non-empty array) is required" },
      { status: 400 }
    );
  }
  const repo = await eventRepo();
  const synced = await repo.upsertAll(items);
  return Response.json({ synced }, { status: 201 });
}

/** DELETE /api/discovery/events → 清空全部活动数据，返回 { cleared }（管理员） */
export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const repo = await eventRepo();
  const cleared = await repo.clearAll();
  return Response.json({ cleared });
}
