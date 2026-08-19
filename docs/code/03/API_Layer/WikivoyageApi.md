# WikivoyageApi.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/WikivoyageApi.ts`
> - 对接的外部服务：Wikivoyage（en.wikivoyage.org）MediaWiki API

## 责任

本文件是模块 03 的 Wikivoyage 外部 API 客户端，为**灵感集锦**（Inspirations）功能服务，职责单一：仅负责与 Wikivoyage（`en.wikivoyage.org`）MediaWiki API 交流，提供四类能力：
1. **马来西亚目的地分类树遍历**（`listCategoryMembers` / `getCategoryPages`）——主题自动发现；
2. **文章批量查询**（`getPagesByTitles`）——导语/图片/坐标/Star 徽章；
3. **附近目的地搜索**（`searchNearbyDestinations`）——geosearch 按坐标找周边目的地。

关键设计：
- **免费直连**：Wikivoyage 公开 API 完全免费、无需 API key；MediaWiki API 支持 `origin=*`，浏览器端直连（前端实现原则）；返回 `upload.wikimedia.org` 缩略图 URL 可直接热链供 `<img>` 使用；
- **请求合并与最小化**：匿名请求有限流 → 上层（BL）负责缓存与失败重试，本客户端保持请求合并（批量 titles）与最小化；单请求 `titles ≤ 50`（MediaWiki 限制）在本客户端内部分块（`MAX_TITLES_PER_REQUEST = 50`）；
- **马来西亚范围强制（本客户端内）**：`searchNearbyDestinations` 入口坐标须位于马来西亚 bbox 内（`isInMalaysiaBounds`），否则不请求直接返回空数组；geosearch 结果逐条按坐标校验（圆形搜索在边境附近可能越界，如柔佛南部可触及新加坡）；附近搜索半径钳制到 [100, 50000] 米；
- **429 限流自动重试**：Wikivoyage 对匿名请求有突发限制，本客户端在 HTTP 429 时按退避（`[1000, 2000]` ms）自动重试至多 2 次（`RATE_LIMIT_MAX_RETRIES`），其余 4xx/5xx 不重试直接抛出。

返回语义（供上层决定是否缓存）：空数组 = 请求成功但无结果（确定无结果，可安全视为"无数据"）；抛出 `Error` = 请求失败（网络错误 / HTTP 非 2xx / API error / 解析失败），属瞬时状态，上层不得缓存失败结论，应允许下次重试。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./MalaysiaBounds` | 附近目的地搜索的马来西亚 bbox 判定（`isInMalaysiaBounds`），入口坐标与结果逐条校验 |

| 外部库 | 用途 |
| --- | --- |
| 无 | 仅使用内置 `fetch`、`URL` |

## 导出与函数明细

### 模块常量（非导出）
- `WIKIVOYAGE_API_BASE = "https://en.wikivoyage.org/w/api.php"`——Wikivoyage MediaWiki API 端点；
- `MAX_TITLES_PER_REQUEST = 50`——单请求 titles 上限（MediaWiki 限制）；
- `MIN_NEARBY_RADIUS_METERS = 100` / `MAX_NEARBY_RADIUS_METERS = 50000`——附近目的地搜索半径钳制范围（米）；
- `RATE_LIMIT_MAX_RETRIES = 2`——HTTP 429 匿名限流自动重试次数；
- `RATE_LIMIT_BACKOFF_MS = [1000, 2000]`——各次重试前的退避等待（ms，按重试序号取用）。

### `MediaWikiImageDto`
- 类型：类型（interface，非导出）
- 传出：缩略图条目
- 用处：仅声明 `source`/`width`/`height` 字段。

### `WikivoyagePageDto`
- 类型：类型（interface，导出）
- 传入：无
- 传出：文章页面精简形态
- 用处：声明字段：`pageid?`、`title`、`missing?`（批量 titles 查询中缺失的文章）、`extract?`（TextExtracts 导语，`exintro + explaintext + exsentences=2`）、`thumbnail?`（PageImages）、`pageprops?`（含 `wikibase-badge-Q17559452` = Wikivoyage Star 条目徽章）、`coordinates?`（GeoData 页面坐标，目的地文章通常存在）。

### `GeosearchEntryDto`
- 类型：类型（interface，非导出）
- 传出：`list=geosearch` 结果条目
- 用处：声明 `pageid?`、`ns?`、`title?`、`lat?`、`lon?`、`dist?`（距搜索点距离，米）。

### `WikivoyageNearbyDto`
- 类型：类型（interface，导出）
- 传入：无
- 传出：附近目的地形态
- 用处：geosearch 距离 + 图片/徽章合并后的形态：`title`、`distanceMeters`（距中心点距离，米）、`thumbnail?`、`pageprops?`。

### `MediaWikiQueryResponse`
- 类型：类型（interface，非导出）
- 传出：query 响应结构
- 用处：声明 `query.pages`、`query.categorymembers`、`query.geosearch` 与 `error` 字段。

### `wikivoyageArticleUrl(title: string)`
- 类型：函数
- 传入：`title`——Wikivoyage 文章标题
- 传出：`string`——文章外部链接 URL
- 用处：构造文章外链 `https://en.wikivoyage.org/wiki/{title}`；标题空格转下划线（MediaWiki 约定）、URL 段编码。

