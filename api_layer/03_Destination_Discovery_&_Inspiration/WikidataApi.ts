/**
 * WikidataApi — 模块 03 Wikidata 外部 API 客户端（API Layer）
 *
 * 职责（单一）：
 *   - 仅负责与 Wikidata Action API 交流（实体搜索 wbsearchentities /
 *     实体详情 wbgetentities）；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程。
 *
 * 用途：Recommended Places 验证机制的兜底数据源——当 Geoapify 对热门
 * 目的地种子词返回道路/街区等非具体实体时，用 Wikidata 寻找该地点的
 * 命名实体（Q 条目 + 坐标 + 国家）。
 *
 * 项目约束（见 AGENTS.md）：
 *   - API 必须免费、无需信用卡 → Wikidata 公共 API 完全免费、无需 key；
 *   - 前端能实现的功能绝不交给后端 → wikidata.org 支持 CORS（origin=*），
 *     本客户端在浏览器端直连，无需本地代理。
 *
 * 官方文档：
 *   - wbsearchentities: https://www.wikidata.org/w/api.php?action=help&modules=wbsearchentities
 *   - wbgetentities:    https://www.wikidata.org/w/api.php?action=help&modules=wbgetentities
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述 Wikidata 返回结构）
// ---------------------------------------------------------------------------

/** Wikidata 实体搜索候选（wbsearchentities 精简形态） */
export interface WikidataSearchResultDto {
  /** Wikidata 实体 id（如 "Q1865"） */
  id: string;
  /** 实体名称（en label，如 "Kuala Lumpur"） */
  label: string;
  /** 实体描述（en description，如 "capital city of Malaysia"） */
  description?: string;
}

/** Wikidata 实体（wbgetentities 精简形态：搜索字段 + 坐标/国家） */
export interface WikidataPlaceDto extends WikidataSearchResultDto {
  /** 坐标（P625 coordinate location；缺失时 undefined） */
  lat?: number;
  lon?: number;
  /** 所在国家实体 id（P17 country；如 "Q833" = Malaysia） */
  countryId?: string;
}

/** wbsearchentities 响应结构（仅声明本客户端用到的字段） */
interface WbSearchEntitiesResponse {
  search?: Array<{
    id?: string;
    label?: string;
    description?: string;
  }>;
  error?: { code?: string; info?: string };
}

/** wbgetentities 响应结构（仅声明本客户端用到的 claims 字段） */
interface WbGetEntitiesResponse {
  entities?: Record<
    string,
    {
      id?: string;
      labels?: Record<string, { value?: string }>;
      claims?: {
        /** P625 coordinate location */
        P625?: Array<{
          mainsnak?: {
            datavalue?: { value?: { latitude?: number; longitude?: number } };
          };
        }>;
        /** P17 country */
        P17?: Array<{
          mainsnak?: {
            datavalue?: { value?: { id?: string } };
          };
        }>;
      };
    }
  >;
  error?: { code?: string; info?: string };
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

/** 瞬时失败（网络错误 / HTTP 429 限流 / 5xx / 非 JSON 响应）的最大重试次数 */
const MAX_WIKIDATA_RETRIES = 3;

/** 重试退避延迟（毫秒）：第 n 次重试前等待 1000 * 2^n */
const RETRY_BASE_DELAY_MS = 1000;

/** 延迟辅助（重试退避用） */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class WikidataApi {
  /** Wikidata Action API 端点（免费公共 API，无需 key，浏览器直连） */
  private readonly endpoint = "https://www.wikidata.org/w/api.php";

  /**
   * 实体搜索：按名称搜索 Wikidata 实体（候选 QID + label + description）。
   * 用于 Geoapify 兜底时定位"该地点"的命名实体。
   */
  async searchPlaces(
    query: string,
    limit = 5
  ): Promise<WikidataSearchResultDto[]> {
    const url = new URL(this.endpoint);
    url.searchParams.set("action", "wbsearchentities");
    url.searchParams.set("search", query);
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("origin", "*"); // 允许浏览器跨域（CORS）

    const data = await this.request<WbSearchEntitiesResponse>(
      url,
      "Wikidata search"
    );

    return (data.search ?? [])
      .filter(
        (item): item is { id: string; label: string; description?: string } =>
          Boolean(item.id && item.label)
      )
      .map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
      }));
  }

  /**
   * 实体详情：一次批量获取多个实体的坐标（P625）与所在国家（P17）。
   * 供 Business Logic 按"马来西亚"过滤 Wikidata 候选实体。
   */
  async getPlaceDetails(ids: string[]): Promise<WikidataPlaceDto[]> {
    if (ids.length === 0) return [];
    const url = new URL(this.endpoint);
    url.searchParams.set("action", "wbgetentities");
    url.searchParams.set("ids", ids.join("|"));
    url.searchParams.set("props", "claims|labels");
    url.searchParams.set("languages", "en");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*"); // 允许浏览器跨域（CORS）

    const data = await this.request<WbGetEntitiesResponse>(
      url,
      "Wikidata entities"
    );

    return Object.values(data.entities ?? {})
      .filter((entity) => Boolean(entity.id))
      .map((entity) => {
        const coord = entity.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
        const country = entity.claims?.P17?.[0]?.mainsnak?.datavalue?.value;
        const label = entity.labels?.en?.value;
        const lat = coord?.latitude;
        const lon = coord?.longitude;
        return {
          id: entity.id as string,
          label: label ?? entity.id as string,
          lat: typeof lat === "number" ? lat : undefined,
          lon: typeof lon === "number" ? lon : undefined,
          countryId: country?.id,
        };
      });
  }

  /**
   * 统一请求封装：发起 fetch → 校验 HTTP/业务错误 → 返回解析后的 JSON。
   * 瞬时失败（网络错误 / HTTP 429 限流 / 5xx / 非 JSON 响应）按指数退避
   * 重试（最多 MAX_WIKIDATA_RETRIES 次），避免 Wikidata 限流导致兜底失效。
   */
  private async request<T>(url: URL, label: string, attempt = 0): Promise<T> {
    const canRetry = attempt < MAX_WIKIDATA_RETRIES;

    let res: Response;
    try {
      res = await fetch(url.toString());
    } catch (err) {
      if (canRetry) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        return this.request(url, label, attempt + 1);
      }
      throw new Error(
        `${label} request failed (network error): ${(err as Error).message}`
      );
    }

    if (!res.ok) {
      // 429 限流与 5xx 上游故障属瞬时状态，退避重试；其余错误直接抛出
      if (canRetry && (res.status === 429 || res.status >= 500)) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        return this.request(url, label, attempt + 1);
      }
      throw new Error(
        `${label} request failed: HTTP ${res.status} ${res.statusText}`
      );
    }

    let data: T & { error?: { code?: string; info?: string } };
    try {
      data = (await res.json()) as T & {
        error?: { code?: string; info?: string };
      };
    } catch {
      // 限流时 Wikidata 可能返回 200 + 纯文本提示（非 JSON），按瞬时失败重试
      if (canRetry) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        return this.request(url, label, attempt + 1);
      }
      throw new Error(`${label} error: invalid JSON response`);
    }

    if (data.error) {
      throw new Error(
        `${label} error: ${data.error.code ?? ""} ${data.error.info ?? ""}`
      );
    }
    return data;
  }
}

export const wikidataApi = new WikidataApi();
