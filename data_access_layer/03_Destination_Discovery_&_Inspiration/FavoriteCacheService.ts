/**
 * FavoriteCacheService — 模块 03 缓存访问接口（Data Access Layer, Cloudflare KV 预留）
 *
 * 职责（单一）：
 *   - 提供 KV 键值缓存的读写接口（如 POI 列表缓存、活动日历缓存）；
 *   - 不包含业务判断（缓存策略由 Business Logic Layer 编排）。
 *
 * Cloudflare KV 对接预留：
 *   未来实现类通过 KV binding 访问，例如：
 *
 *     import type { KVNamespace } from "@cloudflare/workers-types";
 *
 *     export class CloudflareKvCacheService implements FavoriteCacheService {
 *       constructor(private readonly kv: KVNamespace) {}
 *
 *       async get(key: string): Promise<string | null> {
 *         return this.kv.get(key);
 *       }
 *       async put(key: string, value: string, expirationTtl?: number): Promise<void> {
 *         await this.kv.put(key, value, { expirationTtl });
 *       }
 *       async delete(key: string): Promise<void> {
 *         await this.kv.delete(key);
 *       }
 *     }
 *
 *   建议 KV 命名空间与键前缀：`FAVORITES_CACHE`，键如 `dgm:pois:*`、`dgm:events:*`。
 */

export interface FavoriteCacheService {
  /** 读取缓存值；未命中或已过期返回 null */
  get(key: string): Promise<string | null>;
  /** 写入缓存；expirationTtl 单位为秒，缺省为不过期 */
  put(key: string, value: string, expirationTtl?: number): Promise<void>;
  /** 删除缓存键 */
  delete(key: string): Promise<void>;
}

/** 内存 mock 实现（未来替换为 CloudflareKvCacheService，签名不变） */
export class MemoryFavoriteCacheService implements FavoriteCacheService {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(key: string, value: string, expirationTtl?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: expirationTtl !== undefined ? Date.now() + expirationTtl * 1000 : null,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
