/**
 * app/api/discovery/place-details/route.ts — 模块 03 Geoapify Place Details 代理 Route API
 *
 * 职责（单一）：服务端代理传输层。
 *   - 白名单校验请求参数（id），拒绝非法输入；
 *   - 在服务端注入 Geoapify API key（process.env.GEOAPIFY_API_KEY，
 *     非 NEXT_PUBLIC，密钥不再暴露给前端 bundle）；
 *   - 转发到 api.geoapify.com/v2/place-details 并透传原始 JSON 响应
 *     （响应解析仍由 API Layer 客户端 PlaceDetailsApi 完成）。
 *
 * 认证说明：API key 从服务端环境变量读取（本地 .env / Cloudflare vars 或 secrets），
 * 前端只与本端点通信，不再直连 Geoapify。
 */

/** Geoapify Place Details API 端点 */
const GEOAPIFY_PLACE_DETAILS_URL = "https://api.geoapify.com/v2/place-details";

/** place_id 允许的字符集与长度上限（宽松校验，避免误杀合法 id） */
const PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

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

/** GET /api/discovery/place-details?id=... → 透传 Place Details JSON */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  // ---- 参数白名单校验 ----
  const id = params.get("id")?.trim() ?? "";
  if (!id || !PLACE_ID_PATTERN.test(id)) {
    return Response.json(
      { error: "id (Geoapify place_id) is required and must be alphanumeric" },
      { status: 400 }
    );
  }

  let apiKey: string;
  try {
    apiKey = geoapifyApiKey();
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }

  // ---- 服务端拼装外部请求 ----
  const url = new URL(GEOAPIFY_PLACE_DETAILS_URL);
  url.searchParams.set("id", id);
  url.searchParams.set("lang", "en");
  url.searchParams.set("apiKey", apiKey);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    return Response.json(
      { error: `Geoapify place-details request failed (network error): ${(err as Error).message}` },
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
