# WikimediaGeosearchApi.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/WikimediaGeosearchApi.ts`
> - 对接的外部服务：Wikimedia Commons MediaWiki API（Geosearch / imageinfo / coordinates）

## 责任

本文件是模块 03 的 Wikimedia Commons Geosearch 图片外部 API 客户端，职责单一：仅负责与 Wikimedia Commons MediaWiki API 交流，按经纬度坐标搜索地点图片；不包含业务规则、不触碰本地持久化、不编排跨模块流程。用于按坐标（如 Nominatim 降级命中的区域中心坐标）搜索附近地点的真实照片。

关键设计（免费直连与热链）：Commons 公开 API 完全免费、无需 API key；MediaWiki API 支持 `origin=*`，浏览器端直连（前端实现原则）；返回 `upload.wikimedia.org` 缩略图 URL（`thumburl`）可直接热链供 `<img>` 使用；匿名配额约 500 请求/5 分钟（浏览器共享出口 IP），上层已有调用控制。

过滤器（本客户端内强制，三层马来西亚范围 + 地点/景点过滤）：
1. **入口坐标必须位于马来西亚 bbox 内**（`isInMalaysiaBounds`），否则直接返回 `null`（不发请求）；
2. **搜索半径钳制上限 5000m**（geosearch 按距离排序，图片仍在地点附近、马来西亚内）；
3. **逐文件校验坐标位于马来西亚 bbox 内**——圆形搜索在边境附近可能越界（如柔佛南部 5km 半径可触及新加坡），文件级校验兜底拦截；
4. **图片必须是地点/景点**：`ggsnamespace=6` 仅搜索 File 命名空间（不带此参数时 geosearch 会优先返回无图片的非文件页，取图恒为空）；文件标题黑名单过滤（排除 logo/flag/map/sign 等）；传入 `placeName` 时优先选择标题含地点名关键词的文件（`titleContainsPlaceName`）；
5. **开源协议保证**：Commons 仅收录自由许可文件，本环节直接请求 `iiprop=url|extmetadata`，返回的作者与许可信息供展示署名（经 `wikimediaFileMetaFromImageInfo` 解析）。

返回语义（供上层决定是否缓存）：返回 `WikimediaFileMeta` = 查询到图；返回 `null` = 请求成功但确定无图（或全部结果被过滤器排除，可安全视为无图）；抛出 `Error` = 请求失败（网络错误 / HTTP 非 2xx / 响应异常），属瞬时状态，上层不得缓存"无图"结论，应允许下次重试。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./MalaysiaBounds` | 马来西亚 bbox 判定（`isInMalaysiaBounds`），入口坐标与逐文件坐标校验 |
| `./WikimediaImageFilters` | 文件标题黑名单过滤（`isNonPlaceImageTitle`）、标题含地点名关键词判定（`titleContainsPlaceName`） |
| `./WikimediaFileMetaApi` | 类型 `WikimediaFileMeta` 与解析函数 `wikimediaFileMetaFromImageInfo`（imageinfo → 缩略图 URL + 作者/许可） |

| 外部库 | 用途 |
| --- | --- |
| 无 | 仅使用内置 `fetch`、`URL` |

## 导出与函数明细

### `ImageInfoDto` / `CoordinatesDto` / `MediaWikiPageDto` / `MediaWikiQueryResponse`
- 类型：类型（interface，非导出）
- 传入：无
- 传出：MediaWiki 响应结构
- 用处：`ImageInfoDto` 声明 `thumburl`（iiurlwidth 请求的缩略图 URL，可热链）、`url`（原图 URL，thumburl 缺失时兜底）、`extmetadata`（作者/许可，值为 HTML）；`CoordinatesDto` 声明 `lat`/`lon`；`MediaWikiPageDto` 声明 `title`（文件页标题）、`imageinfo[]`、`coordinates[]`；`MediaWikiQueryResponse` 声明 `query.pages` 与 `error`。

### `WikimediaGeosearchApi`
- 类型：类
- 传入：无
- 传出：客户端实例
- 用处：Commons Geosearch 图片客户端。持有字段：`commonsBaseUrl = "https://commons.wikimedia.org/w/api.php"`、静态常量 `MAX_RADIUS_METERS = 5000`（半径上限）、`MIN_RADIUS_METERS = 100`（半径下限，防 0/负值滥用）。

#### `findImageByCoords(params: { lat; lon; radiusMeters?; placeName? })`
- 类型：方法（async）
- 传入：`lat`/`lon`——搜索中心坐标；`radiusMeters?`——搜索半径（米），钳制范围 [100, 5000]，默认 1000；`placeName?`——地点名称（可选），传入时优先选择标题含地点名关键词的图片
- 传出：`Promise<WikimediaFileMeta | null>`——第一个通过过滤器的文件图片（含作者/许可信息）；请求成功但无结果（或被过滤）返回 `null`；请求失败抛出 `Error`
- 用处：按经纬度在 Commons 搜索地点图片的主入口。流程：
  1. 入口坐标校验：非有限数或不在马来西亚 bbox 内 → 视为无图，不发起请求，返回 `null`；
  2. 半径钳制到 [100, 5000] 米；
  3. 请求参数：`generator=geosearch`、`ggscoord={lat}|{lon}`、`ggsradius`、`ggslimit=10`、`ggsnamespace=6`（仅 File 命名空间）、`prop=imageinfo|coordinates`、`iiprop=url|extmetadata`（一次请求同时拿到缩略图 URL 与作者/许可）、`iiurlwidth=800`、`format=json`、`origin=*`；
  4. `requestPages` 解析后交给 `pickImage`。
  `radiusMeters` 由调用方按需指定（Recommended Places 统一传 5000m，因坐标可能为 Nominatim 降级命中的区域中心；默认 1000m 仅作兜底）。

#### `requestPages(url: string)`（私有）
- 类型：方法（async，私有）
- 传入：`url`——完整请求 URL
- 传出：`Promise<Record<string, MediaWikiPageDto>>`——pages 映射
- 用处：发起请求并解析 `query.pages`。网络错误抛错；HTTP 非 2xx（429 限流 / 4xx / 5xx 均视为瞬时失败）抛错；JSON 解析失败抛错；响应含 `error` 字段抛 API error。

#### `pickImage(pages, placeName?)`（私有）
- 类型：方法（同步，私有）
- 传入：`pages`——页面映射；`placeName?`——地点名称（可选）
- 传出：`WikimediaFileMeta | null`——第一个通过过滤器的文件图片；全部不过滤返回 `null`
- 用处：从 pages 中挑选图片。过滤（顺序）：
  1. 文件坐标必须位于马来西亚 bbox 内（缺失或非法 → 不通过，防止边境越界）；
  2. 文件标题（去除 `File:` 前缀）过黑名单（`isNonPlaceImageTitle`）；
  3. 经 `wikimediaFileMetaFromImageInfo(page.imageinfo?.[0])` 解析图片 URL + 作者/许可（extmetadata）；无可用 URL → 不通过；
  4. 若提供 `placeName`：优先返回标题含地点名关键词（`titleContainsPlaceName`）的文件，无匹配回退到第一个通过上述过滤的文件；未提供则取第一个。

### `wikimediaGeosearchApi`
- 类型：常量
- 传入：无
- 传出：`WikimediaGeosearchApi` 单例实例
- 用处：模块导出的共享单例，供上层（BL 层）直接引入使用。
