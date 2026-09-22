/**
 * app/03_Destination_Discovery_&_Inspiration/api/mapillary/route.ts — 模块 03 Mapillary 代理 Route API
 *
 * 职责（单一）：服务端代理传输层。
 *   - 白名单校验请求参数（action / bbox / imageId），拒绝非法输入；
 *   - 服务端强制马来西亚范围：bbox 必须完全落在马来西亚边界框内
 *     （见 api_layer MalaysiaBounds），前端无法绕过；
 *   - 在服务端注入 Mapillary access token（process.env.MAPILLARY_ACCESS_TOKEN，
 *     非 NEXT_PUBLIC，token 不再暴露给前端 bundle）；
 *   - 转发到 graph.mapillary.com 并透传原始 JSON 响应
 *     （响应解析由 API Layer 客户端 MapillaryApi 完成）。
 *
 * 支持两种动作：
 *   - action=search&bbox=minLon,minLat,maxLon,maxLat → 按经纬度范围搜索图片，返回 id 列表；
 *   - action=image&imageId=... → 按图片 id 获取图片信息（含有时效的 thumb URL）。
 *
 * 认证说明：access token 从服务端环境变量读取（本地 .env / Cloudflare vars 或 secrets）。
 */

import { MALAYSIA_BBOX } from "@/api_layer/03_Destination_Discovery_&_Inspiration/MalaysiaBounds";

/** Mapillary Graph API 端点 */
const MAPILLARY_GRAPH_BASE_URL = "https://graph.mapillary.com";

/** 允许的动作（白名单） */
const ALLOWED_ACTIONS = new Set(["search", "image"]);

/** Mapillary 图片 id 允许的字符集与长度上限（v4 id 为长数字字符串） */
const IMAGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** bbox 单边最大跨度（度，约 ±0.5° ≈ 55km，防止超大范围滥用） */
const BBOX_MAX_SPAN = 0.5;

/** 服务端读取 Mapillary access token（非 NEXT_PUBLIC，仅服务端可见） */
function mapillaryAccessToken(): string {
  const token = process.env.MAPILLARY_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "Missing MAPILLARY_ACCESS_TOKEN. Add it to .env (server-side, not NEXT_PUBLIC_*) to enable Mapillary proxy."
    );
  }
  return token;
}

/** 解析并校验 bbox 参数（minLon,minLat,maxLon,maxLat，WGS84） */
function parseBbox(raw: string): {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
} | null {
  const parts = raw.split(",");
  if (parts.length !== 4) return null;
  const [minLon, minLat, maxLon, maxLat] = parts.map((p) => Number(p));
  if (
    !Number.isFinite(minLon) ||
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLon) ||
    !Number.isFinite(maxLat)
  ) {
    return null;
  }
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) return null;
  if (minLon > maxLon || minLat > maxLat) return null;
  if (maxLon - minLon > BBOX_MAX_SPAN || maxLat - minLat > BBOX_MAX_SPAN) {
    return null;
  }
  // 服务端强制马来西亚范围：bbox 必须完全落在马来西亚边界框内
  // （与 api_layer MalaysiaBounds 保持一致，前端无法绕过）
  if (
    minLon < MALAYSIA_BBOX.minLon ||
    maxLon > MALAYSIA_BBOX.maxLon ||
    minLat < MALAYSIA_BBOX.minLat ||
    maxLat > MALAYSIA_BBOX.maxLat
  ) {
    return null;
  }
  return { minLon, minLat, maxLon, maxLat };
}

/** GET /03_Destination_Discovery_&_Inspiration/api/mapillary?action=... → 透传 Mapillary JSON */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // ---- 参数白名单校验 ----
  const action = params.get("action")?.trim() ?? "";
  if (!ALLOWED_ACTIONS.has(action)) {
    return Response.json(
      { message: "action must be 'search' or 'image'" },
      { status: 400 }
    );
  }

  // ---- 拼装外部请求（先校验参数，再读 token，保证非法参数恒返回 400） ----
  let url: URL;
  if (action === "search") {
    const bbox = parseBbox(params.get("bbox")?.trim() ?? "");
    if (!bbox) {
      return Response.json(
        {
          message:
            "bbox must be 4 numbers: minLon,minLat,maxLon,maxLat (span <= 0.5 deg, fully within Malaysia)",
        },
        { status: 400 }
      );
    }
    url = new URL(`${MAPILLARY_GRAPH_BASE_URL}/images`);
    url.searchParams.set(
      "bbox",
      `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`
    );
    url.searchParams.set("fields", "id");
    url.searchParams.set("limit", "10");
  } else {
    const imageId = params.get("imageId")?.trim() ?? "";
    if (!imageId || !IMAGE_ID_PATTERN.test(imageId)) {
      return Response.json(
        { message: "imageId is required and must be alphanumeric" },
        { status: 400 }
      );
    }
    url = new URL(`${MAPILLARY_GRAPH_BASE_URL}/${imageId}`);
    url.searchParams.set("fields", "thumb_1024_url");
  }

  let token: string;
  try {
    token = mapillaryAccessToken();
  } catch (err) {
    return Response.json({ message: (err as Error).message }, { status: 500 });
  }
  url.searchParams.set("access_token", token);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    return Response.json(
      {
        message: `Mapillary request failed (network error): ${(err as Error).message}`,
      },
      { status: 502 }
    );
  }

  // 透传上游状态码与 JSON 响应（前端客户端负责 DTO 解析）
  const body = await res.text().catch(() => "");
  return new Response(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
