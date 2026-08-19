# DiscoveryService.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Business Logic Layer
> - 源文件：`business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService.ts`
> - 类型：业务服务类（单例导出）

## 责任

模块 03 的目的地探索核心业务逻辑，全部在浏览器端执行（符合"前端能实现的绝不交给后端"原则）。职责包括：

- **智能搜索与多维筛选**：关键词 / 体验类型 / 州属 / 室内外场景组合筛选（`searchPois` / `searchPlaceDetails` / `applyPoiFilters`）；
- **搜索联想**：真实 Geoapify autocomplete（限定马来西亚，`getSuggestions`）；
- **灵感合辑 / 节日活动聚合**：活动流经 Data Access 层读取 D1 中同步的官方活动（`getEventFeed`）；
- **收藏状态合并**：外部数据 + 用户收藏数据合并出领域形态 `PoiItem.isFavourite`；
- **Recommended Places 独立展示**：官方品质评级数据（D1）映射为 PoiItem，与搜索栏完全解绑（`getQualityRatedPois`）；
- **统一图片链路**（`getPlaceImage`）：Wikivoyage 条目配图 → Wikipedia 条目配图 → Wikimedia Commons Geosearch → Mapillary 兜底，带三级缓存（内存短期 URL 缓存 / sessionStorage 引用缓存 / Cloudflare KV），并携带开源协议署名（attribution）。

数据来源全部为真实第三方 API（经 API Layer）与 Cloudflare D1 / KV（经 Data Access Layer），无硬编码 mock POI（空搜索时以 8 个马来西亚热门目的地种子词经 Geoapify 真实搜索取 top1，配 Wikidata 兜底）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `api_layer/.../DiscoveryExternalApi` | 筛选字典（体验类型 / 州属候选），mock 占位 |
| `api_layer/.../GeoapifyGeocodingApi` | 地点正向搜索 / autocomplete（`GeoapifyPlaceDto`） |
| `api_layer/.../WikidataApi` | 推荐/兜底路径的 Wikidata 实体搜索与详情 |
| `api_layer/.../WikipediaImageApi` | 统一图片链路第 2 环节（Wikipedia 条目配图） |
| `api_layer/.../WikivoyageImageApi` | 统一图片链路第 1 环节（Wikivoyage 条目配图） |
| `api_layer/.../WikimediaGeosearchApi` | 统一图片链路第 3 环节（Commons Geosearch） |
| `api_layer/.../MapillaryApi` | 统一图片链路第 4 环节（Mapillary 兜底） |
| `api_layer/.../MalaysiaBounds` | `MALAYSIA_BBOX` 马来西亚边界框（Wikidata 坐标过滤） |
| `api_layer/.../WikimediaFileMetaApi` | `WikimediaFileMeta` 类型（图片来源元数据） |
| `data_access_layer/.../FavoritesRepository` | 收藏仓储接口（读取用户收藏） |
| `./FavoritesService` | `currentUserId`（会话用户 ID）、`sharedFavoritesRepository`（共享收藏仓储单例） |
| `data_access_layer/.../OfficialQualityRatingRepository` | 官方评级实体/仓储类型 |
| `data_access_layer/.../RemoteQualityRatingRepository` | 官方评级远程仓储（浏览器端经 Route API → D1） |
| `data_access_layer/.../RemoteEventRepository` | 活动远程仓储（浏览器端经 Route API → D1） |
| `data_access_layer/.../EventRepository` | 活动仓储接口 |
| `data_access_layer/.../PlaceImageCacheRepository` | 图片缓存仓储接口 + `parse/serializePlaceImageEntry` + `PlaceImageCacheEntry` |
| `data_access_layer/.../RemotePlaceImageCacheRepository` | 图片缓存远程 KV 仓储（浏览器端经 Route API → KV） |
| `./types` | 领域类型（`EventFeedItem`、`FilterOptions`、`PlaceDetail` 等） |

## 导出与函数明细

