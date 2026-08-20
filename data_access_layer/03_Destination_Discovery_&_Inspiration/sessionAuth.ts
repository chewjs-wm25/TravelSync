/**
 * sessionAuth.ts — 浏览器端会话凭证注入（Data Access Layer, 浏览器端）
 *
 * 职责（单一）：从账号状态（authUser store）读取当前会话 token，
 *              为 Remote 仓储的 HTTP 请求构造 Authorization 头。
 *
 * 依赖说明：Remote 仓储运行于浏览器，读取全局会话状态属认证上下文注入
 *           （等价于真实架构中 HTTP 客户端拦截器读取 auth context）；
 *           服务端 Route API 一律从请求头解析会话，不信任任何请求参数。
 *
 * 未来演进：01 模块真实会话体系落地后，本模块随 authUser store 一并替换，
 *           各 Remote 仓储调用点保持不变。
 */

import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";

/**
 * 当前会话的请求头；未登录（无 token）返回空对象（请求不带 Authorization，
 * 服务端按匿名处理：公开读可用，写操作返回 401）。
 */
export function sessionAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
