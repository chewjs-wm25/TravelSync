# search/page.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/search/page.tsx`
> - 类型：页面组件（客户端组件，`"use client"`）

## 责任

搜索结果页展示真实 Geoapify 搜索结果与多维筛选（体验类型 / 场景 / 州属），数据来自 BL 层 `discoveryService.searchPlaceDetails`（拉取完整结果集）与 `discoveryService.filterPlaceDetails`（对已加载结果做纯前端过滤，**不重复请求**），本文件不触碰 BL 以下任何模块。

核心设计是**URL 作为筛选状态的唯一真相**（query：`q` / `exp` / `scene` / `state`），实现「可分享、刷新保留、前进后退恢复」：
- 页面挂载 / URL 变化时从 URL 恢复筛选状态（`useEffect`：URL → 本地状态）；
- 用户操作筛选或修改搜索词时即时同步 URL（`router.replace`，不产生历史记录）；
- 搜索词仅在提交（Enter，由 `SearchAndFilter` 的 `goToSearchPage` push 新 URL）时写入 URL，输入过程不写 URL，避免每次击键触发搜索消耗 Geoapify 免费配额。

其余职责：`useFavorites` 合并收藏状态（星星按钮切换收藏，`favouriteIds` 集合派生填充态）；`usePlaceImages` 懒加载地点图片（统一链路 Wikivoyage → Wikipedia 条目配图 → Commons Geosearch → Mapillary 兜底，马来西亚限定）；有官方品质徽章 `place.qualityBadge` 的地点展示 Platinum/Gold/Silver 徽章；空态区分「无结果」与「筛选导致空」两种文案。`useSearchParams` 的使用要求页面用 `Suspense` 包裹内部组件（Next.js 静态渲染要求）。

## 分层数据流

```
SearchResults（本页核心组件）
  ├─ useSearchAndFilter()        → discoveryService.getFilterOptions / getSuggestions（筛选候选项 + 联想）
  ├─ discoveryService.searchPlaceDetails(q)   → Route API /03_Destination_Discovery_&_Inspiration/api/geocode?type=search → Geoapify
  ├─ discoveryService.filterPlaceDetails(allPlaces, filters) → BL 层纯计算（不重复请求）
  ├─ useFavorites()              → favoritesService.getSavedItems / togglePoiFavourite → Route API /03_Destination_Discovery_&_Inspiration/api/favourites → D1
  └─ usePlaceImages(places)      → discoveryService.getPlaceImage（图片查询链 + 缓存）
```
URL 状态流：`URL → 本地状态`（挂载/前进后退/从详情页返回恢复）与 `本地状态 → URL`（`router.replace`，筛选即时可分享）。

## 状态清单

| 状态 | 来源 | 说明 |
| --- | --- | --- |
| `q`/`exp`/`scene`/`state` | URL 解析 | 筛选唯一真相；`scene` 经 `parseSceneParam` 白名单化 |
| 搜索筛选状态（`searchQuery` 等） | `useSearchAndFilter(initial)` | 从 URL 初始化的受控状态 |
| `allPlaces` / `loadedQuery` / `error` | 组件本地 | 完整结果集；`isLoading = hasQuery && loadedQuery !== q` 派生 |
| `filters` / `places` | `useMemo` | BL 层 `filterPlaceDetails` 纯计算筛选结果 |
| `savedItems` / `toggleItem` / `favouriteIds` | `useFavorites` + `useMemo` | 收藏状态合并展示 |
| `images` | `usePlaceImages(places)` | 懒加载地点图片映射 |

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| `hasQuery` 为假（无搜索词） | 不触发搜索请求；显示「Enter a search term to find places in Malaysia.」空态 |
| 搜索请求失败 | `error` 提示 + 清空结果；显示「Please try again in a moment.」 |
| 筛选导致结果为空 | 空态文案「No places match the selected filters.」（`hasActiveFilters` 区分） |
| 搜索结果本身为空 | 空态文案「No results found for “{q}”」+ 建议换关键词（如 “Batu Caves” / “Penang”） |
| 图片加载中/无图 | 卡片图片区显示 `ImageOff` 图标（加载中先显示占位渐变底） |
| 联想请求失败 | hooks 清空建议（不打扰用户），搜索仍可正常提交 |
| 收藏切换 | 星星按钮 `preventDefault` + `stopPropagation`，不触发卡片跳转 |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../searchAndFilter` | 搜索栏与多维筛选面板（受控组件，与主页共用） |
| `../routes`（`MODULE_03_HOME`、`placeDetailPath`、`searchPagePath`） | 页面路由常量与路径构造 |
| `../favouriteList`（`StarIcon`） | 收藏星星图标（heroicons outline star） |
| `../hooks`（`useFavorites`、`usePlaceImages`、`useSearchAndFilter`） | 收藏状态、图片懒加载、搜索筛选状态 |
| `../placeImageAttribution` | 图片作者与许可署名展示（开源协议合规） |
| `../safeUrl` | 外部 URL 协议白名单（`safeHttpUrl`，渲染结果卡 `<img src>` 前过滤，防存储型 XSS） |
| `../../../business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService` | `discoveryService.searchPlaceDetails` / `filterPlaceDetails`（仅记录 import，未打开源文件） |
| `../../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | `PlaceDetail`、`SearchFilters`、`activeType`（仅记录 import） |
| 外部库：`react`、`next/navigation`（`useRouter`/`useSearchParams`）、`next/link`、`lucide-react`（`ImageOff`） | UI 与路由能力 |

