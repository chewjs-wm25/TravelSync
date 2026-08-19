# WikimediaImageFilters.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/WikimediaImageFilters.ts`
> - 对接的外部服务：无（纯本地过滤工具，不发起任何网络请求）

## 责任

本文件是模块 03 的 Wikimedia 图片过滤工具，职责单一：提供"确保返回图片是地点/景点"的过滤词表与判定函数，供 **Wikipedia 条目配图（`WikipediaImageApi`）** 与 **Wikimedia Commons Geosearch（`WikimediaGeosearchApi`）** 两个前端直连客户端复用（`WikivoyageImageApi` 亦复用）。

过滤原理：Wikimedia 开放 API 不提供"图片内容是否为地点/景点"的分类过滤参数，因此采用文件/条目标题启发式过滤：
1. **黑名单**：明显非地点图（logo、旗帜、地图、标志牌、菜单、票据、食物特写、示意图、截图、图标等）直接排除；
2. **白名单优先**：若提供地点名，优先选择标题包含地点名关键词的文件（如 "Petronas Twin Towers" → 标题含 "petronas"），无匹配时回退到第一个通过黑名单的文件。

关键设计：
- 词表按小写匹配；黑名单正则按**词边界**匹配（`(?:^|[^a-z0-9])...([^a-z0-9]|$)`），避免误伤如 "Maple"、"Flagship"；
- 地点名拆词时过滤停用词（the/and/of/at/in/on/for/to/with/by/a/an/&）；
- 从缩略图 URL 提取文件名时统一 `decodeURIComponent` 解码（含特殊字符的文件名在 URL 中为百分号编码，如 `%2C` 逗号、`%27` 撇号），保证与 Commons 返回的规范化文件名一致（可作元数据查询键）；
- 仅用于排序/挑选，**不影响请求成败**（请求失败语义仍由各客户端按"瞬时失败抛错"处理）。

## 依赖

无模块 03 内部文件依赖，也不依赖任何外部库（纯 TypeScript 实现）。

## 导出与函数明细

### `NON_PLACE_TITLE_PATTERNS`（非导出常量）
- 类型：常量（非导出）
- 传出：`string[]`——黑名单词表
- 用处：明显非地点/景点图片的文件/条目标题黑名单（小写子串匹配，按词边界）：logo、flag、coat of arms、seal、emblem、map、sign、banner、poster、ticket、menu、food、dish、meal、drink、diagram、chart、graph、qr code、qrcode、screenshot、interface、icon、badge、stamp、receipt、brochure、cover、textbook、handbill、flyer。

### `NON_PLACE_TITLE_REGEX`（非导出常量）
- 类型：常量（非导出）
- 传出：`RegExp`——编译后的黑名单正则
- 用处：由词表编译的正则，词边界匹配（`(?:^|[^a-z0-9])(词1|词2|...)(?:[^a-z0-9]|$)`，`i` 忽略大小写），词表中的正则特殊字符已转义。避免误伤如 "Maple"、"Flagship"。

### `STOP_WORDS`（非导出常量）
- 类型：常量（非导出）
- 传出：`Set<string>`——地点名拆词停用词
- 用处：不参与关键词匹配的停用词：the、and、of、at、in、on、for、to、with、by、a、an、&。

### `isNonPlaceImageTitle(title: string)`
- 类型：函数
- 传入：`title`——文件/条目标题（应去除 "File:" / "Category:" 等命名空间前缀后传入）
- 传出：`boolean`——`true` = 命中非地点图黑名单
- 用处：判定文件/条目标题是否命中非地点图黑名单（小写不敏感）。空标题视为不合格返回 `true`（无法确认是地点图）；否则用 `NON_PLACE_TITLE_REGEX` 测试。

### `extractFileNameFromThumbUrl(url: string)`
- 类型：函数
- 传入：`url`——Wikimedia 缩略图 URL（upload.wikimedia.org）
- 传出：`string | null`——原始文件名；无法解析返回 `null`
- 用处：从缩略图 URL 提取原始文件名（用于黑名单过滤与 Commons 元数据查询）。示例：`https://upload.wikimedia.org/wikipedia/commons/thumb/a/b/Petronas_Towers.jpg/800px-Petronas_Towers.jpg` → `Petronas_Towers.jpg`。实现：解析 URL 取路径最后一段，去掉 MediaWiki 缩略图尺寸前缀（`^\d+px-`），`decodeURIComponent` 解码（非法百分号编码按原样返回，防御）；URL 解析失败返回 `null`（调用方按"无法确认"处理）。

### `placeNameKeywords(name: string)`
- 类型：函数
- 传入：`name`——地点名称（如 "Petronas Twin Towers"）
- 传出：`string[]`——参与标题匹配的关键词数组
- 用处：从地点名提取关键词：小写化、非字母/数字/空格/& 的字符替换为空格（Unicode 属性 `\p{L}\p{N}`）、按空白拆词、过滤停用词且只保留长度 ≥ 3 的词。示例："Petronas Twin Towers" → `["petronas", "twin", "towers"]`。空名/无有效词返回空数组（调用方回退到黑名单过滤后的第一个结果）。

### `titleContainsPlaceName(title: string, placeName: string)`
- 类型：函数
- 传入：`title`——文件/条目标题；`placeName`——地点名称
- 传出：`boolean`——标题是否包含地点名关键词
- 用处：判定文件标题是否包含地点名关键词（任一关键词命中即 `true`）。地点名无有效关键词时返回 `true`（不提供偏好，交给调用方回退逻辑）。标题先小写化再做子串包含判断。
