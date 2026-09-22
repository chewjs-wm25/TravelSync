/**
 * MalaysiaTravelEventsApi — 模块 03 malaysia.travel 官方节日/活动爬虫客户端（API Layer, 服务端）
 *
 * 职责（单一）：
 *   - 仅负责与马来西亚旅游局官网（www.malaysia.travel）交流，抓取"当前/未来活动"列表
 *     并解析为纯数据 DTO；
 *   - 不包含业务规则、不触碰本地持久化、不编排跨模块流程（编排在 Business Logic Layer
 *     的 EventWebSyncService 内）。
 *
 * 数据来源与请求策略（2026-09 实测抓包/验证）：
 *   - 端点：GET https://www.malaysia.travel/events
 *   - 官网以 X-Requested-With: XMLHttpRequest 区分"整页渲染"与"数据请求"：
 *     携带该头 + 浏览器 User-Agent 时返回 JSON：{ listing: "<html>", currentYear, currentMonth, url }，
 *     listing 内是活动卡片的预渲染 HTML（当前列表无需 keyword，默认返回全部当前/未来活动）。
 *   - 响应体是"JSON 包着 HTML"的两段式结构，因此解析分两步：
 *     ① JSON.parse 取 listing 字符串；② 用轻量字符串/正则解析（见下）。
 *
 * 解析选择器（对官网结构敏感，改版后需按新结构微调；宁可抛错也绝不误删上层数据）：
 *   - 卡片容器：<div class="card card_design_2 ...">
 *   - 标题：h3.event_title
 *   - 日期/地点：p.event_date 内第二个 <span> 的文本（第 1 段 = 日期区间，最后 1 段 = 地点）
 *   - 分类：class 含 category 令牌的 <span> 徽章文本（如 "Arts & Culture"、"VM Signature Events"）
 *   - 详情 URL：<a class="stretched-link" href="...">
 *
 * 项目约束（见 AGENTS.md）：
 *   - 不新增依赖库（禁用 axios/cheerio）→ 使用内置 fetch + 手写正则解析与 HTML 实体解码；
 *   - 旅游范围仅限马来西亚 → 目标站本身即马来西亚官方站。
 *
 * 返回语义（供上层决定是否落库/清理）：
 *   - 返回 { events, skipped }：events 为成功解析的卡片；skipped 为解析失败被跳过的卡片数。
 *     调用方约定：仅当 skipped === 0 时允许执行"镜像清理"，防止把结构临时解析失败的
 *     活动误删；
 *   - 抛出 Error：请求失败（网络/超时/HTTP 非 2xx/响应异常）或解析结果为空（0 张卡片），
 *     上层不应据此做任何清理，应允许下次重试。
 */

// ---------------------------------------------------------------------------
// DTO 类型（外部数据形态，仅描述官网活动卡片解析结果）
// ---------------------------------------------------------------------------

/** 官网活动卡片解析结果（与 parsed_events.json 的历史字段完全同构） */
export interface MalaysiaTravelEventDto {
  /** 活动名称（HTML 实体已解码，空白已折叠） */
  title: string;
  /** 活动举办日期区间（如 "19 Jun 2026 - 25 Apr 2027"） */
  date: string;
  /** 活动举办地点 */
  location: string;
  /** 活动分类徽章文本（如 ["Arts & Culture"]） */
  categories: string[];
  /** 活动官方页面 URL */
  url: string;
}

/** 一次抓取的结果：成功卡片 + 因结构不完整被跳过的卡片数 */
export interface MalaysiaTravelEventsResult {
  events: MalaysiaTravelEventDto[];
  /** 解析失败被跳过的卡片数（>0 时上层不应执行镜像清理） */
  skipped: number;
}

// ---------------------------------------------------------------------------
// 轻量 HTML 工具（不引入 cheerio，仅处理本项目所需的最小 HTML 子集）
// ---------------------------------------------------------------------------

/** 常见命名实体表（官网 listing 实际只出现 amp/lt/gt/quot/apos/nbsp 级别） */
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

// ---------------------------------------------------------------------------
// 客户端
// ---------------------------------------------------------------------------

export class MalaysiaTravelEventsApi {
  /** 官网活动页（XHR 数据请求返回 JSON listing，无需 keyword 即为全量当前/未来活动） */
  private readonly listUrl = "https://www.malaysia.travel/events";

  /** 官网要求浏览器 UA + XHR 标记才返回 JSON（实测缺失时行为不同） */
  private readonly requestHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json, text/javascript, */*; q=0.01",
  };

  /** 单次请求超时（毫秒）：官网响应通常 <100ms，超时按瞬时失败处理并允许重试 */
  private readonly timeoutMs = 20_000;

