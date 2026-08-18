/**
 * app/03_Destination_Discovery_&_Inspiration/api/discovery/geocode_route.ts — 模块 03 Geoapify Geocoding 代理 Route API
 *
 * 职责（单一）：服务端代理传输层。
 *   - 白名单校验请求参数（type / text / limit），拒绝非法输入；
 *   - 在服务端注入 Geoapify API key（process.env.GEOAPIFY_API_KEY，
 *     非 NEXT_PUBLIC，密钥不再暴露给前端 bundle）；
 *   - 服务端强制马来西亚限制（filter=countrycode:my），前端无法绕过；
 *   - 转发到 api.geoapify.com 并透传原始 GeoJSON 响应（保持薄传输，
 *     响应解析仍由 API Layer 客户端 GeoapifyGeocodingApi 完成）。
 *
 * 认证说明：API key 从服务端环境变量读取（本地 .env / Cloudflare vars 或 secrets），
 * 前端只与本端点通信，不再直连 Geoapify。
 */

/** Geoapify Geocoding API 端点（autocomplete / search） */
const GEOAPIFY_GEOCODE_BASE_URL = "https://api.geoapify.com/v1/geocode";

/** 允许的查询类型（白名单，防止任意端点注入） */
const ALLOWED_TYPES = new Set(["autocomplete", "search"]);

/** text 长度上限（防滥用） */
const TEXT_MAX_LENGTH = 200;

/** limit 允许范围 */
const LIMIT_MIN = 1;
const LIMIT_MAX = 20;

/** 服务端读取 Geoapify API key（非 NEXT_PUBLIC，仅服务端可见） */
function geoapifyApiKey(): string {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) {
    throw new Error(
      "Missing GEOAPIFY_API_KEY. Add it to .env (server-side, not NEXT_PUBLIC_*) to enable Geoapify proxy."
    );
  }
  return key;
}

/** GET /api/discovery/geocode?type=autocomplete|search&text=...&limit=... → 透传 GeoJSON */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // ---- 参数白名单校验 ----
  const type = params.get("type")?.trim() ?? "";
  if (!ALLOWED_TYPES.has(type)) {
    return Response.json(
      { error: "type must be 'autocomplete' or 'search'" },
      { status: 400 }
    );
  }

  const text = params.get("text")?.trim() ?? "";
  if (!text || text.length > TEXT_MAX_LENGTH) {
    return Response.json(
      { error: `text is required and must be <= ${TEXT_MAX_LENGTH} chars` },
      { status: 400 }
    );
  }

  const rawLimit = params.get("limit") ?? "";
  let limit = 5;
  if (rawLimit) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < LIMIT_MIN || limit > LIMIT_MAX) {
      return Response.json(
        {
          error: `limit must be an integer between ${LIMIT_MIN} and ${LIMIT_MAX}`,
        },
        { status: 400 }
      );
    }
  }

  let apiKey: string;
  try {
    apiKey = geoapifyApiKey();
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }

  // ---- 服务端拼装外部请求（强制马来西亚限制，前端不可绕过） ----
  const url = new URL(`${GEOAPIFY_GEOCODE_BASE_URL}/${type}`);
  url.searchParams.set("text", text);
  url.searchParams.set("filter", "countrycode:my");
  url.searchParams.set("lang", "en");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("apiKey", apiKey);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    return Response.json(
      {
        error: `Geoapify ${type} request failed (network error): ${(err as Error).message}`,
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
