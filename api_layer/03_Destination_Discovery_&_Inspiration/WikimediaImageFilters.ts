/**
 * WikimediaImageFilters — 模块 03 Wikimedia 图片过滤工具（API Layer）
 *
 * 职责（单一）：
 *   - 提供"确保返回图片是地点/景点"的过滤词表与判定函数，供
 *     Wikipedia 条目配图（WikipediaImageApi）与 Wikimedia Commons
 *     Geosearch（WikimediaGeosearchApi）两个前端直连客户端复用。
 *
 * 过滤原理：
 *   - Wikimedia 开放 API 不提供"图片内容是否为地点/景点"的分类过滤参数，
 *     因此采用文件/条目标题启发式过滤：
 *       1. 黑名单：明显非地点图（logo、旗帜、地图、标志牌、菜单、
 *          票据、食物特写、示意图、截图、图标等）直接排除；
 *       2. 白名单优先：若提供地点名，优先选择标题包含地点名关键词
 *          的文件（如 "Petronas Twin Towers" → 标题含 "petronas"），
 *          无匹配时回退到第一个通过黑名单的文件。
 *   - 词表按小写匹配；仅用于排序/挑选，不影响请求成败（请求失败语义
 *     仍由各客户端按"瞬时失败抛错"处理）。
 */

/** 明显非地点/景点图片的文件/条目标题黑名单（小写子串匹配，按词边界） */
const NON_PLACE_TITLE_PATTERNS = [
  "logo",
  "flag",
  "coat of arms",
  "seal",
  "emblem",
  "map",
  "sign",
  "banner",
  "poster",
  "ticket",
  "menu",
  "food",
  "dish",
  "meal",
  "drink",
  "diagram",
  "chart",
  "graph",
  "qr code",
  "qrcode",
  "screenshot",
  "interface",
  "icon",
  "badge",
  "stamp",
  "receipt",
  "brochure",
  "cover",
  "textbook",
  "handbill",
  "flyer",
];

/** 编译后的黑名单正则（词边界匹配，避免误伤如 "Maple"、"Flagship"） */
const NON_PLACE_TITLE_REGEX = new RegExp(
  `(?:^|[^a-z0-9])(${NON_PLACE_TITLE_PATTERNS.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("|")})(?:[^a-z0-9]|$)`,
  "i"
);

/** 地点名拆词时的停用词（不参与关键词匹配） */
const STOP_WORDS = new Set([
  "the",
  "and",
  "of",
  "at",
  "in",
  "on",
  "for",
  "to",
  "with",
  "by",
  "a",
  "an",
  "&",
]);

/**
 * 判定文件/条目标题是否命中非地点图黑名单。
 * 标题应去除 "File:" / "Category:" 等命名空间前缀后传入（小写不敏感）。
 */
export function isNonPlaceImageTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return true; // 空标题无法确认是地点图，视为不合格
  return NON_PLACE_TITLE_REGEX.test(trimmed);
}

/**
 * 从 Wikimedia 缩略图 URL 提取原始文件名（用于黑名单过滤与 Commons 元数据查询）。
 * 示例：https://upload.wikimedia.org/wikipedia/commons/thumb/a/b/
 *       Petronas_Towers.jpg/800px-Petronas_Towers.jpg → Petronas_Towers.jpg
 * 含特殊字符的文件名在 URL 中为百分号编码（如 %2C 逗号、%27 撇号），
 * 提取时统一解码（decodeURIComponent），保证与 Commons 返回的规范化
 * 文件名一致（可作元数据查询键）。
 * 无法解析时返回 null（调用方按"无法确认"处理）。
 */
export function extractFileNameFromThumbUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return null;
    // 去掉 MediaWiki 缩略图尺寸前缀（如 800px- / 120px-）
    const fileName = last.replace(/^\d+px-/, "");
    if (!fileName) return null;
    try {
      return decodeURIComponent(fileName);
    } catch {
      return fileName; // 非法百分号编码：按原样返回（防御）
    }
  } catch {
    return null;
  }
}

/**
 * 从地点名提取参与标题匹配的关键词（过滤停用词、去标点、取长度≥3 的词）。
 * 示例："Petronas Twin Towers" → ["petronas", "twin", "towers"]；
 * 空名/无有效词返回空数组（调用方回退到黑名单过滤后的第一个结果）。
 */
export function placeNameKeywords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s&]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

/**
 * 判定文件标题是否包含地点名关键词（任一关键词命中即 true）。
 * 地点名无有效关键词时返回 true（不提供偏好，交给调用方回退逻辑）。
 */
export function titleContainsPlaceName(
  title: string,
  placeName: string
): boolean {
  const keywords = placeNameKeywords(placeName);
  if (keywords.length === 0) return true;
  const normalizedTitle = title.toLowerCase();
  return keywords.some((keyword) => normalizedTitle.includes(keyword));
}
