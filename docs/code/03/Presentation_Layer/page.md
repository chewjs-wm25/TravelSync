# page.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/page.tsx`
> - 类型：页面组件（客户端组件，`"use client"`）

## 责任

`page.tsx` 是模块 03 的探索主页（Explore Home），作为整个模块的 UI 入口，把四个区域组装成单页 Bento 布局：①搜索与筛选面板（`SearchAndFilter`）、②灵感合辑与节日活动（`CuratedInspirations`）、③兴趣点决策视图（搜索框为空时显示官方品质评级的 Recommended Places，即 `officalQualityRate`；有搜索词时显示「Press Enter to view search results」提示卡片，引导用户去独立搜索页）、④收藏夹抽屉（`FavouriteList`）。

本文件不直接调用任何 BL 层服务，所有数据（筛选候选项、POI 列表、收藏夹）均通过 Presentation hooks（`useSearchAndFilter`、`useFavorites`）获取，UI 组件保持纯展示——严格遵循「Presentation 只通过 Presentation hooks 消费 BL 层」的分层约束。页面自身的交互状态只有三类：抽屉开关 `isDrawerOpen`、加入行程的进行中地点 id `addingToTripId`、以及 3 秒自动消失的 toast 反馈 `tripToast`。

跨模块的「加入行程」操作（目标为模块 02，经 RoutePlannerBridge 调用模块 02 真实导入接口）在本文件完成数据形状转换：把 `PoiItem` 转换为 `SavedItem`——`id` 透传；`placeId` 剥离 `geo-` 前缀（`poi.id.startsWith("geo-")` 时 `slice(4)`）；`thumbnailUrl` 取 `poi.imageUrl`；`experienceType` 透传。转换后经 `useFavorites().addToTrip(item)` 发起，按返回的 `result.success` 决定 toast 文案，异常被 catch 捕获转为错误 toast。

## 分层数据流

```
TravelInspirationPage（本页面，纯组装）
  ├─ useSearchAndFilter() ──→ discoveryService.getFilterOptions / getQualityRatedPois / getSuggestions
  │                             （BL 层 → Route API → Cloudflare D1 / Geoapify）
  ├─ useFavorites() ────────→ favoritesService.getSavedItems / togglePoiFavourite / addToTrip
  │                             （BL 层 → Route API /03_Destination_Discovery_&_Inspiration/api/favourites → D1；addToTrip 经 RoutePlannerBridge 调用模块 02 导入接口）
  │                             （savedItems 派生 favouriteIds 供 Recommended Places 星标；toggleItem 驱动收藏切换）
  └─ 子组件（受控 props 注入）
       ├─ SearchAndFilter      ← 筛选/搜索状态
       ├─ CuratedInspirations  ← 无 props（内部消费 hooks）
       ├─ officalQualityRate   ← pois / isLoading / onAddToTrip / addingToTripId / favouriteIds / onToggleFavourite
       └─ FavouriteList        ← isDrawerOpen / setIsDrawerOpen / typeOptions / activeType / setActiveType
```
本文件只做状态协调与布局组装，不含任何业务计算与直接 BL 调用。

## 状态清单

| 状态 | 类型 | 用途 |
| --- | --- | --- |
| `isDrawerOpen` | `boolean` | 收藏夹抽屉开关（传给 `FavouriteList`） |
| `addingToTripId` | `string \| null` | 正在加入行程的地点 id（POI 卡片按钮 loading 态） |
| `tripToast` | `{ status: "success" \| "error"; message: string } \| null` | 加入行程反馈（3 秒自动清除） |
| `favouriteIds` | `Set<string>` | 已收藏地点 id 集合（`useMemo` 由 `savedItems` 派生，传给 `officalQualityRate` 驱动星标状态） |
| hooks 派生状态 | 见 `useSearchAndFilter` / `useFavorites` | 筛选、POI 列表、收藏夹数据 |

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| 搜索框有内容 | 不渲染 Recommended Places，改渲染「Press Enter」提示卡（结果在独立搜索页） |
| 加入行程成功/失败 | toast 分别显示 `✓ {name} added to your trip` / `Failed to add {name} to trip`，3 秒自动清除 |
| `addToTrip` 抛异常 | `catch` 兜底为错误 toast |
| 收藏夹未打开 | 只显示右下角悬浮按钮（含实时计数 `savedItemsCount`） |
| 收藏数据加载失败 | hooks 内部保持空列表，页面不受影响 |

## 渲染结构

