# WikimediaFileMetaApi.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/WikimediaFileMetaApi.ts`
> - 对接的外部服务：Wikimedia Commons MediaWiki API（imageinfo / extmetadata）

## 责任

本文件是模块 03 的 Wikimedia Commons 文件元数据查询客户端，职责单一：仅负责与 Wikimedia Commons MediaWiki API 交流，按文件名批量查询文件页 `imageinfo`（`iiurlwidth` 缩略图 + `extmetadata` 作者/许可信息）；不包含业务规则、不触碰本地持久化、不编排跨模块流程。

关键地位：本客户端是 **Wikipedia / Wikivoyage 图片环节共用的"两阶段取图"第二阶段**——条目首图 URL → 提取文件名（`WikimediaImageFilters.extractFileNameFromThumbUrl`）→ 本客户端批量换取缩略图 URL 与作者/许可。同时导出 `wikimediaFileMetaFromImageInfo` 解析函数，供 Wikimedia Geosearch 客户端（`WikimediaGeosearchApi`）直接复用同一解析逻辑。

关键设计（开源协议与展示合规）：
- **仅接受来自 Commons 的文件即保证开源协议**：Wikimedia Commons 仅收录自由许可文件（CC BY-SA / CC BY / 公有领域等）；各语言 Wiki 的本地文件（如 fair use 图片）在 Commons 查询中无 `imageinfo`，本客户端跳过——拿不到作者/许可声明的图片不返回，上层继续下一图片来源；
- **extmetadata 清洗**：`extmetadata` 的 Artist / Credit / LicenseShortName / LicenseUrl 等字段值为 HTML 字符串，经 `cleanWikimediaHtml` 清洗为纯文本（去标签 + 解码常用实体 + 压缩空白）；
- **免费直连与热链**：Commons 公开 API 完全免费、无需 API key；MediaWiki API 支持 `origin=*`，浏览器端直连；返回 `upload.wikimedia.org` 缩略图 URL 可直接热链供 `<img>` 使用。

返回语义（供上层决定是否缓存）：返回 `Map<文件名, WikimediaFileMeta>` = 仅含查询成功且来自 Commons 且有可用图片 URL 的文件；完全无结果返回空 Map（确定无图）；抛出 `Error` = 请求失败（网络错误 / HTTP 非 2xx / 响应异常），属瞬时状态，上层不得缓存"无图"结论，应允许下次重试。

## 依赖

无模块 03 内部文件依赖（被其他文件依赖，而非依赖其他文件）。

| 外部库 | 用途 |
| --- | --- |
| 无 | 仅使用内置 `fetch`、`URL` |

## 导出与函数明细

### `ExtMetadataEntry` / `ImageInfoDto` / `MediaWikiPageDto` / `MediaWikiQueryResponse`
- 类型：类型（interface，非导出）
- 传入：无
- 传出：MediaWiki 响应结构
- 用处：`ExtMetadataEntry` 声明 extmetadata 条目（`value?: string`，HTML 字符串）；`ImageInfoDto` 声明 `thumburl`（iiurlwidth 缩略图，可热链）、`url`（原图 URL，thumburl 缺失时兜底）、`extmetadata`（作者/许可/归属）；`MediaWikiPageDto` 声明 `title`（文件页标题，规范化后）与 `imageinfo[]`；`MediaWikiQueryResponse` 声明 `query.pages` 与 `error`。

### `WikimediaFileMeta`
- 类型：类型（interface，导出）
- 传入：无
- 传出：Commons 文件元数据形态（供上层展示与缓存）
- 用处：字段：`thumbUrl`（缩略图 URL，upload.wikimedia.org，可直接热链）、`artist?`（原作者，纯文本）、`licenseName?`（许可短名，如 "CC BY-SA 4.0"）、`licenseUrl?`（许可链接）、`credit?`（归属文本，Commons Credit 字段，HTML 已清洗为纯文本）。缺失字段为 `undefined`。

### `WikimediaImageInfoLike`
- 类型：类型（interface，导出）
- 传入：无
- 传出：imageinfo 条目的最小结构
- 用处：本模块各 Wikimedia 客户端共用的解析输入类型：`thumburl?`、`url?`、`extmetadata?`（`Record<string, { value?: string }>`）。

### `cleanWikimediaHtml(html?: string)`
- 类型：函数
- 传入：`html`——可能含 HTML 标签的字符串（可选）
- 传出：`string | undefined`——清洗后的纯文本；空输入/清洗后为空返回 `undefined`
- 用处：清洗 HTML 字符串为纯文本：去标签（`<[^>]*>` → 空格）、解码常用实体（`&nbsp;`/`&amp;`/`&lt;`/`&gt;`/`&quot;`/`&#0?39;`）、压缩连续空白并 trim。用于 extmetadata 各字段的展示前处理。

### `wikimediaFileMetaFromImageInfo(info: WikimediaImageInfoLike | undefined)`
- 类型：函数
- 传入：`info`——imageinfo 条目（最小结构，可选）
- 传出：`WikimediaFileMeta | null`——文件元数据；条目无可用图片 URL（本地文件 / 数据异常）返回 `null`
- 用处：从 imageinfo 条目解析文件元数据：`thumbUrl = info.thumburl ?? info.url`，非 `http(s)://` 开头返回 `null`；随后用 `cleanWikimediaHtml` 清洗 `extmetadata` 的 Artist / LicenseShortName / LicenseUrl / Credit 四个字段。

### `WikimediaFileMetaApi`
- 类型：类
- 传入：无
- 传出：客户端实例
- 用处：Commons 文件元数据客户端。持有字段：`commonsBaseUrl = "https://commons.wikimedia.org/w/api.php"`。

#### `fetchCommonsFileMeta(fileNames: string[], width = 800)`
- 类型：方法（async）
- 传入：`fileNames`——文件名数组（如 "Batu_Caves_stairs_2022-05.jpg"，可带下划线）；`width`——缩略图宽度，默认 800
- 传出：`Promise<Record<string, WikimediaFileMeta>>`——文件名 → 文件元数据的 Map
- 用处：按文件名批量查询 Commons 文件元数据（缩略图 URL + 作者/许可）。实现：文件名 trim、去空，空数组直接返回 `{}`；构造请求 `titles=File:{name}|...`（`|` 连接）、`prop=imageinfo`、`iiprop=url|extmetadata`、`iiurlwidth`、`format=json`、`origin=*`；遍历响应 pages：无 `imageinfo`（非 Commons 文件/不存在）跳过，文件页标题（去除 `File:` 前缀）经 `normalizedKey`（空格 → 下划线）映射回调用方文件名形态（忽略大小写）作为结果键，`wikimediaFileMetaFromImageInfo` 解析失败也跳过。返回 Map 的键与传入文件名一致（下划线形态）。

#### `requestPages(url: string)`（私有）
- 类型：方法（async，私有）
- 传入：`url`——完整请求 URL
- 传出：`Promise<Record<string, MediaWikiPageDto>>`——pages 映射
- 用处：发起请求并解析 `query.pages`。网络错误抛错；HTTP 非 2xx（429 限流 / 4xx / 5xx 均视为瞬时失败）抛错；JSON 解析失败抛错；响应含 `error` 字段抛 API error。

### `wikimediaFileMetaApi`
- 类型：常量
- 传入：无
- 传出：`WikimediaFileMetaApi` 单例实例
- 用处：模块导出的共享单例，供 Wikipedia / Wikivoyage 图片客户端及上层直接引入使用。
