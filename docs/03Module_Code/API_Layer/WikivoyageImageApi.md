# WikivoyageImageApi.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/WikivoyageImageApi.ts`
> - 对接的外部服务：Wikivoyage MediaWiki API（en.wikivoyage.org；第二阶段经 Wikimedia Commons API 取作者/许可）

## 责任

本文件是模块 03 的 Wikivoyage 图片查询外部 API 客户端，职责单一：仅负责与 Wikivoyage MediaWiki API（`en.wikivoyage.org`）交流，按地点名查询旅行指南条目的配图（条目首图 `prop=pageimages`）；命中条目后经 `WikimediaFileMetaApi` 换取图片缩略图 URL 与作者/许可信息（extmetadata，开源协议署名要求）；不包含业务规则、不触碰本地持久化、不编排跨模块流程。

查询链（由 `findImage` 编排）：
1. **标题搜索**：`intitle:{地点名} Malaysia` → 精确命中条目标题含地点名者；
2. **全文搜索兜底**：`{地点名} Malaysia` → 条目标题仍须含地点名关键词（防止全文命中不相关条目——如 "Batu Caves" 全文搜索首条可能是 "Bintulu"）；
3. 命中候选首图 → 批量查询 Commons extmetadata（作者/许可）→ 返回第一个可提供完整署名信息的图片。

关键过滤器（本客户端内强制，见 `WikimediaImageFilters` / `WikimediaFileMetaApi`）：
- **马来西亚范围限制**：搜索关键词强制包含 "Malaysia"（如 "intitle:George Town Malaysia" / "Batu Caves Malaysia"）；
- **地点/景点图片**：条目标题必须包含地点名关键词（`titleContainsPlaceName`），条目首图文件名过黑名单（`isNonPlaceImageTitle`，排除 logo/map 等）；
- **开源协议保证**：仅接受来自 Wikimedia Commons 的图片（`/commons/` 路径判定；本地文件无 extmetadata，无法提供作者/许可声明 → 跳过），并返回作者与许可信息。

关键设计：免费 API（无需 key）；MediaWiki API 支持 `origin=*`，浏览器端直连（前端实现原则）；返回 `upload.wikimedia.org` 缩略图 URL 可直接热链供 `<img>` 使用；匿名配额约 500 请求/5 分钟（浏览器共享出口 IP），上层已有调用控制。

