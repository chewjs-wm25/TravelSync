/**
 * app/03_Destination_Discovery_&_Inspiration/api/place-image/route.ts — 模块 03 地点图片缓存 Route API（薄传输桥）
 *
 * 职责（单一）：HTTP 传输层。
 *   - 解析 / 校验请求参数；
 *   - 获取 Cloudflare KV binding（PLACE_IMAGE_CACHE）；
 *   - 实例化 CloudflareKvPlaceImageCacheRepository 并委托其方法；
 *   - 序列化响应。
 *
 * 授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）：
 *   - GET（公开读缓存）保持匿名可访问；
 *   - PUT（写入缓存）为正常用户流程，要求登录会话（401）；
 *   - DELETE（清空全部缓存）为危险操作，要求管理员会话（401/403）。
 *
 * 值语义（与仓储一致，v5 来源引用格式）：
 *   - GET 返回 { entry }：entry 为 null = 未缓存；{source:"none"} = 确定无图；
 *     {source:"wikimedia",url} = 永久 URL；{source:"mapillary",imageId} = 图片 id
 *     （URL 有时效，用 id 换取新 URL，不得缓存 URL）；
 *   - PUT 写入 { placeId, entry }，entry.source 枚举校验；
 *     wikimedia url 额外校验 http/https 协议（防存储型 XSS 的纵深防御，
 *     见 docs/fix/module03-security-audit.md §3.2）。
 *
 * 本文件不含任何 KV 读写逻辑（KV 操作全部位于 Data Access 层
 * CloudflareKvPlaceImageCacheRepository 内）。
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { CloudflareKvPlaceImageCacheRepository } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/PlaceImageCacheRepository";
import type { PlaceImageCacheEntry } from "@/data_access_layer/03_Destination_Discovery_&_Inspiration/PlaceImageCacheRepository";
import { requireAdmin, requireUser } from "@/app/DEV-ACCOUNT-STATE/api/session";

/** 仅允许 http/https 协议的绝对 URL（防 javascript:、data: 等异常协议） */
const HTTP_URL_PATTERN = /^https?:\/\/\S+$/i;

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
  if (e.source === "wikimedia") {
    return (
      typeof e.url === "string" &&
      e.url.length > 0 &&
      HTTP_URL_PATTERN.test(e.url)
    );
  }
  if (e.source === "mapillary") {
    return typeof e.imageId === "string" && e.imageId.length > 0;
  }
  return false;
}

/** GET /03_Destination_Discovery_&_Inspiration/api/place-image?placeId=xxx → { entry: PlaceImageCacheEntry | null }（公开读） */
export async function GET(request: Request) {
  const placeId = new URL(request.url).searchParams.get("placeId")?.trim();
  if (!placeId) {
    return Response.json({ message: "placeId is required" }, { status: 400 });
  }
  const repo = await placeImageCacheRepo();
  const entry = await repo.get(placeId);
  return Response.json({ entry });
}

/** PUT /03_Destination_Discovery_&_Inspiration/api/place-image  body: { placeId, entry } → 写入缓存（登录用户） */
export async function PUT(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    placeId?: unknown;
    entry?: unknown;
  } | null;
  const placeId = typeof body?.placeId === "string" ? body.placeId.trim() : "";
  if (!placeId) {
    return Response.json({ message: "placeId is required" }, { status: 400 });
  }
  if (!isValidEntry(body?.entry)) {
    return Response.json(
      {
        message:
          "entry must be {source:'none'} | {source:'wikimedia',url(http/https)} | {source:'mapillary',imageId}",
      },
      { status: 400 }
    );
  }
  const repo = await placeImageCacheRepo();
  await repo.put(placeId, body.entry);
  return Response.json({ success: true });
}

/** DELETE /03_Destination_Discovery_&_Inspiration/api/place-image → 清空全部地点图片缓存，返回 { cleared }（管理员） */
export async function DELETE(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const repo = await placeImageCacheRepo();
  const cleared = await repo.clearAll();
  return Response.json({ cleared });
}
