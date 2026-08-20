/**
 * app/DEV-ACCOUNT-STATE/api/session.ts — DEV 会话凭证工具（服务端）
 *
 * 职责（单一）：签发 / 校验登录会话 token（HMAC-SHA256 签名，无状态）。
 *   - createSessionToken：为账号签发带签名与过期时间的 token；
 *   - getAuthSession：从请求 Authorization: Bearer <token> 解析并校验会话；
 *   - requireUser / requireAdmin：为 Route API 提供"登录 / 管理员"授权结果。
 *
 * 安全说明：
 *   - 签名密钥 DEV_SESSION_SECRET 仅存于服务端环境变量（.env，已被 gitignore），
 *     前端无法伪造 token —— 修复"收藏接口信任前端 userId"与"写删接口无授权"隐患的基础；
 *   - token 载荷 { userId, role, exp }，base64url 编码，签名串接其后；
 *   - 校验失败（格式/签名/过期任一不通过）一律视为无会话（fail-closed）；
 *   - 本文件为 DEV 阶段替身：未来 01 模块真实会话体系（如 Cloudflare 平台 Session/
 *     D1 会话表）落地后替换，Route API 调用点保持不变。
 */

/** 会话有效期（毫秒）：DEV 阶段 24 小时 */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** 解析后的会话信息（token 载荷的投影） */
export interface AuthSession {
  userId: string;
  role: string;
}

/** 授权结果：成功携带会话；失败携带可直接返回的 HTTP 响应 */
export type AuthResult =
  { ok: true; session: AuthSession } | { ok: false; response: Response };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** 服务端会话签名密钥（fail-closed：缺失时拒绝一切签发/校验） */
function getDevSessionSecret(): string {
  const secret = process.env.DEV_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Missing DEV_SESSION_SECRET. Add it to .env (server-side, not NEXT_PUBLIC_*) to enable DEV session auth."
    );
  }
  return secret;
}

/** HMAC-SHA256 签名（Web Crypto，Workers/Node 内置，无第三方依赖） */
async function hmacSign(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(data)
  );
  return new Uint8Array(signature);
}

/** 字节数组 → base64url（无 padding，URL 安全） */
function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** base64url → 字节数组（容忍缺 padding） */
function base64urlDecode(input: string): Uint8Array {
  const b64 =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** 常数时间字节比较（防时序侧信道；长度不同直接失败） */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * 签发会话 token：`base64url({userId, role, exp}).base64url(hmac)`
 */
export async function createSessionToken(user: {
  id: string;
  role: string;
}): Promise<string> {
  const secret = getDevSessionSecret();
  const payload = {
    userId: user.id,
    role: user.role,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = base64urlEncode(
    textEncoder.encode(JSON.stringify(payload))
  );
  const signature = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${base64urlEncode(signature)}`;
}

/** 校验 token（格式 / 签名 / 过期），任一失败返回 null */
export async function verifySessionToken(
  token: string
): Promise<AuthSession | null> {
  try {
    const secret = getDevSessionSecret();
    const dot = token.lastIndexOf(".");
    if (dot <= 0 || dot === token.length - 1) return null;

    const payloadB64 = token.slice(0, dot);
    const signatureB64 = token.slice(dot + 1);

    // 1) 签名校验：防伪造
    const expected = await hmacSign(secret, payloadB64);
    const actual = base64urlDecode(signatureB64);
    if (!timingSafeEqual(expected, actual)) return null;

    // 2) 载荷解析与结构校验
    const payload = JSON.parse(
      textDecoder.decode(base64urlDecode(payloadB64))
    ) as Partial<AuthSession> & { exp?: number };
    if (typeof payload.userId !== "string" || payload.userId.length === 0) {
      return null;
    }
    if (typeof payload.role !== "string" || payload.role.length === 0) {
      return null;
    }

    // 3) 过期校验
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }

    return { userId: payload.userId, role: payload.role };
  } catch {
    return null; // fail-closed：任何解析异常均视为无会话
  }
}

/** 从请求头解析会话（Authorization: Bearer <token>）；无/无效凭证返回 null */
export async function getAuthSession(
  request: Request
): Promise<AuthSession | null> {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;
  return verifySessionToken(token);
}

/** 要求已登录：未登录返回 401 响应 */
export async function requireUser(request: Request): Promise<AuthResult> {
  const session = await getAuthSession(request);
  if (!session) {
    return {
      ok: false,
      response: Response.json(
        { error: "Unauthorized: please log in first" },
        { status: 401 }
      ),
    };
  }
  return { ok: true, session };
}

/** 要求管理员：未登录 401；非 admin 角色 403 */
export async function requireAdmin(request: Request): Promise<AuthResult> {
  const result = await requireUser(request);
  if (!result.ok) return result;
  if (result.session.role !== "admin") {
    return {
      ok: false,
      response: Response.json(
        { error: "Forbidden: admin role required" },
        { status: 403 }
      ),
    };
  }
  return result;
}
