/**
 * app/03_Destination_Discovery_&_Inspiration/api/discovery/favorites_route.ts — 模块 03 收藏夹 Route API（薄传输桥）
 *
 * 职责（单一）：HTTP 传输层。
 *   - 解析 / 校验请求参数；
 *   - 获取 Cloudflare D1 binding（TEST_DB）；
 *   - 实例化 D1FavoritesRepository 并委托其方法；
 *   - 序列化响应。
 *
 * 授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）：
 *   - 当前用户 ID 一律从服务端会话（Authorization: Bearer <token>）解析，
 *     不再信任请求参数/body 中的 userId —— 杜绝越权读写任意用户收藏；
 *   - GET：未登录返回空列表 []（浏览不中断、无信息泄露），登录返回本人收藏；
 *   - POST / DELETE：必须登录（401）。
 *
 * 本文件不含任何 SQL / 数据库逻辑（数据库操作全部位于 Data Access 层
 * D1FavoritesRepository 内）。
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1FavoritesRepository } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/D1FavoritesRepository";
import type { FavoriteItemEntity } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository";
import { getAuthSession } from "@/business_logic_layer/01_User_&_Account_Management/sessionHelper";

/** 以当前环境 D1 binding 构建仓储实例（userId 由会话解析，构造器注入） */
async function favoritesRepo(userId: string): Promise<D1FavoritesRepository> {
  const { env } = await getCloudflareContext({ async: true });
  return new D1FavoritesRepository(env.TEST_DB, userId);
}

/** GET /api/discovery/favorites → 当前登录用户的收藏夹条目列表（未登录返回 []） */
export async function GET(request: Request) {
  const session = await getAuthSession(request);
  if (!session) {
    // 未登录：无收藏数据可读，返回空列表（不泄露任何用户数据）
    return Response.json([]);
  }
  const repo = await favoritesRepo(session.userId);
  const items = await repo.listItems();
  return Response.json(items);
}

/** POST /api/discovery/favorites  body: { item } → 为当前登录用户新增收藏（忽略传入 userId） */
export async function POST(request: Request) {
  const session = await getAuthSession(request);
  if (!session) {
    return Response.json(
      { error: "Unauthorized: please log in first" },
      { status: 401 }
    );
  }
  const body = (await request.json().catch(() => null)) as {
    item?: FavoriteItemEntity;
  } | null;
  const item = body?.item;
  if (!item?.id || !item?.placeId || !item?.name) {
    return Response.json(
      { error: "item (id, placeId, name) is required" },
      { status: 400 }
    );
  }
  const repo = await favoritesRepo(session.userId);
  const added = await repo.addItem(item);
  return Response.json(added, { status: 201 });
}

/** DELETE /api/discovery/favorites?id=yyy → 移除当前登录用户的一条收藏（忽略传入 userId） */
export async function DELETE(request: Request) {
  const session = await getAuthSession(request);
  if (!session) {
    return Response.json(
      { error: "Unauthorized: please log in first" },
      { status: 401 }
    );
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }
  const repo = await favoritesRepo(session.userId);
  await repo.removeItem(id);
  return new Response(null, { status: 204 });
}