```
<main class="relative min-h-screen bg-gray-100 px-4 py-6 ...">
  └─ <div class="mx-auto max-w-7xl space-y-6 pb-24">
       ├─ ① SearchAndFilter（Bento 卡片，受控注入筛选/搜索状态）
       ├─ ② CuratedInspirations（灵感合辑 + 节日活动）
       ├─ ③ searchQuery.trim()
       │     ├─ 非空 → 「Search Results」提示卡（Press Enter to view...）
       │     └─ 空   → officalQualityRate（Recommended Places）
       └─ ④ FavouriteList（悬浮按钮 + 抽屉）
  └─ tripToast（fixed bottom-8 z-[60]，成功/失败两色）
```

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./searchAndFilter` | 搜索栏 + 多维筛选面板（Bento 卡片，受控组件） |
| `./curatedInspirations` | 灵感合辑（Wikivoyage 主题）与节日活动区域 |
| `./officalQualityRate` | Recommended Places（官方品质评级 POI 网格） |
| `./favouriteList` | 收藏夹悬浮按钮 + 抽屉面板 |
| `./hooks`（`useFavorites`、`useSearchAndFilter`） | 封装 BL 层数据调用的 Presentation hooks |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | 领域类型 `PoiItem`、`SavedItem`（仅记录 import，未打开源文件） |
| 外部库：`react`（`useState`） | 本地 UI 状态管理 |

## 导出与函数明细

### `TravelInspirationPage`（默认导出）
- 类型：React 组件（页面组件）
- 传入：无 props（Next.js App Router 页面）
- 传出：渲染 `<main className="relative min-h-screen bg-gray-100 px-4 py-6 ...">` 布局，自上而下依次为：
  1. `SearchAndFilter`（受控，注入 `activeTab`/`searchQuery`/`suggestions`/`isSuggesting`/`onSelectSuggestion`/`selectedExperienceType`/`selectedState`/`filterOptions` 及对应 setter）；
  2. `CuratedInspirations`（无 props，内部自行消费 hooks）；
  3. POI 决策区——`searchQuery.trim()` 非空时渲染「Search Results」提示卡（`<kbd>Enter</kbd>` 说明 + 提示结果在独立搜索页打开）；为空时渲染 `officalQualityRate`（传入 `pois`/`isLoading`/`onAddToTrip`/`addingToTripId`/`favouriteIds`/`onToggleFavourite`）；
  4. `FavouriteList`（受控，传入 `isDrawerOpen`/`setIsDrawerOpen`/`typeOptions`/`activeType`/`setActiveType`）；
  5. 底部固定居中 toast（`z-[60]`，成功 `bg-[#10b981]` / 失败 `bg-[#ef4444]`）。
- 用处：
  - 调用 `useSearchAndFilter()` 解构出：`activeTab`/`setActiveTab`（场景标签）、`searchQuery`/`setSearchQuery`（搜索词）、`suggestions`/`isSuggesting`/`selectSuggestion`（联想）、`selectedExperienceType`/`selectedState`（筛选下拉）、`filterOptions`（候选项）、`pois`/`isLoading`（Recommended Places 数据）。
  - 调用 `useFavorites()` 解构出 `typeOptions`（收藏体验类型去重列表）、`activeType`/`setActiveType`（收藏夹类型过滤）、`addToTrip`（加入行程桥接）、`toggleItem`（收藏切换）与 `savedItems`（收藏列表）。
  - `favouriteIds`：`useMemo(() => new Set(savedItems.map((item) => item.id)), [savedItems])` 派生已收藏地点 id 集合，与 `toggleItem` 一同传给 `officalQualityRate`——Recommended Places 卡片的星标实心/空心由 `favouriteIds.has(poi.id)` 驱动，收藏切换后随 `savedItems` 即时更新。
  - 维护 `addingToTripId` 与 `tripToast` 两个本地状态，驱动「加入行程」按钮 loading 与全局反馈。
  - 将 hooks 状态以受控 props 形式分发给子组件，页面本身只做组装与状态协调，不包含任何业务计算。

### `handleAddToTrip`（组件内部函数）
- 类型：函数（异步）
- 传入：`poi: PoiItem` —— 被点击的推荐地点（含 `id`/`name`/`imageUrl`/`experienceType`）
- 传出：`Promise<void>`；无返回值，副作用为设置 `addingToTripId`、`tripToast` 与定时清除。
- 用处：
  - 数据转换：构造 `SavedItem`——`placeId` 对 `geo-` 前缀做剥离（`id.startsWith("geo-") ? id.slice("geo-".length) : id`），`thumbnailUrl = poi.imageUrl`，`experienceType` 透传；注释明确「行程条目不归属收藏夹」。
  - 流程：先 `setAddingToTripId(poi.id)` 进入 loading；`await addToTrip(item)` 后按 `result.success` 设 toast（成功 `✓ {name} added to your trip`，失败 `Failed to add {name} to trip`）；`catch` 兜底为错误 toast；`finally` 复位 loading 并 `setTimeout(() => setTripToast(null), 3000)` 自动清除提示。
  - 调用时机：Recommended Places 卡片上的「+ Add to Trip」按钮（经 `officalQualityRate` 的 `onAddToTrip` 回调传入）。
