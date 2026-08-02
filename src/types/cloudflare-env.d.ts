// 扩展 @opennextjs/cloudflare 的 CloudflareEnv 全局接口，
// 将 wrangler.json 中定义的绑定补充到类型系统中。
declare global {
  interface CloudflareEnv {
    /** D1 binding defined in wrangler.json */
    TEST_DB: D1Database;
    /** KV binding defined in wrangler.json */
    TEST_KV: KVNamespace;
  }
}

export {};
