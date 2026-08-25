/**
 * sessionAuth.ts — 浏览器端会话凭证注入（Data Access Layer, 浏览器端）
 *
 * 职责（单一）：为 Remote 仓储的 HTTP 请求构造认证头。
 *
 * 认证方式已迁移为 cookie-based（httpOnly cookie `travelsync_session`），
 * 浏览器 fetch 自动携带 cookie，无需显式注入 Authorization 头。
 * 本函数保留接口兼容性，返回空对象（cookie 由浏览器自动处理）。
 */

/**
 * 当前会话的请求头。cookie-based 认证由浏览器自动携带，
 * 此函数返回空对象以保持调用点兼容。
 */
export function sessionAuthHeaders(): HeadersInit {
  return {};
}
