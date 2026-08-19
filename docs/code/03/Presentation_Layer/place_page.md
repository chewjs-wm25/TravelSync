# place/[placeId]/page.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/place/[placeId]/page.tsx`
> - 类型：页面组件（客户端组件，`"use client"`）

## 责任

地点详情页：按动态路由参数 `placeId` 重查 Geoapify（携带搜索词 `q`，保证详情与来源搜索结果一致），展示地点的完整详情。数据获取全部委托 BL 层 `discoveryService.getPlaceDetail(placeId, q)`，本文件不触碰 BL 以下任何模块。

页面同时承担三块展示增强：①`useFavorites` 提供收藏切换（星星按钮，`favouriteIds` 派生填充态与 aria-label）；②`usePlaceImages` 懒加载地点大图（统一链路 Wikivoyage → Wikipedia 条目配图 → Commons Geosearch → Mapillary 兜底，马来西亚限定）；③有 `place.qualityBadge` 时展示官方品质徽章（Platinum/Gold/Silver），图片底部叠加 `PlaceImageAttribution` 满足开源协议署名要求。

页面状态机清晰：加载中（`isLoading`）→ 成功（渲染详情卡）/ 失败（错误提示「Failed to load place details. Please try again.」）/ 无数据（「未找到」提示，提示可能被移除或链接过期）。返回导航提供「Back to Search Results」（`q.trim()` 非空时回 `searchPagePath(q)` 保留搜索上下文，否则回 `SEARCH_PAGE`）与「Back to Explore」两个入口。`useSearchParams` 的使用要求页面用 `Suspense` 包裹内部组件。

## 分层数据流

```
PlaceDetailView（本页核心组件）
  ├─ discoveryService.getPlaceDetail(placeId, q) → Route API /api/discovery/geocode?type=search → Geoapify
  ├─ useFavorites()     → favoritesService.getSavedItems / togglePoiFavourite → Route API /favorites → D1
  └─ usePlaceImages([place]) → discoveryService.getPlaceImage（图片查询链 + 缓存，马来西亚限定）
```

## 状态清单

| 状态 | 来源 | 说明 |
| --- | --- | --- |
| `placeId` / `q` | `useParams` / `useSearchParams` | 动态路由参数与携带的搜索词 |
| `place` | `useState<PlaceDetail \| null>` | 详情数据；null 且无 error 时显示「未找到」 |
| `isLoading` | `useState<boolean>` | 请求进行中（`finally` 置 false） |
| `error` | `useState<string \| null>` | 请求失败错误文案 |
| `savedItems` / `toggleItem` / `favouriteIds` | `useFavorites` + `useMemo` | 收藏状态合并展示 |
| `images` | `usePlaceImages(place ? [place] : [])` | 单地点大图映射 |

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| 请求失败 | 错误卡「Failed to load place details. Please try again.」 |
| 返回无数据（`place === null` 且无 error） | 未找到卡「This place could not be found.」+ 可能被移除/链接过期提示 |
| 图片加载中/无图 | 图片区显示 `ImageOff` 图标（加载中先显示渐变占位底） |
| 品质徽章缺失 | 徽章条件渲染（仅 `place.qualityBadge` 存在时显示） |
| 无 `q` 参数 | 返回按钮回 `SEARCH_PAGE`（不带搜索词）；有 `q` 则回 `searchPagePath(q)` |
| 路由切换竞态 | `useEffect` 内 `cancelled` 标志阻止过期结果覆盖 |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../../routes`（`MODULE_03_HOME`、`SEARCH_PAGE`、`searchPagePath`） | 返回导航路径构造 |
| `../../favouriteList`（`StarIcon`） | 收藏星星图标 |
| `../../hooks`（`useFavorites`、`usePlaceImages`） | 收藏状态与图片懒加载 |
| `../../placeImageAttribution` | 图片作者与许可署名展示 |
| `../../../../business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService` | `discoveryService.getPlaceDetail`（仅记录 import，未打开源文件） |
| `../../../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | `PlaceDetail`（仅记录 import） |
| 外部库：`react`、`next/navigation`（`useParams`/`useSearchParams`）、`next/link`、`lucide-react`（`ImageOff`） | UI 与路由能力 |

