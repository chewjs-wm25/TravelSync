# types.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Business Logic Layer
> - 源文件：`business_logic_layer/03_Destination_Discovery_&_Inspiration/types.ts`
> - 类型：领域类型出口（类型定义 + re-export）

## 责任

模块 03 领域模型（Domain Model）的唯一总出口。本文件定义了模块 03 全部业务领域类型（如 `SearchFilters`、`PoiItem`、`PlaceDetail`、`Collection`、`EventItem` 等），并 re-export 下层（Data Access Layer / API Layer）的类型（如 `FavoriteItemEntity`、`FavoritesRepository`、`OfficialQualityRatingEntity`、`PlaceImageAttribution`、`GeoapifyPlaceDto`）。

分层意义：**Presentation 层只允许从这里导入类型**，保证依赖方向严格为 Presentation → Business Logic → Data Access / API，上层不直接依赖下层、下层不反向依赖上层。本文件本身不包含任何运行逻辑，只有类型声明。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `api_layer/.../GeoapifyGeocodingApi` | re-export `GeoapifyPlaceDto`（Geoapify 地点 DTO） |
| `data_access_layer/.../FavoritesRepository` | re-export `FavoriteItemEntity`、`FavoritesRepository` |
| `data_access_layer/.../PlaceImageCacheRepository` | re-export `PlaceImageAttribution`（图片署名） |
| `data_access_layer/.../OfficialQualityRatingRepository` | re-export `OfficialQualityRatingEntity`、`OfficialQualityRatingRepository` |

## 导出与函数明细

### 类型 `activeType`
- 类型：类型别名（`"indoor" | "outdoor" | "all"`）
- 传入：无（类型定义）
- 传出：室内外场景分类值
- 用处：与 SearchAndFilter 场景标签页对应，用于 `SearchFilters.scene` 与 `PoiItem.scene`。

### 接口 `SearchFilters`
- 类型：接口
- 字段：`query: string`（关键词）、`experienceType: string`（体验类型，空串不限）、`scene: activeType`（室内外，`"all"` 不限）、`state: string`（马来西亚州/联邦直辖区，空串不限）
- 用处：搜索与多维筛选条件，组合后驱动 POI 查询/过滤（`DiscoveryService.applyPoiFilters`）。

### 接口 `Collection`
- 类型：接口
- 字段：`id`（主题源标识 `"cat:{CategoryTitle}" | "topics" | "itineraries"`）、`title`、`subtitle`（州文章导语）、`imageUrl`（封面缩略图，无则空串前端渐变占位）、`memberCount`、`starCount`（Wikivoyage Star 徽章数）、`source`（`"category" | "topics" | "itineraries"`）、`categoryTitle?`（source=category 时的完整分类名）
- 用处：灵感合辑条目（数据源：Wikivoyage 自动发现，见 `InspirationsService`）。

### 接口 `CollectionPlaceItem`
- 类型：接口
- 字段：`id`（文章标题，作条目 id）、`title`、`extract`（Wikivoyage 导语，纯文本 2 句）、`imageUrl`、`isStar`（社区质量评级徽章）、`lat?`、`lon?`、`wikivoyageUrl`（完整指南外链）
- 用处：合辑成员目的地条目（Wikivoyage 文章映射后的领域形态）。

### 接口 `CollectionDetail`
- 类型：接口（`extends Collection`）
- 字段：继承 Collection 全部字段 + `items: CollectionPlaceItem[]`
- 用处：合辑详情（合辑摘要 + 成员列表），供合辑详情页使用。

### 接口 `NearbyInspiration`
- 类型：接口
- 字段：`title`、`imageUrl`、`isStar`、`distanceMeters: number`（距中心点距离，米）、`wikivoyageUrl`
- 用处：附近灵感条目（geosearch 附近目的地）。

### 接口 `FacilityTag`
- 类型：接口
- 字段：`type: string`、`label: string`、`status: "available" | "limited" | "unavailable"`
- 用处：设施状态标签（无障碍、停车等基础设施状态）。

### 接口 `PoiItem`
- 类型：接口
- 字段：`id`、`placeId?`（Geoapify place_id 或官方评级 JSON 条目 id，可为空）、`lat?`、`lon?`、`name`、`imageUrl`、`qualityBadge?: "platinum" | "gold" | "silver"`（官方品质评级徽章）、`ratingDuration?`（评级有效期）、`formatted?`（完整地址）、`state?`、`phone?`、`isFavourite: boolean`（是否已收藏，由 BL 合并得出）、`isOpenNow`、`suggestedDuration`、`ticketPrice`、`bestVisitTime?`、`facilities: FacilityTag[]`、`scene: "indoor" | "outdoor"`、`experienceType: string`
- 用处：地点决策卡片条目（BL 聚合外部数据 + 用户收藏状态后的领域形态），主页/搜索结果页/官方评级卡片的统一数据形态。

### 接口 `EventItem`
- 类型：接口
- 字段：`id`、`title`、`categories: string[]`（如 "Arts & Culture"）、`date: string`（举办日期区间）、`location: string`、`url: string`（官方页面 URL）
- 用处：节日/活动条目（数据源：Cloudflare D1 中 parsed_events.json 同步的官方活动）。

### 接口 `NearbyPlace`
- 类型：接口
- 字段：`name`、`category: "hotel" | "restaurant" | "food"`、`distanceKm: number`
- 用处：活动场地周边的住宿/餐饮推荐条目。

### 接口 `EventFeedItem`
- 类型：接口（`extends EventItem`）
- 字段：继承 EventItem + `nearby: NearbyPlace[]`
- 用处：节日活动 + 周边推荐的活动流条目（当前数据源无周边推荐，恒为空数组）。

### 接口 `SuggestionItem`
- 类型：接口
- 字段：`placeId`、`name`、`formatted`（完整地址，如 "Batu Caves, Selangor, Malaysia"）、`lat`、`lon`
- 用处：搜索联想建议条目（真实 Geoapify autocomplete 结果的领域形态）。

### 接口 `PlaceDetail`
- 类型：接口（`extends PoiItem`）
- 字段：继承 PoiItem + `placeId: string`（Geoapify place_id）、`formatted`、`addressLine1?`、`addressLine2?`、`city?`、`state?`、`country`、`countryCode`、`category?`（如 "tourism.attraction"）、`resultType?`（city/amenity/tourism/street 等）、`lat: number`、`lon: number`
- 用处：地点详情（搜索结果/详情页形态），由 BL `toPlaceDetail` 聚合，供搜索结果页与地点详情页使用。

### 类型 `SavedItem`
- 类型：类型别名（`= FavoriteItemEntity`）
- 用处：收藏夹条目领域形态，与 Data Access 实体一致（每个用户只有一个收藏夹）。

### 接口 `FilterOptions`
- 类型：接口
- 字段：`experienceTypes: string[]`、`states: string[]`（马来西亚州/联邦直辖区候选显示名）
- 用处：筛选面板的候选项（体验类型 / 马来西亚州属）。

### 接口 `PlaceImageResult`
- 类型：接口
- 字段：`url: string`（upload.wikimedia.org / Mapillary 签名 URL，可直接热链；空串表示确定无图）、`attribution?: PlaceImageAttribution`（作者/许可署名信息）
- 用处：地点图片查询结果（BL 统一图片链路 `getPlaceImage` 的返回形态），前端展示时必须保留署名。