## 导出与函数明细

### `BADGE_LABEL`（文件内常量）
- 类型：常量
- 内容：`Record<NonNullable<PlaceDetail["qualityBadge"]>, string>` 的纯 UI 映射：`platinum → "Platinum"`、`gold → "Gold"`、`silver → "Silver"`。

### `parseSceneParam`
- 类型：函数
- 传入：`value: string | null` —— URL 中 `scene` 参数原始值
- 传出：`activeType` —— 合法值（`indoor`/`outdoor`/`all`）原样返回，非法值（含 null）回退为 `"all"`。
- 用处：从 URL 解析场景参数时做白名单校验，防止非法值进入筛选状态。

### `SearchResults`（文件内组件）
- 类型：React 组件
- 传入：无 props；依赖 `useSearchParams()`（读 `q`/`exp`/`scene`/`state`）与 `useRouter()`。
- 传出：渲染（`<div className="space-y-6">`）：
  - 页头：标题 + 结果计数（`isLoading` 时显示「Searching for …」）/ 无查询词提示 + 「← Back to Explore」链接；
  - `SearchAndFilter` 面板（受控，同主页）；
  - 加载态（`isLoading && hasQuery` → `Loading places…`）；
  - 错误态（`!isLoading && error && hasQuery` → 错误卡 + 「Please try again in a moment.」）；
  - 空态（`!hasQuery` 或 `places.length === 0`：区分「Enter a search term…」/「No places match the selected filters.」/「No results found for …」三种文案）；
  - 4 列结果网格（整卡为 `Link` 跳地点详情页）。
- 用处（状态与数据流）：
  - 从 URL 解析 `q`/`exp`/`scene`（经 `parseSceneParam`）/`state`，`hasQuery = q.trim().length > 0`。
  - `useSearchAndFilter({ query: q, experienceType: exp, scene, state })` 初始化本地筛选状态。
  - `useEffect`（URL → 本地）：依赖 `[q, exp, scene, state]`，同步 `setSearchQuery(q)` / `setSelectedExperienceType(exp)` / `setActiveTab(scene)` / `setSelectedState(state)`——覆盖地址栏编辑、前进后退、从详情页返回等场景。
  - `useEffect`（本地 → URL）：依赖 `[q, selectedExperienceType, activeTab, selectedState]`，用 `searchPagePath(q, {...})` 构造目标 URL，若与当前 `pathname + search` 不同则 `router.replace(next)`；**搜索词用 URL 中已提交的 `q` 而非输入中的 `searchQuery`**，保证输入过程不写 URL。
  - 搜索请求：`useEffect` 依赖 `[q, hasQuery]`，调 `discoveryService.searchPlaceDetails(q)`：成功写 `allPlaces` 并清 error、置 `loadedQuery = q`；失败置 `setError("Search failed. Please check your connection and try again.")` 并清空结果；`cancelled` 防竞态。`isLoading = hasQuery && loadedQuery !== q` 为派生加载态。
  - 筛选：`filters`（`useMemo` 组装 `SearchFilters`）→ `places = useMemo(() => discoveryService.filterPlaceDetails(allPlaces, filters), [allPlaces, filters])`——筛选为 BL 层纯计算，不重复请求；`hasActiveFilters`（本地派生）区分空态文案。
  - 收藏：`useFavorites()` 取 `savedItems`/`toggleItem`；`favouriteIds = useMemo(new Set(savedItems.map(i => i.id)))`；星星按钮 `onClick` 中 `preventDefault()` + `stopPropagation()` 阻止卡片跳转后 `toggleItem(place)`。
  - 图片：`images = usePlaceImages(places)`；结果卡图片区按 `images[place.id]?.url` 渲染真实图片 + `PlaceImageAttribution`，无图渲染 `ImageOff`。
  - 卡片跳转：`Link href={placeDetailPath(place.placeId, q)}`（携带 placeId + 原始搜索词）；卡片展示名称、地址（`addressLine1 || addressLine2 || formatted`）、体验类型 / 州属 / 分类标签。

### `SearchPage`（默认导出）
- 类型：React 组件（页面入口）
- 传入：无 props
- 传出：渲染 `<Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>` 包裹的 `<SearchResults />`。
- 用处：`useSearchParams` 需要 Suspense 边界（Next.js 静态渲染要求），fallback 提供最小加载文案。