### 类 `DiscoveryService`
- 类型：类（构造时依赖注入全部下游客户端/仓储，默认使用各层单例）
- 传入：构造函数参数——`externalApi`（筛选字典）、`favoritesRepo`、`geocodingApi`、`qualityRatingRepo`、`eventRepo`、`wikivoyageImageClient`、`wikipediaImageClient`、`wikimediaGeosearchClient`、`mapillaryClient`、`wikidataClient`、`placeImageCache`
- 用处：模块 03 探索业务的总编排器，Presentation 层 hooks 通过导出的 `discoveryService` 单例调用。

#### `getFilterOptions()`
- 传入：无
- 传出：`Promise<FilterOptions>`（`experienceTypes: string[]` + `states: string[]`）
- 用处：获取筛选面板候选项（体验类型 / 马来西亚州属），数据来自 `DiscoveryExternalApi`。

#### `getEventFeed()`
- 传入：无
- 传出：`Promise<EventFeedItem[]>`（活动流条目，`nearby` 恒为空数组）
- 用处：节日活动流（活动 + 周边住宿/餐饮推荐），数据源为 Cloudflare D1 中同步的官方活动（浏览器端经 Route API 读取）。

#### `getSuggestions(query: string)`
- 传入：`query: string`（用户输入的搜索词）
- 传出：`Promise<SuggestionItem[]>`（空词返回 `[]`）
- 用处：搜索框输入联想，调用 Geoapify autocomplete（limit 6，限定马来西亚），映射为领域形态。

#### `searchPlaceDetails(query: string, filters?: SearchFilters)`
- 传入：`query: string`（搜索词）；`filters?: SearchFilters`（可选多维筛选）
- 传出：`Promise<PlaceDetail[]>`（含完整地理字段；空词返回 `[]`）
- 用处：搜索结果页数据源。Geoapify 正向搜索（limit 10）+ D1 官方评级徽章合并（place_id 命中才有徽章）+ 按"名称+地址"去重（`dedupePlaceDetails`）；传入 filters 时返回前应用多维筛选。

#### `applyPoiFilters<T extends PoiItem>(pois: T[], filters: SearchFilters)`
- 传入：`pois: T[]`（已加载的 POI 列表）；`filters: SearchFilters`
- 传出：`T[]`（过滤后的列表）
- 用处：对已加载 POI 应用多维筛选（scene / experienceType / state），纯计算不发起请求。品质评级不属于筛选维度（Recommended Places 独立展示）。

#### `filterPlaceDetails(details: PlaceDetail[], filters: SearchFilters)`
- 传入：`details: PlaceDetail[]`；`filters: SearchFilters`
- 传出：`PlaceDetail[]`
- 用处：搜索结果页复用的筛选封装，委托 `applyPoiFilters`。

#### `getPlaceDetail(placeId: string, queryText: string)`
- 传入：`placeId: string`（Geoapify place_id 或 `wikidata:Qxxx`）；`queryText: string`（原始搜索词）
- 传出：`Promise<PlaceDetail | null>`（找不到返回 `null`）
- 用处：地点详情页数据源。两级策略：①官方评级地点按 place_id 直接从 D1 读取（修复小地点重搜匹配不上 place_id 的问题）；②其余地点以搜索词重新正向搜索（limit 20）并匹配 place_id 兜底；`wikidata:` 前缀走 Wikidata 直构兜底（`getWikidataPlaceDetail`）。

#### `getPlaceImage(placeId: string, placeName: string, lat?: number, lon?: number)`
- 传入：`placeId`（缓存键，为空时以 placeName 作后备键）、`placeName`（地点名）、`lat?`、`lon?`（经纬度，Mapillary/Geosearch 环节需要）
- 传出：`Promise<PlaceImageResult | null>`（`null` = 确定无图）
- 用处：统一图片链路（Recommended Places 与 Search&Filter 共用）。查询顺序：内存短期 URL 缓存 → 引用缓存（内存/sessionStorage/KV）→ Wikivoyage 条目配图 → Wikipedia 条目配图 → Commons Geosearch（5000m 半径，马来西亚 bbox）→ Mapillary 兜底。**缓存策略**：仅缓存"确定结果"（瞬时失败不写入，避免配额恢复后图片永久缺失）；Mapillary 只持久化 imageId（URL 带签名有时效，仅内存复用 1 小时）。并发去重：同一 placeId 的进行中请求共享同一 Promise。

