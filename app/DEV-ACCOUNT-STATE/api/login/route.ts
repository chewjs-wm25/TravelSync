/**
 * app/api/DEV-ACCOUNT-STATE/login/route.ts — DEV 登录 Route API（薄传输桥）
 *
 * 职责（单一）：HTTP 传输层。
 *   - 从账号数据 stub（DEV_USER_ACCOUNT，模拟 01 模块账号记录）读取账号数据；
 *   - 经服务端会话工具签发 HMAC 签名 token（前端不可伪造）；
 *   - 返回 { user, token } 供前端账号状态（authUser store）持久化。
 *
 * 本文件为 DEV 专用接口：模拟"从 01 模块获取账号相关数据"的服务端环节，
 * 未来 01 模块真实登录（邮箱/密码、Google OAuth）实现后删除本接口，
 * 前端 userAccountStub.fetchUserAccount 的端点与响应结构保持兼容即可。
 */

import { DEV_USER_ACCOUNT } from "../../../DEV-ACCOUNT-STATE/userAccountStub";
import { createSessionToken } from "../session";

/** POST /api/DEV-ACCOUNT-STATE/login → { user, token }（DEV stub 登录） */
export async function POST() {
  const token = await createSessionToken({
    id: DEV_USER_ACCOUNT.id,
    role: DEV_USER_ACCOUNT.role,
  });
  return Response.json({ user: DEV_USER_ACCOUNT, token });
}
