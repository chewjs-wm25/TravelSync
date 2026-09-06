/**
 * MotacMyTqaApi — 模块 03 MOTAC 官网 MyTQA（Malaysia Tourism Quality Assurance）
 * 官方品质评级列表爬虫客户端（API Layer, 服务端）
 *
 * 职责（单一）：
 *   - 仅负责与 MOTAC 官网（www.motac.gov.my）交流，通过其 WordPress
 *     admin-ajax.php 异步接口抓取 MyTQA 认证机构列表并解析为纯数据 DTO；
 *   - 不包含业务规则（除抓取策略外）、不触碰本地持久化、不编排跨模块流程
 *     （编排在 Business Logic Layer 的 QualityRatingWebSyncService 内）。
 *
 * 数据来源与请求策略（2026-09 实测抓包/验证）：
 *   - 列表页（作 Referer）：https://www.motac.gov.my/en/kategori-semakan-new/malaysia-tourism-quality-assurancesmytqa/
 *   - 端点：POST https://www.motac.gov.my/wp-admin/admin-ajax.php
 *   - action：motac_semakan_filter（页面内联脚本中确认，无 nonce、无需会话/cookie）
 *   - 表单字段：action / kategori=malaysia-tourism-quality-assurancesmytqa /
 *     search / negeri / klasifikasi / jenis / page / per_page（application/x-www-form-urlencoded
 *     与 multipart 均可，实测前者成功；per_page 实测精确生效，传 200+ 可一次取回全量）
 *   - 响应：JSON { success, data: { html, pagination, showing, total } }；
 *     data.html 为预渲染卡片 HTML（公司名/地址/电话/评级有效期/品质等级）；
 *     响应头 Cache-Control: no-store（实时数据）→ 抓取必须低频、克制。
 *
 * 解析选择器（对官网结构敏感，改版后需按新结构微调；宁可抛错也绝不误删上层数据）：
 *   - 卡片容器：<div class="motac-card">
 *   - 公司名/地址：div.company-name / div.company-address（div.col-company 内）
 *   - 电话：div.company-phone（含 svg 图标 + 文本，去标签取文本，可能为空）
 *   - 评级有效期：div.col.col-tempoh（如 "22/06/26 - 21/06/29"）
 *   - 品质等级：div.col.col-bidang（Platinum / Gold / Silver）
 *
 * 项目约束（见 AGENTS.md）：
 *   - 不新增依赖库（禁用 axios/cheerio）→ 使用内置 fetch + 手写正则解析与 HTML 实体解码；
 *   - 旅游范围仅限马来西亚 → 目标站本身即马来西亚政府官方站。
 *
 * 返回语义（供上层决定是否落库/清理）：
 *   - 返回 { items, skipped }：items 为成功解析的卡片；skipped 为解析失败被跳过的卡片数；
 *   - 抛出 Error：请求失败（网络/超时/HTTP 非 2xx/响应异常/JSON success=false）或
 *     解析结果为空（0 张卡片），上层不应据此做任何清理，应允许下次重试。
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述官网 MyTQA 卡片解析结果）
// ---------------------------------------------------------------------------

/** 官网 MyTQA 卡片解析结果（与 officalQualityRating_hardcode.json 的历史字段完全同构） */
export interface MotacMyTqaRecordDto {
  /** 公司/营业场所名称（HTML 实体已解码，空白已折叠） */
  companyName: string;
  /** 公司地址 */
  companyAddress: string;
  /** 公司电话（卡片中可能缺省 → null） */
  companyPhone: string | null;
  /** 官方评级有效期（如 "22/06/26 - 21/06/29"） */
  duration: string;
  /** 官方品质等级（Platinum / Gold / Silver） */
  awardCategory: string;
}

/** 一次抓取的结果：成功卡片 + 因结构不完整被跳过的卡片数 */
export interface MotacMyTqaResult {
  items: MotacMyTqaRecordDto[];
  /** 解析失败被跳过的卡片数（>25% 时上层不应执行镜像清理） */
  skipped: number;
}

// ---------------------------------------------------------------------------
// 轻量 HTML 工具（不引入 cheerio，仅处理本项目所需的最小 HTML 子集；
// 与 MalaysiaTravelEventsApi 同款实现，保持各 API 文件自包含）
// ---------------------------------------------------------------------------

/** 常见命名实体表（官网 HTML 实际只出现 amp/lt/gt/quot/apos/nbsp 级别） */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