#### `clearImageCaches()`
- 传入：无
- 传出：`Promise<number>`（实际清除的 KV 条目数）
- 用处：清空全部地点图片缓存（DEV 工具，供 DEV-ACCOUNT-STATE 页面调用）：KV 逐键删除（仅本模块键前缀）+ sessionStorage 各版本键 + 内存缓存。

#### `getQualityRatedPois()`
- 传入：无
- 传出：`Promise<PoiItem[]>`（官方评级地点卡片列表）
- 用处：Recommended Places 数据源。并行读取 D1 全部官方评级条目 + 当前用户收藏，按 jsonId 去重（`dedupeQualityRatedItems`，品质等级优先：platinum > gold > silver，同级取 syncedAt 最新），映射为 PoiItem（含 isFavourite 合并）。与搜索栏完全解绑，不接受筛选条件。

#### `searchPois(filters: SearchFilters)`
- 传入：`filters: SearchFilters`
- 传出：`Promise<PoiItem[]>`（含 isFavourite 合并）
- 用处：主页 POI 列表入口。query 非空 → Geoapify 正向搜索；query 为空 → 热门目的地推荐（8 个种子词，实体验证机制过滤道路/街区，Wikidata 兜底）。返回前应用多维筛选并合并收藏状态。

### 内部工具函数（模块私有）

| 函数 | 传入 | 传出 | 用处 |
| --- | --- | --- | --- |
| `isRejectedPlace(place)` | `GeoapifyPlaceDto` | `boolean` | 判定是否道路/街区等非具体实体（黑名单命中） |
| `isConcreteEntity(place)` | `GeoapifyPlaceDto` | `boolean` | 判定是否具体实体（白名单/分类前缀命中） |
| `pickBestRecommendation(places)` | `GeoapifyPlaceDto[]` | `GeoapifyPlaceDto \| undefined` | 推荐候选挑选：具体实体优先，其次大地点 |
| `isInMalaysia(place)` | `WikidataPlaceDto` | `boolean` | Wikidata 实体是否位于马来西亚（P17 国家命中优先，坐标 bbox 兜底） |
| `toWikidataPlaceDto(place)` | `WikidataPlaceDto` | `GeoapifyPlaceDto` | Wikidata 实体 → Geoapify 兼容形态（placeId 带 `wikidata:` 前缀） |
| `awardCategoryToBadge(category)` | `string`（"Platinum"/"Gold"/"Silver"） | 徽章等级或 `undefined` | 官方评级奖项 → 品质徽章映射 |
| `toQualityRatedPoiItem(item, isFavourite)` | `OfficialQualityRatingEntity`、`boolean` | `PoiItem` | 官方评级实体 → PoiItem（JSON 字段 + Nominatim 补全坐标；展示字段置空） |
| `inferScene(category, resultType?)` | 分类/结果类型字符串 | `"indoor" \| "outdoor"` | 由分类关键词推断室内/室外（占位，默认 outdoor） |
| `inferExperienceType(category, resultType?)` | 分类/结果类型字符串 | `string` | 由分类映射体验类型（与筛选字典取值一致） |
| `inferSuggestedDuration(category)` | `string` | `string` | 由分类粗略推断建议停留时长（占位） |
| `toPoiItem(place)` | `GeoapifyPlaceDto` | `PoiItem` | Geoapify 地点 DTO → 领域形态（缺失字段以推断值占位） |
| `toPlaceDetail(place)` | `GeoapifyPlaceDto` | `PlaceDetail` | Geoapify DTO → 地点详情（完整地理字段） |
| `normalizeSearchText(text)` | `string` | `string` | 文本归一化（trim + 小写 + 压缩空白），防重复去重键用 |
| `matchesState(stateValue, selectedState)` | 州字段值、筛选候选州 | `boolean` | 州属筛选匹配（别名表双向包含比较，兼容 "Pulau Pinang"/"Melaka" 等 OSM 取值） |
| `dedupePlaceDetails(places)` | `PlaceDetail[]` | `PlaceDetail[]` | 按"名称+地址"去重（保留首次出现项，无名称剔除） |
| `getWikidataPlaceDetail(placeId, queryText)` | `wikidata:` 前缀 placeId、搜索词 | `Promise<PlaceDetail \| null>` | Wikidata 来源详情：Geoapify 搜索取合格结果 → 失败直构 |
| `findQualityRatedByPlaceId(placeId)` | `string` | `Promise<OfficialQualityRatingEntity \| null>` | 按 place_id 查官方评级条目（D1 失败静默降级 null） |
| `toQualityRatedPlaceDetail(item)` | `OfficialQualityRatingEntity` | `PlaceDetail \| null` | 官方评级条目 → 地点详情（字段不齐返回 null） |
| `wikimediaResult(meta)` | `WikimediaFileMeta` | `PlaceImageResult` | Wikimedia 客户端结果 → 领域形态（缩略图 URL + 署名） |
| `resolveImageRef(placeId, ref)` | 缓存键、`PlaceImageCacheEntry` | `Promise<PlaceImageResult \| null>` | 解析引用缓存条目（mapillary 用 imageId 换取当前有效 URL） |
| `persistDeterminateImage(placeId, entry)` | 缓存键、来源引用条目 | `Promise<void>` | 确定结果写入内存 Map + sessionStorage + Cloudflare KV |
| `getImageUrlCache()` / `setImageUrlCache(...)` | 见签名 | — | 内存短期 URL 缓存（wikimedia 永久 / mapillary 1 小时）读写 |
| `getImageRefCache()` / `persistImageCache()` | 见签名 | — | 引用缓存懒加载（从 sessionStorage 恢复，清旧版键）/ 持久化 |
| `getQualityBadgeMap()` | 无 | `Promise<Map<string, 徽章等级>>` | D1 全部评级条目 → placeId → 徽章映射（失败降级空 Map） |
| `dedupeQualityRatedItems(items)` | `OfficialQualityRatingEntity[]` | `OfficialQualityRatingEntity[]` | 按 jsonId 去重（品质等级优先，同级取最新） |
| `fetchPlaces(query)` | `string` | `Promise<GeoapifyPlaceDto[]>` | 真实地点数据源：非空 → 正向搜索；空 → 种子词推荐（结果缓存） |
| `findWikidataPlace(query)` | `string` | `Promise<GeoapifyPlaceDto \| null>` | Wikidata 兜底：搜索命名实体 → 过滤马来西亚 → 取有坐标者 |

