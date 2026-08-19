# WikipediaImageApi.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/WikipediaImageApi.ts`
> - 对接的外部服务：Wikipedia API（各语言 wikipedia.org，MediaWiki API；第二阶段经 Wikimedia Commons API 取作者/许可）

## 责任

本文件是模块 03 的 Wikipedia 图片查询外部 API 客户端，职责单一：仅负责与 Wikipedia API（各语言 `wikipedia.org`）交流，按地点语义查询一张带作者/许可信息的图片；不包含业务规则、不触碰本地持久化、不编排跨模块流程。用于为地点（POI）取一张可合法署名的配图。

查询链（由 `findImage` 编排，两阶段）：
1. **收集候选条目首图**（条目配图路径 → 条目搜索路径，命中即停）：
   - 条目配图（`articleImageCandidate`）：调用方提供的 Wikipedia 条目名（如 "en:Malaysia Heritage Studios"），走 `prop=pageimages`；条目是否在马来西亚由调用方保证（统一链路不传该参数）；
   - 条目搜索（`searchArticleCandidates`）：按 `"地点名 Malaysia"` 在英文 Wikipedia 搜索条目（`generator=search`，强制含 Malaysia），`gsrnamespace=0` 普通条目命名空间、`gsrlimit=5`；
2. **批量查询 Commons 文件元数据**（经 `WikimediaFileMetaApi.fetchCommonsFileMeta` 换取缩略图 URL + extmetadata 作者/许可）→ 返回第一个可提供完整署名信息的图片。

关键过滤器（本客户端内强制）：
- **马来西亚范围强制**：条目搜索关键词不含 "Malaysia"（大小写不敏感）时自动追加（如 "Batu Caves" → "Batu Caves Malaysia"）；
- **地点/景点图片**：条目首图文件名过黑名单（`isNonPlaceImageTitle`，排除 logo/flag/map 等）；
- **开源协议保证**：仅接受来自 Wikimedia Commons 的图片（`/commons/` 路径判定；各语言 Wiki 本地文件如 fair use 图片无开源许可、无法提供作者/许可声明 → 跳过），并经 extmetadata 返回作者与许可信息供展示署名。

关键设计：免费 API（无需 key）；MediaWiki API 支持 `origin=*`，浏览器端直连（前端实现原则）；返回 `upload.wikimedia.org` 缩略图 URL 可直接热链供 `<img>` 使用；匿名配额约 500 请求/5 分钟（浏览器共享出口 IP），上层已有多层缓存保护。

