/**
 * RemoteFavoritesRepository — 模块 03 收藏夹仓储的远程实现（Data Access Layer, 浏览器端）
 *
 * 职责：以 HTTP 调用 Route API（app/03_Destination_Discovery_&_Inspiration/api/favourites）实现 FavoritesRepository，
 *       仅做参数序列化与响应解析，不含任何 SQL / 数据库逻辑
 *       （数据库操作由服务端 D1FavoritesRepository 承担）。
 *
 * 授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）：
 *   - 请求携带当前会话凭证（Authorization: Bearer <token>），
 *     服务端以会话解析当前用户 ID —— 本类不再向服务端传递 userId 参数
 *     （签名保留 userId 参数仅为兼容接口契约，实现中忽略），
 *     杜绝"前端指定任意 userId"的越权路径；
 *   - 未登录（无 token）：GET 返回空列表（服务端按匿名返回 []），
 *     POST / DELETE 服务端返回 401 并在此抛出 Error。
 *
 * 依赖方向：浏览器端 BL → 本类 → Route API → D1FavoritesRepository → D1。
 */

import type {
  FavoriteItemEntity,
  FavoritesRepository,
} from "./FavoritesRepository";
import { sessionAuthHeaders } from "./sessionAuth";

/** Route API 端点（模块 03 收藏夹；统一路径见 guideline §5，前导 / 保证任意子路由下解析正确） */
const FAVORITES_API = "/03_Destination_Discovery_&_Inspiration/api/favourites";

export class RemoteFavoritesRepository implements FavoritesRepository {
  /**
   * 读取当前会话用户的收藏列表。
   * 注意：接口签名中的 userId 参数在本实现中省略——服务端以会话凭证
   * （Authorization 头）解析用户 ID，不信任前端传入的 userId。
   */
  async listItems(): Promise<FavoriteItemEntity[]> {
    const res = await fetch(FAVORITES_API, {
      headers: sessionAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to load favourites (HTTP ${res.status})`);
    }
    return res.json();
  }

  /** 为当前会话用户新增收藏（同上：userId 以会话为准，参数省略） */
  async addItem(item: FavoriteItemEntity): Promise<FavoriteItemEntity> {
    const res = await fetch(FAVORITES_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...sessionAuthHeaders(),
      },
      body: JSON.stringify({ item }),
    });
    if (!res.ok) {
      throw new Error(`Failed to add favourite (HTTP ${res.status})`);
    }
    return res.json();
  }

  /** 移除当前会话用户的一条收藏（同上：userId 以会话为准，参数省略） */
  async removeItem(id: string): Promise<void> {
    const res = await fetch(`${FAVORITES_API}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: sessionAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to remove favourite (HTTP ${res.status})`);
    }
  }
}

export const remoteFavoritesRepository = new RemoteFavoritesRepository();