### 常量导出
- **`discoveryService`**：`DiscoveryService` 单例（Presentation 层 `hooks.ts` 与各页面直接使用）。

### 关键常量（模块私有）
- `POPULAR_DESTINATIONS`：8 个马来西亚热门目的地种子词（Kuala Lumpur / Penang / Langkawi / Malacca / Johor Bahru / Cameron Highlands / Kota Kinabalu / Kuching）。
- `DETAIL_SEARCH_LIMIT = 20`、`RECOMMENDED_SEARCH_LIMIT = 5`：Geoapify 返回条数上限。
- `WIKIDATA_PLACE_ID_PREFIX = "wikidata:"`：Wikidata 来源 placeId 前缀。
- `MALAYSIA_WIKIDATA_ID = "Q833"`：马来西亚 Wikidata 国家实体 id。
- `STATE_ALIASES`：16 个州/联邦直辖区别名表（Geoapify OSM state 字段归一化匹配）。
- `BLOCKED_RESULT_TYPES` / `ENTITY_RESULT_TYPES` / `ENTITY_CATEGORY_PREFIXES`：推荐实体验证词表。
- `PLACE_IMAGE_CACHE_KEY = "module03-place-image-cache-v5"` + `LEGACY_PLACE_IMAGE_CACHE_KEYS`：图片缓存 sessionStorage 键（v5 携带署名信息）。
- `MAPILLARY_URL_TTL_MS = 3600000`：Mapillary URL 内存复用有效期。
- `RECOMMENDED_GEOSEARCH_RADIUS_METERS = 5000`：Commons Geosearch 统一半径。
- `MAPILLARY_ATTRIBUTION`：Mapillary 固定署名（CC BY-SA 4.0，Mapillary contributors）。
