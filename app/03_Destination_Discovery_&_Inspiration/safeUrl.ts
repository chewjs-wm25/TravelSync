/**
 * safeUrl.ts — 外部 URL 协议白名单（Presentation Layer 工具）
 *
 * 安全审计修复（见 docs/fix/module03-security-audit.md §3.2）：
 *   渲染到 <a href> / <img src> 的外部 URL 仅允许 http:/https: 协议，
 *   过滤 javascript:、data: 等异常协议，防存储型 XSS 与内容注入。
 *
 * 用法：渲染外部链接/图片前经 safeHttpUrl 过滤；
 *       非法 URL 返回空串（渲染为空链接/空图，不执行任何脚本）。
 */

const HTTP_URL_PATTERN = /^https?:\/\/\S+$/i;

/**
 * 协议白名单过滤：仅返回 http/https 绝对 URL；
 * 其余（相对路径、空值、javascript:、data: 等）一律返回空字符串。
 */
export function safeHttpUrl(url: string | null | undefined): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  return HTTP_URL_PATTERN.test(trimmed) ? trimmed : "";
}
