/**
 * app/03_Destination_Discovery_&_Inspiration/api/events/route.ts — 模块 03 节日/活动 Route API（薄传输桥）
 *
 * 职责（单一）：HTTP 传输层。
 *   - 解析 / 校验请求参数；
 *   - 获取 Cloudflare D1 binding（TEST_DB）；
 *   - 实例化 D1EventRepository 并委托其方法；
 *   - 序列化响应。
 *
 * 端点：
 *   - GET（公开读）保持匿名可访问：返回全部节日/活动条目（数据源为官网活动，
 *     由 POST …/events/sync 服务端爬取同步入 D1）；
 *   - DELETE（清空）为 Admin Panel 清空入口，要求管理员会话（401/403，
 *     requireAdmin）。
 *   - 原 POST（批量 upsert JSON items）已废弃移除：活动写入改由
 *     events/sync（服务端官网爬取）承担，避免双入口。
 *
 * 本文件不含任何 SQL / 数据库逻辑（数据库操作全部位于 Data Access 层
 * D1EventRepository 内）。
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1EventRepository } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/D1EventRepository";
import { requireAdmin } from "@/business_logic_layer/01_User_&_Account_Management/sessionHelper";

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

/** DELETE /03_Destination_Discovery_&_Inspiration/api/events → 清空全部活动数据，返回 { cleared }（Admin Panel 清空入口，管理员会话） */
export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const repo = await eventRepo();
  const cleared = await repo.clearAll();
  return Response.json({ cleared });
}
