/**
 * app/api/discovery/favorites/route.ts — 模块 03 收藏夹 Route API（薄传输桥）
 *
 * 职责（单一）：HTTP 传输层。
 *   - 解析 / 校验请求参数；
 *   - 获取 Cloudflare D1 binding（TEST_DB）；
 *   - 实例化 D1FavoritesRepository 并委托其方法；
 *   - 序列化响应。
 *
 * 本文件不含任何 SQL / 数据库逻辑（数据库操作全部位于 Data Access 层
 * D1FavoritesRepository 内）。
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1FavoritesRepository } from "../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/D1FavoritesRepository";
import type { FavoriteItemEntity } from "../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository";

/** 以当前环境 D1 binding 构建仓储实例 */
async function favoritesRepo(): Promise<D1FavoritesRepository> {
  const { env } = await getCloudflareContext({ async: true });
  return new D1FavoritesRepository(env.TEST_DB);
}

/** GET /api/discovery/favorites?userId=xxx → 该用户收藏夹条目列表 */
export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }
  const repo = await favoritesRepo();
  const items = await repo.listItems(userId);
  return Response.json(items);
}

/** POST /api/discovery/favorites  body: { userId, item } → 新增收藏 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    item?: FavoriteItemEntity;
  } | null;
  const { userId, item } = body ?? {};
  if (!userId || !item?.id || !item?.placeId || !item?.name) {
    return Response.json(
      { error: "userId and item (id, placeId, name) are required" },
      { status: 400 }
    );
  }
  const repo = await favoritesRepo();
  const added = await repo.addItem(userId, item);
  return Response.json(added, { status: 201 });
}

/** DELETE /api/discovery/favorites?userId=xxx&id=yyy → 移除一条收藏 */
export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const userId = params.get("userId");
  const id = params.get("id");
  if (!userId || !id) {
    return Response.json(
      { error: "userId and id are required" },
      { status: 400 }
    );
  }
  const repo = await favoritesRepo();
  await repo.removeItem(userId, id);
  return new Response(null, { status: 204 });
}