  /** 瞬时失败（网络/超时/HTTP/解析为空）时最多尝试次数（含首次） */
  private readonly maxAttempts = 2;

  /** 相邻两次尝试的间隔（毫秒） */
  private readonly retryDelayMs = 1_000;

  /**
   * 抓取官网当前/未来活动列表并解析为 DTO 列表。
   * 返回 { events, skipped }；请求失败或解析出 0 张卡片时抛出 Error。
   */
  async fetchCurrentEvents(): Promise<MalaysiaTravelEventsResult> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const html = await this.fetchListingHtml();
        const parsed = this.parseListing(html);
        if (parsed.events.length === 0) {
          throw new Error(
            `MalaysiaTravelEventsApi: no events parsed (skipped=${parsed.skipped}); ` +
              "website markup may have changed — refusing to yield an empty result"
          );
        }
        return parsed;
      } catch (err) {
        lastError = err;
        if (attempt < this.maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        }
      }
    }
    throw new Error(
      `MalaysiaTravelEventsApi request failed after ${this.maxAttempts} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  /** ① 请求 JSON 并取出 listing（预渲染卡片 HTML）；失败抛 Error（可由上层重试） */
  private async fetchListingHtml(): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(this.listUrl, {
        headers: this.requestHeaders,
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

    let data: { listing?: unknown };
    try {
      data = (await res.json()) as { listing?: unknown };
    } catch {
      throw new Error("response is not valid JSON (bot challenge page?)");
    }
    if (typeof data?.listing !== "string" || data.listing.trim() === "") {
      throw new Error("response JSON has no non-empty 'listing' field");
    }
    return data.listing;
  }

  /** ② 解析卡片 HTML：切分 card_design_2 卡片并按选择器提取字段（见类注释） */
  private parseListing(listing: string): MalaysiaTravelEventsResult {
    const events: MalaysiaTravelEventDto[] = [];
    let skipped = 0;

    // 卡片容器切分：以 class="card card_design_2 出现位置为边界切片
    const cardMark = '<div class="card card_design_2';
    const starts: number[] = [];
    let cursor = listing.indexOf(cardMark);
    while (cursor !== -1) {
      starts.push(cursor);
      cursor = listing.indexOf(cardMark, cursor + 1);
    }

    for (let i = 0; i < starts.length; i++) {
      const slice = listing.slice(
        starts[i],
        i + 1 < starts.length ? starts[i + 1] : listing.length
      );

      // 标题：h3.event_title 内文本
      const titleMatch = /<h3 class="event_title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i.exec(
        slice
      );
      const title = titleMatch ? normalizeText(titleMatch[1]) : "";

      // 日期/地点：每个 p.event_date 取第二个 <span> 文本；第 1 段为日期区间，最后 1 段为地点
      const dateTexts: string[] = [];
      const dateRe =
        /<p class="event_date[^"]*"[^>]*>[\s\S]*?<i[^>]*><\/i>\s*<\/span>\s*<span>([\s\S]*?)<\/span>\s*<\/p>/gi;
      let dateMatch: RegExpExecArray | null;
      while ((dateMatch = dateRe.exec(slice)) !== null) {
        const text = normalizeText(dateMatch[1]);
        if (text) dateTexts.push(text);
      }

      // 详情 URL：a.stretched-link 的 href
      const urlMatch = /<a class="stretched-link" href="([^"]+)"/i.exec(slice);
      const url = urlMatch ? urlMatch[1].trim() : "";

      // 分类徽章：class 中含 category 令牌的 span（排除 toggle-more 等无 category 令牌元素）
      const categories: string[] = [];
      const badgeRe =
        /<span class="([^"]*\bcategory\b[^"]*)"[^>]*>([\s\S]*?)<\/span>/gi;
      let badgeMatch: RegExpExecArray | null;
      while ((badgeMatch = badgeRe.exec(slice)) !== null) {
        const text = normalizeText(badgeMatch[2]);
        if (text && !categories.includes(text)) categories.push(text);
      }

      // 完整性校验：title/url 与至少一段日期缺失 → 视为结构异常卡片，跳过并计数
      if (!title || !url || dateTexts.length === 0) {
        skipped += 1;
        continue;
      }

      events.push({
        title,
        date: dateTexts[0],
        location: dateTexts.length > 1 ? dateTexts[dateTexts.length - 1] : "",
        categories,
        url,
      });
    }

    return { events, skipped };
  }
}

export const malaysiaTravelEventsApi = new MalaysiaTravelEventsApi();
