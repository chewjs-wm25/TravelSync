# hooks.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/hooks.ts`
> - 类型：客户端模块（`"use client"`，数据 hooks 集合）

## 责任

`hooks.ts` 是模块 03 Presentation 层的数据 hooks 中枢：封装对 Business Logic Layer 三个服务（`discoveryService`、`favoritesService`、`inspirationsService`）的异步调用与本地交互状态，使 UI 组件保持纯展示、不直接触碰 BL 以下的任何模块。文件共导出 8 个 hooks/接口：搜索与筛选、合辑列表、合辑详情、附近灵感、活动流、收藏夹、地点图片懒加载，以及初始化筛选状态接口。

关键设计遍布全文：①每个异步 `useEffect` 都带 `cancelled` 标志与清理函数，避免竞态；②失败一律静默降级（空列表 / 不打扰用户），仅收藏与合辑失败提供降级文案；③`sessionStorage` 合辑展示状态缓存（`module03:collections-state:v1`，含运行时类型守卫 `isCollection`，损坏即回退）；④`useCollectionDetail` / `useNearbyInspirations` 的结果状态携带来源标识（collectionId / coordKey），路由或成员切换期间由派生逻辑显示加载过渡态；⑤`usePlaceImages` 以「地点 id 序列化 key」驱动、按 `IMAGE_FETCH_CONCURRENCY = 4` 分批并发请求图片（保护 Wikimedia 匿名配额与 Mapillary 免费套餐），经 `discoveryService.getPlaceImage` 统一查询链（Wikivoyage → Wikipedia 条目配图 → Commons Geosearch → Mapillary 兜底，均马来西亚限定，结果携带开源协议署名 attribution）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService` | `discoveryService.getFilterOptions` / `getQualityRatedPois` / `getSuggestions` / `getEventFeed` / `getPlaceImage`（仅记录 import，未打开源文件） |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/FavoritesService` | `favoritesService.getSavedItems` / `togglePoiFavourite` / `removeSavedItem` / `addToTrip`（仅记录 import） |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/InspirationsService` | `inspirationsService.getCollections` / `getMoreCollections` / `getCollectionDetail` / `getNearbyInspirations` 与常量 `MAX_COLLECTIONS_DISPLAYED`（仅记录 import） |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | `activeType`、`Collection`、`CollectionDetail`、`EventFeedItem`、`FilterOptions`、`NearbyInspiration`、`PlaceImageResult`、`PoiItem`、`SavedItem`、`SuggestionItem`（仅记录 import） |
| 外部库：`react`（`useCallback`/`useEffect`/`useMemo`/`useState`） | React 状态与副作用原语 |

## 导出与函数明细

### `SearchAndFilterInitial`（接口）
- 类型：常量（TypeScript 接口）
- 内容：`{ query?: string; experienceType?: string; scene?: activeType; state?: string }` —— 搜索与筛选的初始状态，供搜索结果页从 URL 参数恢复时传入 `useSearchAndFilter`。

### `useSearchAndFilter`
- 类型：Hook
- 传入：`initial?: SearchAndFilterInitial` —— 可选初始筛选状态（默认空）
- 传出：`{ activeTab, setActiveTab, searchQuery, setSearchQuery, suggestions, isSuggesting, selectSuggestion, selectedExperienceType, setSelectedExperienceType, selectedState, setSelectedState, filterOptions, pois, isLoading, toggleFavourite }`。
- 用处：
  - 状态：`activeTab`（场景，默认 `initial?.scene ?? "all"`）、`searchQuery`、`suggestions`（联想建议）、`isSuggesting`、`selectedExperienceType`、`selectedState`、`filterOptions`（`{ experienceTypes, states }`）、`pois`、`isLoading`。
  - 挂载时拉取 `discoveryService.getFilterOptions()` 填充筛选面板候选项（`cancelled` 防竞态）。
  - 搜索框为空时拉取 `discoveryService.getQualityRatedPois()`（Cloudflare D1 官方品质评级地点，经 Route API 读取；BL 层不接受筛选条件，故与搜索栏筛选完全解绑，筛选变化不触发重新请求）；`searchQuery` 非空时跳过并置 `isLoading`。
  - 输入联想：`searchQuery.trim().length >= 2` 时防抖 300ms 调 `discoveryService.getSuggestions(trimmed)` 真实 Geoapify autocomplete；<2 字符不请求也不清空 state（下拉显隐由组件按长度控制）；失败清空建议但不打扰用户。
  - `selectSuggestion`：`useCallback`，把建议名回填搜索框并清空建议。
  - `toggleFavourite`：`useCallback`，先 `favoritesService.togglePoiFavourite(poi)`，若搜索框为空则重新拉取 `getQualityRatedPois()` 刷新列表（重新合并收藏标记）。

### `COLLECTIONS_STATE_KEY`（文件内常量）
- 类型：常量
- 内容：`"module03:collections-state:v1"` —— 合辑展示状态缓存键（sessionStorage，浏览器会话内记住已展示合辑数量，关闭浏览器即清除）。

### `isCollection`
- 类型：函数（TypeScript 类型守卫）
- 传入：`value: unknown`
- 传出：`value is Collection` —— 校验对象是否具备 `id`/`title`/`subtitle`/`imageUrl`（string）、`memberCount`/`starCount`（number）、`source`（`"category" | "topics" | "itineraries"` 之一）。
- 用处：校验 sessionStorage 反序列化条目，防止损坏数据进入状态。

### `loadCollectionsState`
- 类型：函数
- 传入：无
- 传出：`Collection[] | null` —— 从 sessionStorage 恢复合辑列表；`window` 未定义 / 无数据 / JSON 解析失败 / 非合法 Collection 数组时返回 `null`（全部包裹在 try-catch 中）。

### `persistCollectionsState`
- 类型：函数
- 传入：`collections: Collection[]`
- 传出：`void`
- 用处：把合辑列表写入 sessionStorage（尽力而为，写入失败静默忽略，不影响功能）。

### `useCollections`
- 类型：Hook
- 传入：无
- 传出：`{ collections, isLoading, isGenerating, hasMore, generateMore }`。
- 用处：
  - 初始状态：`collections` 从 `loadCollectionsState() ?? []` 恢复；`isLoading` 仅在无会话缓存时为 `true`；`hasMore` 由恢复结果推导（非空且数量 `< MAX_COLLECTIONS_DISPLAYED`）。
  - 首次加载 `inspirationsService.getCollections()`：成功则 `setCollections`、持久化、更新 `hasMore`；失败保持空列表由组件展示降级文案；`finally` 置 `isLoading = false`。
  - `generateMore`：`useCallback`，`isGenerating` 时直接返回（防重入），调 `inspirationsService.getMoreCollections()` 追加下一批并持久化，累计达 `MAX_COLLECTIONS_DISPLAYED` 后 `hasMore = false`；失败保留现有列表与 `hasMore`，用户可重试。

### `useCollectionDetail`
- 类型：Hook
- 传入：`collectionId: string` —— 合辑主题源标识
- 传出：`{ detail: CollectionDetail | null, isLoading: boolean, error: boolean }`。
- 用处：调 `inspirationsService.getCollectionDetail(collectionId)`（Wikivoyage 主题聚合，跨会话直连详情页时按需聚合）。结果状态携带 `collectionId`：当路由切换、`collectionId` 已变但新结果未到（`result.collectionId !== collectionId`）时返回 `{ detail: null, isLoading: true, error: false }` 过渡态；空 id 不请求。

### `useNearbyInspirations`
- 类型：Hook
- 传入：`lat?: number, lon?: number` —— 中心坐标（可选）
- 传出：`{ nearby: NearbyInspiration[], isLoading: boolean }`。
- 用处：调 `inspirationsService.getNearbyInspirations(lat, lon)`（Wikivoyage geosearch 附近目的地，马来西亚限定）。无坐标（非 number）时不请求、不改状态（附近区仅在选中成员有坐标时渲染）；结果状态携带 `coordKey`（`lat|lon`），坐标变化但新结果未到（`result.coordKey !== coordKey`）时返回 `{ nearby: [], isLoading: true }` 过渡态；失败返回空列表不打扰用户。

### `useEventFeed`
- 类型：Hook
- 传入：无
- 传出：`{ events: EventFeedItem[], isLoading: boolean }`。
- 用处：挂载时调 `discoveryService.getEventFeed()`（活动 + 周边推荐，数据来自 Cloudflare D1），`cancelled` 防竞态，`finally` 置 `isLoading = false`。

### `useFavorites`
- 类型：Hook
- 传入：无
- 传出：`{ savedItems, visibleItems, typeOptions, activeType, setActiveType, savedItemsCount, removeItem, toggleItem, addToTrip, refresh }`。
- 用处：
  - 文件内常量 `FAVOURITES_CHANGED_EVENT = "module03:favourites-changed"` 与函数 `notifyFavouritesChanged()`：收藏写操作成功后经 `window.dispatchEvent` 广播事件（SSR 安全跳过），**跨 useFavorites 实例同步**——同页多个实例（如页面卡片星标状态实例与布局收藏夹抽屉实例）或不同页面任一实例写操作后，全部已挂载实例统一重新拉取 D1，保证 Recommended Places / 搜索结果 / 地点详情 / 收藏夹抽屉的收藏状态即时一致。
  - 挂载 effect：先 `favoritesService.getSavedItems()` 填充 `savedItems`（失败保持空列表），随后 `window.addEventListener(FAVOURITES_CHANGED_EVENT, loadItems)` 订阅收藏变更（同一 `cancelled` 防竞态；卸载时 `removeEventListener`）。
  - `refresh`（`useCallback`）：对外保留的重新拉取入口（组件内部刷新统一由事件驱动，避免一次操作重复拉取）。
  - `typeOptions`：`useMemo` 从收藏条目体验类型去重生成（过滤空值），驱动类型过滤按钮。
  - `removeItem(id)`：调 `favoritesService.removeSavedItem(id)`，成功后 `notifyFavouritesChanged()` 广播变更（不再本地手动 refresh，由事件驱动所有实例统一刷新）。
  - `toggleItem(poi)`：调 `favoritesService.togglePoiFavourite(poi)`（收藏/取消收藏），成功后 `notifyFavouritesChanged()` 广播变更；未登录（401）时 `window.alert` 提示，不广播。
  - `addToTrip(item)`：委托 `favoritesService.addToTrip(item)`（经 RoutePlannerBridge 调用模块 02 真实导入接口），返回结果供 UI 反馈。
  - `visibleItems`：`activeType === "All"` 时返回全部，否则按 `experienceType` 过滤。

### `IMAGE_FETCH_CONCURRENCY`（文件内常量）
- 类型：常量
- 内容：`4` —— 图片请求并发上限（免费配额保护：Wikimedia 匿名配额、Mapillary 免费套餐）。

### `usePlaceImages`
- 类型：Hook
- 传入：`places: Array<{ id: string; placeId?: string; name: string; lat?: number; lon?: number }>` —— 需要取图的地点列表（`placeId` 为 Geoapify place_id，优先作缓存键；`lat`/`lon` 可选，用于 Commons Geosearch 与 Mapillary 兜底）
- 传出：`Record<string, PlaceImageResult>` —— 地点 id → 图片结果（`url` + `attribution` 作者/许可署名）；加载中/无图为 null/undefined（前端展示无图 Icon）。
- 用处：
  - `placeKey = places.map(p => p.id).join("|")`（`useMemo`）作为 effect 依赖，仅地点集合变化时重新加载。
  - 地点集合变化时 `setImages({})` 重置（未加载完成卡片显示占位），随后按 `IMAGE_FETCH_CONCURRENCY` 分批 `Promise.all` 调 `discoveryService.getPlaceImage(place.placeId ?? place.id, place.name, place.lat, place.lon)`，每批结束合并进 state；`cancelled` 时提前返回。
  - `getPlaceImage` 内部已全部降级（失败返回 null），外层仅防御性 `catch`；缓存由 BL 层内部完成（内存 URL 短期缓存 + 内存/sessionStorage/KV 引用缓存），重复浏览/翻页不重复消耗免费 API 额度。
