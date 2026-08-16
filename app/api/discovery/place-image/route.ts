/**
 * app/api/discovery/place-image/route.ts — 模块 03 地点图片缓存 Route API（薄传输桥）
 *
 * 职责（单一）：HTTP 传输层。
 *   - 解析 / 校验请求参数；
 *   - 获取 Cloudflare KV binding（PLACE_IMAGE_CACHE）；
 *   - 实例化 CloudflareKvPlaceImageCacheRepository 并委托其方法；
 *   - 序列化响应。
 *
 * 本文件不含任何 KV 读写逻辑（KV 操作全部位于 Data Access 层
 * CloudflareKvPlaceImageCacheRepository 内）。
 *
 * 值语义（与仓储一致，v3 来源引用格式）：
 *   - GET 返回 { entry }：entry 为 null = 未缓存；{source:"none"} = 确定无图；
 *     {source:"wikimedia",url} = 永久 URL；{source:"mapillary",imageId} = 图片 id
 *     （URL 有时效，用 id 换取新 URL，不得缓存 URL）；
 *   - PUT 写入 { placeId, entry }，entry.source 枚举校验。
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { CloudflareKvPlaceImageCacheRepository } from "../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/PlaceImageCacheRepository";
import type { PlaceImageCacheEntry } from "../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/PlaceImageCacheRepository";

/** 以当前环境 KV binding 构建仓储实例 */
async function placeImageCacheRepo(): Promise<CloudflareKvPlaceImageCacheRepository> {
  const { env } = await getCloudflareContext({ async: true });
  return new CloudflareKvPlaceImageCacheRepository(env.PLACE_IMAGE_CACHE);
}

/** 校验 PUT 请求体中的缓存条目结构（来源枚举 + 对应引用字段） */
function isValidEntry(entry: unknown): entry is PlaceImageCacheEntry {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as Record<string, unknown>;
  if (e.source === "none") return true;
  if (e.source === "wikimedia") return typeof e.url === "string" && e.url.length > 0;
  if (e.source === "mapillary") {
    return typeof e.imageId === "string" && e.imageId.length > 0;
  }
  return false;
}

/** GET /api/discovery/place-image?placeId=xxx → { entry: PlaceImageCacheEntry | null } */
export async function GET(request: Request) {
  const placeId = new URL(request.url).searchParams.get("placeId")?.trim();
  if (!placeId) {
    return Response.json({ error: "placeId is required" }, { status: 400 });
  }
  const repo = await placeImageCacheRepo();
  const entry = await repo.get(placeId);
  return Response.json({ entry });
}

/** PUT /api/discovery/place-image  body: { placeId, entry } → 写入缓存 */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    placeId?: unknown;
    entry?: unknown;
  } | null;
  const placeId = typeof body?.placeId === "string" ? body.placeId.trim() : "";
  if (!placeId) {
    return Response.json({ error: "placeId is required" }, { status: 400 });
  }
  if (!isValidEntry(body?.entry)) {
    return Response.json(
      {
        error:
          "entry must be {source:'none'} | {source:'wikimedia',url} | {source:'mapillary',imageId}",
      },
      { status: 400 }
    );
  }
  const repo = await placeImageCacheRepo();
  await repo.put(placeId, body.entry);
  return Response.json({ ok: true });
}

/** DELETE /api/discovery/place-image → 清空全部地点图片缓存，返回 { cleared } */
export async function DELETE() {
  const repo = await placeImageCacheRepo();
  const cleared = await repo.clearAll();
  return Response.json({ cleared });
}
