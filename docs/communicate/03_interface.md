-- 中文

> **注意**: 本文档仅用于统一整个系统的接口设计，保持简洁明了

# 模块 03 — Destination Discovery & Inspiration 极简对接文档

## 1. 模块职责简述
目的地发现与灵感模块：搜索/联想马来西亚地点（Geoapify 经服务端代理，强制限定马来西亚）、体验类型/州属/室内外多维筛选、Recommended Places 官方品质评级展示、灵感合辑（Wikivoyage 分类树主题自动发现）、节日活动流、收藏夹与"加入行程"（模块 02），以及统一的景点图片链路（Wikivoyage → Wikipedia → Commons Geosearch → Mapillary，带开源协议署名与内存/sessionStorage/KV 三级缓存）。前端能实现的逻辑全部在浏览器端 BL 完成，Route API 仅承担密钥代理与 D1/KV 持久化的薄传输。

## 2. 依赖项 (需要其他模块/环境支持)
- **依赖接口/组件：**
  - **模块 01 会话**：`useAuthStore`（`app/DEV-ACCOUNT-STATE/authUser.ts`，zustand persist）——`currentUserId()` 动态读取登录用户；服务端授权 `getAuthSession` / `requireUser` / `requireAdmin`（`app/DEV-ACCOUNT-STATE/api/session.ts`）——收藏写、图片缓存写、事件/评级同步等受限操作依赖会话凭证（`Authorization: Bearer <token>`）。
  - **模块 02 行程导入**：`RoutePlannerBridge.pushItem(item)`——收藏地点"加入行程"的跨模块调用（BL 层编排）。当前为 stub（mock 实现，签名与返回结构固定），未来替换为模块 02 真实导入端点后上层无需改动。
  - **模块 01 侧 DEV 页面**（`app/DEV-ACCOUNT-STATE/`）会反向调用本模块的同步服务与清缓存接口（见 §3 暴露项）。
- **环境与 Context 依赖：**
  - `.env`（服务端 `process.env`，非 `NEXT_PUBLIC`）：`GEOAPIFY_API_KEY`（Geoapify 代理）、`MAPILLARY_ACCESS_TOKEN`（Mapillary 代理）；缺失时对应 Route API 返回 500，图片链路自动降级。
  - Cloudflare bindings（`wrangler.json`）：`TEST_DB`（D1：`favorite_items` / `events` / `official_quality_ratings` 表）、`PLACE_IMAGE_CACHE`（KV：地点图片缓存，键前缀 `module03:place-image:v5:`）。
  - 顶层会话 store：`useAuthStore`（localStorage `auth-storage`），非 React Provider。
  - 外部第三方 API（均免费/无 key 或密钥服务端持有）：Geoapify、Nominatim、Wikidata、Wikipedia/Commons、Wikivoyage、Mapillary。

## 3. 暴露项 (提供给其他模块使用)
- **导出的组件/函数/API：**
  - **页面路由**（供 `Sidebar` 等导航）：`/03_Destination_Discovery_&_Inspiration`，子路由 `/search`、`/place/[placeId]`、`/collections/[collectionId]`；路径常量与链接构造函数见 `app/03_.../routes.ts`（`MODULE_03_HOME` / `SEARCH_PAGE` / `searchPagePath` / `placeDetailPath` / `collectionDetailPath` / `googleMapsUrl` / `WIKIVOYAGE_HOME`）。
  - **BL 服务单例**（供 DEV-ACCOUNT-STATE 页面按钮等调用）：
    - `eventSyncService.syncEvents(): Promise<EventSyncResult>`、`clearEvents(): Promise<number>`
    - `qualityRatingSyncService.syncQualityRatings(onProgress?): Promise<QualityRatingSyncResult>`、`clearQualityRatings(): Promise<number>`
    - `discoveryService.clearImageCaches(): Promise<number>`
  - **Route API**（HTTP 传输通道，浏览器端仓储经此读写 D1/KV）：
    - `GET/POST/DELETE /03_Destination_Discovery_&_Inspiration/api/favourites` —— 收藏 CRUD（POST 需登录、DELETE 需登录；userId 一律由服务端会话解析）
    - `GET/POST/DELETE /.../api/events` —— 活动（GET 公开；POST 批量 upsert / DELETE 清空需管理员）
    - `GET/POST/DELETE /.../api/official-quality-ratings` —— 官方评级（GET 公开；写需管理员）
    - `GET/PUT/DELETE /.../api/place-image` —— 地点图片 KV 缓存（GET 公开；PUT 需登录；DELETE 清空需管理员）
    - `GET /.../api/geocode?type=autocomplete|search&text&limit` —— Geoapify 代理，服务端注入密钥并强制 `filter=countrycode:my`
    - `GET /.../api/mapillary?action=search|image&bbox|imageId` —— Mapillary 代理，服务端注入 token 并强制 bbox 落在马来西亚边界框内
  - **类型出口**：`business_logic_layer/03_Destination_Discovery_&_Inspiration/types.ts`（Presentation 层唯一类型来源，含下层类型 re-export）。