### `WikivoyageApi`
- 类型：类
- 传入：无
- 传出：客户端实例
- 用处：Wikivoyage 客户端。

#### `listCategoryMembers(categoryTitle, types, limit = 500)`
- 类型：方法（async）
- 传入：`categoryTitle`——分类标题（如 "Category:Malaysia"）；`types: "page" | "subcat" | "subcat|page"`——成员类型；`limit`——上限，默认 500
- 传出：`Promise<string[]>`——成员完整标题数组（子分类带 "Category:" 前缀，文章不带）
- 用处：分类成员标题列表（主题池构建用）。请求参数：`list=categorymembers`、`cmtitle`、`cmtype`、`cmlimit`、`format=json`、`origin=*`。解析 `query.categorymembers[].title`，过滤空值。请求失败抛出 `Error`。

#### `getPagesByTitles(titles: string[], thumbWidth = 480)`
- 类型：方法（async）
- 传入：`titles`——文章标题数组；`thumbWidth`——缩略图宽度，默认 480
- 传出：`Promise<WikivoyagePageDto[]>`——文章详情数组
- 用处：批量取文章详情（导语/缩略图/页面属性/坐标）。titles 去空、去重；内部按 50 标题/请求分块（`MAX_TITLES_PER_REQUEST`）；每块请求 `action=query` + `titles`（`|` 连接）+ `setPageQueryParams` 公共参数；`missing` 页过滤。请求失败抛出 `Error`。

#### `getCategoryPages(categoryTitle: string, limit = 100, thumbWidth = 480)`
- 类型：方法（async）
- 传入：`categoryTitle`——分类标题；`limit`——成员上限，默认 100；`thumbWidth`——缩略图宽度，默认 480
- 传出：`Promise<WikivoyagePageDto[]>`——文章详情数组
- 用处：分类成员聚合详情：`generator=categorymembers`（1 个请求拿成员 + 导语 + 图 + 坐标 + Star 徽章）。参数：`gcmtitle`、`gcmtype=page`、`gcmlimit` + `setPageQueryParams`。`missing` 页过滤。请求失败抛出 `Error`。

#### `searchNearbyDestinations(lat, lon, radiusMeters = 10000)`
- 类型：方法（async）
- 传入：`lat`/`lon`——中心点坐标；`radiusMeters`——搜索半径（米），默认 10000，钳制到 [100, 50000]
- 传出：`Promise<WikivoyageNearbyDto[]>`——附近目的地数组
- 用处：附近目的地搜索（两段式）：
  1. `list=geosearch`（`gscoord={lat}|{lon}`、`gsradius`、`gslimit=10`、`gsnamespace=0` 仅主命名空间，按距离排序、自带坐标与距离——generator 模式无 dist 字段，故用 list 模式）；
  2. 逐条马来西亚 bbox 校验（标题/距离/坐标齐全且坐标在 bbox 内，圆形搜索边境越界兜底）；
  3. 批量 `getPagesByTitles` 合并缩略图/Star 徽章，映射为 `WikivoyageNearbyDto`。
  入口坐标不在马来西亚 bbox 内 → 不请求，返回空数组。请求失败抛出 `Error`。

#### `setPageQueryParams(url: URL, thumbWidth: number)`（私有）
- 类型：方法（同步，私有）
- 传入：`url`——待设置的 URL 对象；`thumbWidth`——缩略图宽度
- 传出：无（就地修改 url）
- 用处：设置文章详情查询的公共参数：`prop=extracts|pageimages|pageprops|coordinates`、`exintro=1`、`explaintext=1`、`exsentences=2`、`piprop=thumbnail`、`pithumbsize`、`redirects=1`（重定向跟随）、`format=json`、`origin=*`。

#### `requestJson(url: string)`（私有）
- 类型：方法（async，私有）
- 传入：`url`——完整请求 URL
- 传出：`Promise<MediaWikiQueryResponse>`——解析后的响应
- 用处：发起请求并解析 JSON。网络错误抛错；HTTP 429（匿名限流）按 `RATE_LIMIT_BACKOFF_MS` 退避重试至多 `RATE_LIMIT_MAX_RETRIES` 次（其余 HTTP 非 2xx 不重试直接抛出）；JSON 解析失败抛错；响应含 `error` 字段抛 API error。保持"失败不缓存、下次重试"的上层语义。

### `wikivoyageApi`
- 类型：常量
- 传入：无
- 传出：`WikivoyageApi` 单例实例
- 用处：模块导出的共享单例，供上层（BL 层 InspirationsService 等）直接引入使用。
