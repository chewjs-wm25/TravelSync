/**
 * userAccountStub.ts — 模块 01（User & Account Management）账号数据 stub
 *
 * 职责（单一）：模拟从 01 模块获取"账号相关数据"，供前端账号状态
 * （app/DEV-ACCOUNT-STATE/authUser.ts）登录时消费。
 *
 * 本文件同时被服务端 DEV 登录 Route API（app/api/DEV-ACCOUNT-STATE/login/route.ts）
 * import（DEV_USER_ACCOUNT 常量），因此不包含任何 "use client" 指令，
 * 也不依赖 React —— 纯数据常量 + fetch 封装，前后端均可安全引用。
 *
 * 未来演进（TODO）：
 *   - 用户头像将存储于 Cloudflare KV 数据库，经 01 模块 Route API 返回真实 URL；
 *     现阶段由本 stub 直接返回原头像图像文件 public/images.jpg（即 "/images.jpg"）。
 *   - 01 模块真实登录/会话实现后，替换 fetchUserAccount 的端点与响应结构即可，
 *     上层（authUser store / Header）无需改动。
 */

/** 账号数据形态（01 模块用户实体在当前 DEV 阶段的投影） */
export interface UserAccount {
  /** 用户唯一 ID（未来由 01 模块账号体系提供；收藏等数据按此归属） */
  id: string;
  /** 显示名称 */
  name: string;
  /**
   * 头像 URL。现阶段为 stub 直出 public/images.jpg；
   * 未来存 KV 后，此处将由 01 模块返回 KV 头像的访问地址。
   */
  avatarUrl: string;
  /** 角色（授权用）：DEV 阶段账号为 admin，可调用同步/清空类管理接口 */
  role: string;
}

/** 登录成功返回：账号数据 + 会话凭证（token 由服务端 HMAC 签发，前端不可伪造） */
export interface UserAccountSession {
  user: UserAccount;
  token: string;
}

/**
 * DEV 账号数据（模拟 01 模块数据库中的账号记录，集中定义避免前后端两份硬编码）。
 * 服务端 DEV 登录 Route API 据此签发会话；前端 stub 的 fetchUserAccount 返回同一份数据。
 */
export const DEV_USER_ACCOUNT: UserAccount = {
  id: "dev-user-001",
  name: "Flandre Scarlet",
  avatarUrl: "/images.jpg", // TODO: 未来头像存 KV，经 01 模块 Route API 返回真实 URL
  role: "admin",
};

/** DEV 登录 Route API 端点（01 模块真实认证 API 的 DEV 替身） */
const DEV_LOGIN_API = "/api/DEV-ACCOUNT-STATE/login";

/**
 * 模拟从 01 模块获取账号相关数据 + 会话凭证。
 * 当前实现：调用 DEV 登录 Route API（服务端签发可校验 token）；
 * 未来替换为 01 模块真实登录端点后，本函数签名保持不变。
 */
export async function fetchUserAccount(): Promise<UserAccountSession> {
  const res = await fetch(DEV_LOGIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user account (HTTP ${res.status})`);
  }
  return (await res.json()) as UserAccountSession;
}