## 导出与函数明细

### `BADGE_LABEL`（文件内常量）
- 类型：常量
- 内容：`Record<NonNullable<PlaceDetail["qualityBadge"]>, string>` 的纯 UI 映射：`platinum → "Platinum"`、`gold → "Gold"`、`silver → "Silver"`。

### `PlaceDetailView`（文件内组件）
- 类型：React 组件
- 传入：无 props；依赖 `useParams<{ placeId: string }>()` 与 `useSearchParams()`（读 `q`）。
- 传出：渲染（`<div className="space-y-6">`）：
  - 返回导航：两个圆角胶囊按钮（Back to Search Results / Back to Explore）；
  - 加载态：`Loading place…`；
  - 错误态：错误卡（灰底圆角白卡 + 错误文案）；
  - 未找到态：「This place could not be found.」+ 提示可能被移除或链接过期；
  - 详情卡：左右分栏（`md:flex-row`）——左：图片区（`md:w-2/5`，含品质徽章、收藏按钮、真实图片或 `ImageOff` 图标、`PlaceImageAttribution` 署名）；右：详情信息（名称、格式化地址、体验类型/分类/结果类型标签、详情字段网格、数据来源说明）。
- 用处（状态与数据流）：
  - `placeId = params.placeId ?? ""`、`q = searchParams.get("q") ?? ""`。
  - `useEffect` 依赖 `[placeId, q]` 调 `discoveryService.getPlaceDetail(placeId, q)`：成功 `setPlace(result)`；失败 `setError("Failed to load place details. Please try again.")`；`finally` 置 `isLoading = false`；`cancelled` 标志防止路由切换竞态。
  - `useFavorites()` 取 `savedItems`/`toggleItem`；`favouriteIds = useMemo(new Set(savedItems.map(i => i.id)))`。
  - `images = usePlaceImages(place ? [place] : [])`——仅详情加载完成后取单地点大图。
  - 收藏按钮：`onClick={() => toggleItem(place)}`（此处无嵌套链接，无需阻止冒泡），`aria-label` 随收藏态切换「Add/Remove {name} from/to favourites」。
  - 详情字段经内部组件 `DetailField` 渲染 10 项：`addressLine1`（Address）、`addressLine2`（Area）、`city`（City）、`state`（State）、`country`（Country）、坐标（`lat.toFixed(5), lon.toFixed(5)`）、场景（`scene === "indoor" ? "Indoor" : "Outdoor"`）、`suggestedDuration`（Suggested Duration，标注 estimated）、`ticketPrice`（Ticket Price，标注 estimated）、`isOpenNow`（Opening Status：Open Now / Closed）。仅字段存在时才渲染对应卡片（坐标、场景、时长、票价、营业状态为必渲染项）。
  - 底部来源说明：「Details sourced from Geoapify Geocoding API. Duration, ticket price and opening status are estimates.」。

### `DetailField`
- 类型：React 组件（纯 UI 展示）
- 传入：props `{ label: string; value: string }` —— 字段名与字段值
- 传出：渲染灰底圆角字段卡（`rounded-2xl bg-gray-100 p-4`）：小字灰色 label + 加粗深色 value。
- 用处：详情信息卡片中每个字段行的统一展示单元，无任何业务逻辑。

### `PlaceDetailPage`（默认导出）
- 类型：React 组件（页面入口）
- 传入：无 props
- 传出：渲染 `<Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>` 包裹的 `<PlaceDetailView />`。
- 用处：`useSearchParams` 需要 Suspense 边界（Next.js 静态渲染要求）。
