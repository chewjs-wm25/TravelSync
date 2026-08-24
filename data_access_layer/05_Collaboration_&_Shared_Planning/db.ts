import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";

/**
 * 统一 Data Access 入口：经 OpenNext 官方 context 拿 D1 binding。
 * 仅 Data Access Layer 允许触碰存储。
 */
export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.TEST_DB;
}