/** HTML 实体解码：命名实体 + 十进制/十六进制数字实体；未知实体原样保留 */
function decodeHtmlEntities(input: string): string {
  return input.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, name: string) => {
      const lower = name.toLowerCase();
      if (lower.startsWith("#x")) {
        const code = Number.parseInt(name.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (lower.startsWith("#")) {
        const code = Number.parseInt(name.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return NAMED_ENTITIES[lower] ?? match;
    }
  );
}

/** 文本清洗：实体解码 → 折叠空白（含 &nbsp; 的 \u00a0）→ 去首尾 */
function normalizeText(raw: string): string {
  return decodeHtmlEntities(raw).replace(/[\s\u00a0]+/g, " ").trim();
}

/** 品质等级规范化为项目内统一字符串（Platinum/Gold/Silver，大小写不敏感）；无法识别保留原文 */
function canonicalAwardCategory(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("platinum")) return "Platinum";
  if (lower.includes("gold")) return "Gold";
  if (lower.includes("silver")) return "Silver";
  return raw;
}

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class MotacMyTqaApi {
  /** MyTQA 列表页 URL（用作 Referer；页面本身不请求，分页数据全部走 admin-ajax） */
  private readonly listPageUrl =
    "https://www.motac.gov.my/en/kategori-semakan-new/malaysia-tourism-quality-assurancesmytqa/";

  /** WordPress admin-ajax 端点 */
  private readonly ajaxUrl =
    "https://www.motac.gov.my/wp-admin/admin-ajax.php";

  /** 官网 kategori 值（对应列表页 slug，页面内联脚本 data-kategori 确认） */
  private readonly kategori = "malaysia-tourism-quality-assurancesmytqa";

  /** 全量抓取时每页请求条数（实测官网认可放大；136 条全量约 2 次请求） */
  private readonly perPage = 100;

  /** 防御性页数上限：防止官网异常时无限翻页 */
  private readonly safeMaxPages = 50;

  /** 单次请求超时（毫秒）：官网响应通常 <1s（TTFB≈0.7s），超时按瞬时失败处理 */
  private readonly timeoutMs = 20_000;

  /** 瞬时失败（网络/超时/HTTP/解析为空）时最多尝试次数（含首次） */
  private readonly maxAttempts = 2;

  /** 相邻两次重试的间隔（毫秒） */
  private readonly retryDelayMs = 1_000;

  /** 相邻两页之间的礼貌延时（毫秒）：响应 no-store 实时数据，务必低频克制 */
  private readonly politeDelayMs = 500;

  /** 请求头：浏览器 UA + Referer（防止跨站校验拦截），urlencoded 表单体 */
  private readonly requestHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
    Referer: this.listPageUrl,
    Accept: "application/json, text/javascript, */*; q=0.01",
  };

  /**
   * 抓取 MyTQA 官方评级列表并解析为 DTO 列表。
   * - options.limit 未传 → 全量分页抓取（page 1..N，先抓全、全部成功才返回）；
   * - options.limit 传入（如 3）→ 单次请求 page=1&per_page=limit（快速测试模式）。
   * 请求失败或解析出 0 张卡片时抛出 Error。
   */
  async fetchAll(options?: {
    limit?: number;
  }): Promise<MotacMyTqaResult> {
    const limit = options?.limit;
    if (limit !== undefined) {
      // 快速测试模式：单次请求前 limit 条
      const page = await this.requestPage(1, limit);
      const parsed = this.parseCards(page.html);
      if (parsed.items.length === 0) {
        throw new Error(
          `MotacMyTqaApi: no items parsed (skipped=${parsed.skipped}); ` +
            "website markup may have changed — refusing to yield an empty result"
        );
      }
      return parsed;
    }

    // 全量模式：分页抓取，先抓全所有页再返回（中途任何失败整体上抛，上层不写库）
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.fetchAllPages();
      } catch (err) {
        lastError = err;
        if (attempt < this.maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        }
      }
    }
    throw new Error(
      `MotacMyTqaApi request failed after ${this.maxAttempts} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  /** 全量分页抓取：由首页 total 推导页数，逐页拉取直至取满或触顶 */
  private async fetchAllPages(): Promise<MotacMyTqaResult> {
    const items: MotacMyTqaRecordDto[] = [];
    let skipped = 0;
    // 首页解析出 total 与"实际每页条数"（官网可能把 per_page 钳制到更小值，
    // 以实际返回条数为准推导页数，避免漏页）
    const first = await this.requestPage(1, this.perPage);
    const firstParsed = this.parseCards(first.html);
    items.push(...firstParsed.items);
    skipped += firstParsed.skipped;

    if (items.length === 0) {
      throw new Error(
        `MotacMyTqaApi: no items parsed on page 1 (skipped=${firstParsed.skipped}); ` +
          "website markup may have changed — refusing to yield an empty result"
      );
    }

    // 由官网 total 与"实际每页条数"推导剩余页数；无法推导（total 异常）时退化为
    // 一直翻到不足一整页为止（safeMaxPages 兜底）
    const effectivePerPage =
      firstParsed.items.length > 0 ? firstParsed.items.length : this.perPage;
    const total = Number(first.total);
    const maxPages = Number.isFinite(total) && total > 0
      ? Math.max(1, Math.ceil(total / effectivePerPage))
      : this.safeMaxPages;

    for (let page = 2; page <= maxPages; page++) {
      if (page > this.safeMaxPages) break;
      await new Promise((resolve) => setTimeout(resolve, this.politeDelayMs));
      const resp = await this.requestPage(page, this.perPage);
      const parsed = this.parseCards(resp.html);
      // 防御：应在范围内的页返回 0 张 → 官网结构/分页异常，整体上抛（不产半截镜像）
      if (parsed.items.length === 0 && page < maxPages) {
        throw new Error(
          `MotacMyTqaApi: page ${page} returned no cards (expected more); ` +
            "pagination may have changed — aborting full crawl"
        );
      }
      items.push(...parsed.items);
      skipped += parsed.skipped;
      if (parsed.items.length < effectivePerPage) break;
    }

    return { items, skipped };
  }

  /** 单次 admin-ajax 请求（失败内部重试，返回首页/分页 JSON 关键字段） */
  private async requestPage(
    page: number,
    perPage: number
  ): Promise<{ html: string; total: number }> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.postPage(page, perPage);
      } catch (err) {
        lastError = err;
        if (attempt < this.maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        }
      }
    }
    throw new Error(
      `MotacMyTqaApi page ${page} failed after ${this.maxAttempts} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  /** 单次 POST admin-ajax（不重试；请求/响应/JSON/success 任一异常即抛） */
  private async postPage(
    page: number,
    perPage: number
  ): Promise<{ html: string; total: number }> {
    const body = new URLSearchParams({
      action: "motac_semakan_filter",
      kategori: this.kategori,
      search: "",
      negeri: "",
      klasifikasi: "",
      jenis: "",
      page: String(page),
      per_page: String(perPage),
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(this.ajaxUrl, {
        method: "POST",
        headers: {
          ...this.requestHeaders,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: body.toString(),
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(
        `network error: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      // 403 = 反爬挑战 / 429 = 限流 / 5xx = 官网故障：均为瞬时状态，抛出让上层保留数据
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    let data: { success?: unknown; data?: { html?: unknown; total?: unknown } };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      throw new Error("response is not valid JSON (bot challenge page?)");
    }
    if (data?.success !== true) {
      throw new Error(
        "admin-ajax returned success=false (endpoint may have changed)"
      );
    }
    if (typeof data?.data?.html !== "string" || data.data.html.trim() === "") {
      throw new Error("admin-ajax response has no non-empty data.html field");
    }
    return { html: data.data.html, total: Number(data.data.total) };
  }

  /** 解析一页 data.html 中的卡片：切分 .motac-card 并按选择器提取字段（见类注释） */
  private parseCards(html: string): MotacMyTqaResult {
    const items: MotacMyTqaRecordDto[] = [];
    let skipped = 0;

    const cardMark = '<div class="motac-card"';
    const starts: number[] = [];
    let cursor = html.indexOf(cardMark);
    while (cursor !== -1) {
      starts.push(cursor);
      cursor = html.indexOf(cardMark, cursor + 1);
    }

    for (let i = 0; i < starts.length; i++) {
      const slice = html.slice(
        starts[i],
        i + 1 < starts.length ? starts[i + 1] : html.length
      );

      const text = (pattern: RegExp): string => {
        const m = pattern.exec(slice);
        return m ? normalizeText(m[1]) : "";
      };

      const companyName = text(/<div class="company-name">([\s\S]*?)<\/div>/i);
      const companyAddress = text(/<div class="company-address">([\s\S]*?)<\/div>/i);
      // 电话列内含 svg 图标 → 先去掉所有标签再取文本（可能为空）
      const phoneMatch = /<div class="company-phone">([\s\S]*?)<\/div>/i.exec(slice);
      const companyPhoneRaw = phoneMatch
        ? normalizeText((phoneMatch[1] as string).replace(/<[^>]*>/g, " "))
        : "";
      const duration = text(/<div class="col col-tempoh">([\s\S]*?)<\/div>/i);
      const awardCategory = canonicalAwardCategory(
        text(/<div class="col col-bidang">([\s\S]*?)<\/div>/i)
      );

      // 完整性校验：四字段（电话可空）任一缺失 → 视为结构异常卡片，跳过并计数
      if (!companyName || !companyAddress || !duration || !awardCategory) {
        skipped += 1;
        continue;
      }

      items.push({
        companyName,
        companyAddress,
        companyPhone: companyPhoneRaw || null,
        duration,
        awardCategory,
      });
    }

    return { items, skipped };
  }
}

export const motacMyTqaApi = new MotacMyTqaApi();