- **回调与触发事件：**
  - `onProgress?: (done: number, total: number) => void` —— `syncQualityRatings` 每处理一条调用一次（进度/超时提示）。
  - `favoritesService.togglePoiFavourite(poi: PoiItem): Promise<boolean>` —— 切换收藏，返回切换后的收藏状态；未登录抛 `Error("Please log in first")`。
  - `favoritesService.addToTrip(item: SavedItem): Promise<PushToRoutePlannerResult>` —— 触发"加入行程"（模块 02），返回 `{ success, pushedCount, target }`。
  - `discoveryService.getPlaceImage(placeId, placeName, lat?, lon?): Promise<PlaceImageResult | null>` —— 统一图片链路结果；`null`/空 url 表示无图，有图时必须展示 `attribution` 署名。

## 4. 核心 TypeScript 类型
> 完整领域类型见 `business_logic_layer/03_Destination_Discovery_&_Inspiration/types.ts`；以下为对外交互最核心的定义。

```ts
/** 室内外场景分类 */
export type activeType = "indoor" | "outdoor" | "all";

/** 搜索与多维筛选条件（驱动 POI 查询/过滤） */
export interface SearchFilters {
  query: string;            // 关键词
  experienceType: string;   // 体验类型（空串 = 不限）
  scene: activeType;        // 室内外场景（"all" = 不限）
  state: string;            // 马来西亚州/联邦直辖区（空串 = 不限）
}

/** 地点决策卡片条目（BL 聚合外部数据 + 收藏状态后的领域形态） */
export interface PoiItem {
  id: string;               // 展示/收藏用 id（geo-<placeId> 或 json-<jsonId>）
  placeId?: string;         // Geoapify place_id（详情页跳转用）
  lat?: number;
  lon?: number;
  name: string;
  imageUrl: string;         // 空串表示另经统一图片链路获取
  qualityBadge?: "platinum" | "gold" | "silver"; // 官方评级徽章（命中时）
  ratingDuration?: string;  // 官方评级有效期
  formatted?: string;       // 完整格式化地址
  state?: string;
  phone?: string;           // 联系电话（仅 Recommended Places）
  isFavourite: boolean;     // 是否已被当前用户收藏
  isOpenNow: boolean;
  suggestedDuration: string;
  ticketPrice: string;
  bestVisitTime?: string;
  facilities: FacilityTag[];
  scene: "indoor" | "outdoor";
  experienceType: string;
}

/** 地点详情（PoiItem + Geoapify 完整地理字段） */
export interface PlaceDetail extends PoiItem {
  placeId: string;
  formatted: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country: string;
  countryCode: string;
  category?: string;        // 如 "tourism.attraction"
  resultType?: string;
  lat: number;
  lon: number;
}

/** 灵感合辑条目（Wikivoyage 主题自动发现） */
export interface Collection {
  id: string;               // "cat:{CategoryTitle}" | "topics" | "itineraries"
  title: string;
  subtitle: string;
  imageUrl: string;
  memberCount: number;
  starCount: number;        // Wikivoyage Star 徽章数
  source: "category" | "topics" | "itineraries";
  categoryTitle?: string;
}

/** 节日/活动条目（D1 中 parsed_events.json 同步数据） */
export interface EventItem {
  id: string;
  title: string;
  categories: string[];
  date: string;             // 如 "19 Jun 2026 - 25 Apr 2027"
  location: string;
  url: string;              // 活动官方页面
}

/** 收藏夹条目（领域形态 = DA 实体） */
export type SavedItem = FavoriteItemEntity; // { id, placeId, name, thumbnailUrl, experienceType }

/** 地点图片查询结果（url 为空串 = 确定无图；有图时必须展示 attribution） */
export interface PlaceImageResult {
  url: string;
  attribution?: PlaceImageAttribution; // { artist?, licenseName?, licenseUrl?, credit? }
}

/** "加入行程"（模块 02 桥接）结果 */
export interface PushToRoutePlannerResult {
  success: boolean;
  pushedCount: number;
  target: "02_Trip_Planning_&_Itinerary_Management";
}
```