返回语义（供上层决定是否缓存）：返回 `WikimediaFileMeta` = 查询到图；返回 `null` = 请求成功但确定无图（可安全缓存为无图）；抛出 `Error` = 请求失败（网络错误 / HTTP 非 2xx / 响应异常），属瞬时状态，上层不得缓存"无图"结论，应允许下次重试。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./WikimediaImageFilters` | 从缩略图 URL 提取文件名（`extractFileNameFromThumbUrl`）、文件名黑名单过滤（`isNonPlaceImageTitle`）、标题含地点名关键词判定（`titleContainsPlaceName`） |
| `./WikimediaFileMetaApi` | 第二阶段批量查询 Commons 作者/许可元数据（`wikimediaFileMetaApi`、类型 `WikimediaFileMeta`） |

| 外部库 | 用途 |
| --- | --- |
| 无 | 仅使用内置 `fetch`、`URL` |

## 导出与函数明细

### `WikivoyagePageDto`
- 类型：类型（interface，非导出）
- 传入：无
- 传出：MediaWiki 页面精简形态
- 用处：声明字段 `title?`（如 "George Town (Malaysia)"）、`index?`（搜索结果序号，按相关性升序，用于保持候选优先级）、`thumbnail?.source`（prop=pageimages 缩略图）。

### `WikivoyageQueryResponse`
- 类型：类型（interface，非导出）
- 传出：query 响应结构
- 用处：声明 `query.pages`（键为 page id）与 `error` 字段。

### `WikivoyageImageApi`
- 类型：类
- 传入：无
- 传出：客户端实例
- 用处：Wikivoyage 图片客户端。持有字段：`wikivoyageBaseUrl = "https://en.wikivoyage.org/w/api.php"`（英语 Wikivoyage，马来西亚地点英文内容最全）、`fileMetaClient = wikimediaFileMetaApi`。

#### `findImage(params: { placeName: string })`
- 类型：方法（async）
- 传入：`params.placeName`——地点名称（如 "George Town Penang"、"Kota Kinabalu"）
- 传出：`Promise<WikimediaFileMeta | null>`——带作者/许可信息的图片元数据；确定无图返回 `null`；请求失败抛出
- 用处：Wikivoyage 地点图片查询主入口（标题搜索 → 全文搜索兜底），命中即返回带作者/许可信息的图片。实现：placeName trim 后为空直接返回 `null`；`searchCandidates` 收集候选；候选为空返回 `null`；批量查询 Commons 元数据（一次请求；非 Commons 文件/无许可 → 不在结果中），按候选顺序返回第一个有元数据的。

#### `searchCandidates(placeName: string)`（私有）
- 类型：方法（async，私有）
- 传入：`placeName`——地点名称
- 传出：`Promise<Array<{ fileName: string; thumbUrl: string }>>`——按优先级排列的候选数组
- 用处：搜索候选条目：先 `search("intitle:{placeName} Malaysia")`（标题搜索，精确命中条目标题含地点名者），经 `pickCandidates` 过滤后有结果即返回；否则 `search("{placeName} Malaysia")`（全文搜索兜底，条目标题仍须含地点名关键词，防止全文命中不相关条目）再过滤。候选须通过：标题含地点名关键词 + 首图来自 Commons + 文件名过黑名单。

#### `search(keyword: string)`（私有）
- 类型：方法（async，私有）
- 传入：`keyword`——搜索关键词
- 传出：`Promise<Record<string, WikivoyagePageDto>>`——含首图的页面映射
- 用处：搜索 Wikivoyage 条目。请求参数：`generator=search`、`gsrsearch`、`gsrnamespace=0`（普通条目命名空间）、`gsrlimit=5`、`prop=pageimages`、`piprop=thumbnail`、`pithumbsize=800`、`format=json`、`origin=*`。经 `requestPages` 解析返回。

#### `pickCandidates(pages, placeName)`（私有）
- 类型：方法（同步，私有）
- 传入：`pages`——搜索结果页面映射；`placeName`——地点名称
- 传出：`Array<{ fileName: string; thumbUrl: string }>`——通过过滤的候选数组
- 用处：从搜索结果挑选候选（按相关性 `index` 升序）。过滤（顺序）：
  1. 条目标题必须含地点名关键词（`titleContainsPlaceName`，防不相关条目误配）；
  2. 首图 URL 必须为 `http(s)://` 开头且来自 Wikimedia Commons（`isCommonsUrl`，`/commons/` 路径，开源协议保证——本地文件无法提供作者/许可声明，跳过）；
  3. 首图文件名过黑名单（`isNonPlaceImageTitle`，排除 logo/map 等非地点图）。

#### `isCommonsUrl(url: string)`（私有）
- 类型：方法（同步，私有）
- 传入：`url`——图片 URL
- 传出：`boolean`
- 用处：判定图片 URL 是否来自 Wikimedia Commons（本地文件路径不含 `/commons/`）。URL 解析失败返回 `false`。

#### `requestPages(url: string)`（私有）
- 类型：方法（async，私有）
- 传入：`url`——完整请求 URL
- 传出：`Promise<Record<string, WikivoyagePageDto>>`——pages 映射
- 用处：发起请求并解析 `query.pages`。网络错误抛错；HTTP 非 2xx（429 限流 / 4xx / 5xx 均视为瞬时失败）抛错；JSON 解析失败抛错；响应含 `error` 字段抛 API error。

### `wikivoyageImageApi`
- 类型：常量
- 传入：无
- 传出：`WikivoyageImageApi` 单例实例
- 用处：模块导出的共享单例，供上层（BL 层）直接引入使用。