返回语义（供上层决定是否缓存）：返回 `WikimediaFileMeta` = 查询到图；返回 `null` = 所有子查询均请求成功但确定无图（可安全缓存为无图）；抛出 `Error` = 至少一个子查询瞬时失败（网络错误 / HTTP 非 2xx / 响应异常），上层不得缓存"无图"结论，应允许下次重试。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./WikimediaImageFilters` | 从缩略图 URL 提取文件名（`extractFileNameFromThumbUrl`）、文件名黑名单过滤（`isNonPlaceImageTitle`） |
| `./WikimediaFileMetaApi` | 第二阶段批量查询 Commons 作者/许可元数据（`wikimediaFileMetaApi`、类型 `WikimediaFileMeta`） |

| 外部库 | 用途 |
| --- | --- |
| 无 | 仅使用内置 `fetch`、`URL` |

## 导出与函数明细

### `MediaWikiPageDto` / `MediaWikiQueryResponse`
- 类型：类型（interface，非导出）
- 传入：无
- 传出：MediaWiki 响应结构
- 用处：`MediaWikiPageDto` 声明页面字段 `title`、`index`（搜索结果序号，按相关性升序，用于保持候选优先级）、`thumbnail.source`（prop=pageimages 缩略图）；`MediaWikiQueryResponse` 声明 `query.pages`（键为 page id）与 `error` 字段。

### `WikipediaImageApi`
- 类型：类
- 传入：无
- 传出：客户端实例
- 用处：Wikipedia 图片客户端。持有字段：`wikipediaBaseUrl = "https://{lang}.wikipedia.org/w/api.php"`（`{lang}` 为语言代码，如 en/ms）、`fileMetaClient = wikimediaFileMetaApi`（Commons 元数据客户端）。

#### `findImage(params: { wikipediaEntry?: string | null; placeName: string })`
- 类型：方法（async）
- 传入：`params.wikipediaEntry`——精确 Wikipedia 条目名（如 "en:Malaysia Heritage Studios"；可选，须由调用方保证在马来西亚）；`params.placeName`——地点名称（条目搜索兜底用）
- 传出：`Promise<WikimediaFileMeta | null>`——带作者/许可信息的图片元数据；确定无图返回 `null`；至少一个子查询瞬时失败且最终无图时抛出
- 用处：地点图片查询主入口（条目配图 → 条目搜索，两阶段取图），命中即返回。实现：先尝试 `articleImageCandidate`（若传了 `wikipediaEntry`），再尝试 `searchArticleCandidates`（均捕获瞬时失败置 `anyFailure` 标记后继续）；候选为空时——有失败则抛错、否则返回 `null`；随后批量查询 Commons 元数据，按候选顺序返回第一个有 `WikimediaFileMeta` 的。注意：统一图片链路（BL 层 `DiscoveryService.getPlaceImage`）只传 `placeName`，走"地点名 Malaysia"搜索路径（强制马来西亚范围）；`wikipediaEntry` 路径保留供精确条目查询使用。

#### `articleImageCandidate(wikipediaEntry: string)`（私有）
- 类型：方法（async，私有）
- 传入：`wikipediaEntry`——Wikipedia 条目名（如 "en:Malaysia Heritage Studios"）
- 传出：`Promise<{ fileName: string; thumbUrl: string } | null>`——首图候选；成功但无可用首图返回 `null`
- 用处：按条目名取条目首图候选（`prop=pageimages`、`piprop=thumbnail`、`pithumbsize=800`、`origin=*`）。条目名格式为 "语言前缀:条目名"，无语言前缀默认英文维基，非语言前缀（如命名空间）也按英文处理（见 `parseWikipediaEntry`）。注意：不校验条目是否位于马来西亚，调用方须自行保证。

#### `searchArticleCandidates(placeName: string)`（私有）
- 类型：方法（async，私有）
- 传入：`placeName`——地点名称
- 传出：`Promise<Array<{ fileName: string; thumbUrl: string }>>`——候选首图数组（最多 5 条）
- 用处：在英文维基搜索条目并收集候选首图。马来西亚范围强制：关键词不含 "Malaysia" 时自动追加。请求参数：`generator=search`、`gsrsearch`、`gsrnamespace=0`（普通条目命名空间）、`gsrlimit=5`、`prop=pageimages`、`piprop=thumbnail`、`pithumbsize=800`、`origin=*`。解析：按 `index` 升序排序（保持搜索相关性顺序），逐页过 `pickCandidate` 过滤。

#### `pickCandidate(page: MediaWikiPageDto)`（私有）
- 类型：方法（同步，私有）
- 传入：`page`——单个条目页
- 传出：`{ fileName: string; thumbUrl: string } | null`——通过过滤的首图候选；不过滤返回 `null`
- 用处：单个条目页 → 首图候选的过滤闸口：首图 URL 必须为 `http(s)://` 开头；必须来自 Commons（`isCommonsUrl`，`/commons/` 路径，开源协议保证）；文件名过黑名单（`isNonPlaceImageTitle`）。

#### `isCommonsUrl(url: string)`（私有）
- 类型：方法（同步，私有）
- 传入：`url`——图片 URL
- 传出：`boolean`
- 用处：判定图片 URL 是否来自 Wikimedia Commons（本地文件路径不含 `/commons/`）。URL 解析失败返回 `false`。

#### `parseWikipediaEntry(entry: string)`（私有）
- 类型：方法（同步，私有）
- 传入：`entry`——条目名字符串
- 传出：`{ lang: string; title: string }`
- 用处：解析条目名（"en:Malaysia Heritage Studios" → `{ lang: "en", title: "Malaysia Heritage Studios" }`）。仅当冒号前是语言代码（en/ms/zh/en-gb 等，正则 `^[a-z]{2,3}(-[a-z]{2,3})?$`）时按语言处理，否则（命名空间等）按英文条目名处理。

#### `requestPages(url: string)`（私有）
- 类型：方法（async，私有）
- 传入：`url`——完整 MediaWiki API 请求 URL
- 传出：`Promise<Record<string, MediaWikiPageDto>>`——pages 映射
- 用处：发起请求并解析 `query.pages`。网络错误抛错；HTTP 非 2xx（429 限流 / 4xx / 5xx 均视为瞬时失败）抛错；JSON 解析失败抛错；响应含 `error` 字段抛 API error。

### `wikipediaImageApi`
- 类型：常量
- 传入：无
- 传出：`WikipediaImageApi` 单例实例
- 用处：模块导出的共享单例，供上层（BL 层）直接引入使用。
