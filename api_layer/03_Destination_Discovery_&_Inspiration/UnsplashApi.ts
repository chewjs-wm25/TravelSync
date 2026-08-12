/**
 * UnsplashApi — 模块 03 Unsplash 照片搜索外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Unsplash Search API 交流（按地名关键词搜索一张占位图）；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 官方文档：
 *   - Search Photos: https://unsplash.com/documentation#search-photos
 *   - 认证：请求头 Authorization: Client-ID <key>，或 query 参数 client_id。
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Unsplash 免费 demo 模式（50 请求/小时，
 *     无需信用卡，注册开发者账号即可获得 Access Key）；
 *   - Unsplash 要求直接热链（hotlink）其 CDN 图片 URL，本客户端直接返回
 *     urls.small 供 <img> 使用，符合官方规范；
 *   - 图片获取在前端完成（浏览器端直连，不经过后端）。
 *
 * 密钥来源：.env 中的 NEXT_PUBLIC_UNSPLASH_ACCESS_KEY。
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 Unsplash 返回结构）
// ---------------------------------------------------------------------------

/** Unsplash 图片 URL 集合（直接热链 CDN 地址） */
export interface UnsplashPhotoUrlsDto {
  /** 1080w，详情页大图用 */
  regular?: string;
  /** 400w，卡片图用（省流量） */
  small?: string;
}

/** Unsplash 搜索响应结构（仅声明本客户端用到的字段） */
interface UnsplashSearchResponse {
  results?: Array<{
    urls?: UnsplashPhotoUrlsDto;
  }>;
  errors?: string[];
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class UnsplashApi {
  private readonly baseUrl = "https://api.unsplash.com/search/photos";

  /** API key：.env → NEXT_PUBLIC_UNSPLASH_ACCESS_KEY；未配置时返回 null（跳过兜底） */
  private get accessKey(): string | null {
    return process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || null;
  }

  /**
   * 按地名关键词搜索一张横向占位图（取第一张的 urls.small）。
   * 任何失败（未配置 key / 网络错误 / HTTP 非 2xx 含 429 限流 / API 错误 /
   * 无结果 / 无 small URL）均静默降级返回 null，由上层展示占位图。
   */
  async searchPhoto(keyword: string): Promise<string | null> {
    const key = this.accessKey;
    const trimmed = keyword.trim();
    if (!key || !trimmed) return null;

    const url = new URL(this.baseUrl);
    url.searchParams.set("query", trimmed);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape"); // 卡片/详情图均为横向
    url.searchParams.set("client_id", key);

    let res: Response;
    try {
      res = await fetch(url.toString());
    } catch {
      return null; // 网络错误：静默降级
    }

    if (!res.ok) return null; // HTTP 错误（含 429 限流）：静默降级

    let data: UnsplashSearchResponse;
    try {
      data = (await res.json()) as UnsplashSearchResponse;
    } catch {
      return null; // 响应解析失败：静默降级
    }

    if (data.errors && data.errors.length > 0) return null;
    const smallUrl = data.results?.[0]?.urls?.small;
    return smallUrl && /^https?:\/\//i.test(smallUrl) ? smallUrl : null;
  }
}

export const unsplashApi = new UnsplashApi();
