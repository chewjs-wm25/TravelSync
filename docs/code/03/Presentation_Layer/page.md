# page.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/page.tsx`
> - 类型：页面组件（客户端组件，`"use client"`）

## 责任

`page.tsx` 是模块 03 的探索主页（Explore Home），作为整个模块的 UI 入口，把三个区域组装成单页 Bento 布局：①搜索与筛选面板（`SearchAndFilter`）、②灵感合辑与节日活动（`CuratedInspirations`）、③兴趣点决策视图（搜索框为空时显示官方品质评级的 Recommended Places，即 `officalQualityRate`；有搜索词时显示「Press Enter to view search results」提示卡片，引导用户去独立搜索页）。收藏夹浮层（`FavouriteList`）已不在本页挂载，改由 **Module 03 布局 `layout.tsx` 全局提供**（模块内任一页面可打开收藏夹）。

本文件不直接调用任何 BL 层服务，所有数据（筛选候选项、POI 列表、收藏夹）均通过 Presentation hooks（`useSearchAndFilter`、`useFavorites`）获取，UI 组件保持纯展示——严格遵循「Presentation 只通过 Presentation hooks 消费 BL 层」的分层约束。页面自身的交互状态只有两类：待加入行程的地点候选 `addToTripCandidate`（非空时打开 **AddToTripPicker 目标选择弹窗**）、以及 3 秒自动消失的 toast 反馈 `tripToast`。

跨模块的「加入行程」操作（目标为模块 02，真实导入接口经 BL `AddToTripService` → `RoutePlannerBridge` 调用）在本文件完成数据形状转换：把 `PoiItem` 转换为**加入行程候选** `AddToTripCandidate`——`id` 透传；`placeId` 优先取 `poi.placeId`，缺失时剥离 `geo-` 前缀（`poi.id.startsWith("geo-")` 时 `slice(5)`）；`thumbnailUrl` 取 `poi.imageUrl`；`experienceType` 透传；`poi.lat/lon` 有效则一并携带（坐标缺失由 BL 解析补齐）。转换后打开弹窗，由用户在弹窗内选择目标旅行与行程日期并确认导入（详见 AddToTripPicker.md）。

## 分层数据流

```
TravelInspirationPage（本页面，纯组装）
  ├─ useSearchAndFilter() ──→ discoveryService.getFilterOptions / getQualityRatedPois / getSuggestions
  │                             （BL 层 → Route API → Cloudflare D1 / Geoapify）
  ├─ useFavorites() ────────→ favoritesService.getSavedItems / togglePoiFavourite
  │                             （BL 层 → Route API /03_Destination_Discovery_&_Inspiration/api/favourites → D1）
  │                             （savedItems 派生 favouriteIds 供 Recommended Places 星标；toggleItem 驱动收藏切换，经事件广播同步到全局收藏夹浮层）
  ├─ AddToTripPicker（Add to Trip 点击时打开）
  │                             → listTripsAction / listItinerariesAction（模块 02 只读 server action）
  │                             → addToTripService.addToTripToItinerary（BL：坐标解析 + 目标注入）
  │                             → RoutePlannerBridge.pushItem → POST /02_.../api/itineraries/{itineraryId}/items/import
  └─ 子组件（受控 props 注入）
       ├─ SearchAndFilter      ← 筛选/搜索状态
       ├─ CuratedInspirations  ← 无 props（内部消费 hooks）
       └─ officalQualityRate   ← pois / isLoading / onAddToTrip / favouriteIds / onToggleFavourite
（收藏夹浮层 FavouriteList 由 Module 03 布局 layout.tsx 挂载，本页不渲染）
```
本文件只做状态协调与布局组装，不含任何业务计算与直接 BL 调用。

## 状态清单

| 状态 | 类型 | 用途 |
| --- | --- | --- |
| `addToTripCandidate` | `AddToTripCandidate \| null` | 待加入行程的地点候选（非空时渲染 AddToTripPicker 弹窗） |
| `tripToast` | `{ status: "success" \| "error"; message: string } \| null` | 加入行程成功反馈（3 秒自动清除） |
| `favouriteIds` | `Set<string>` | 已收藏地点 id 集合（`useMemo` 由 `savedItems` 派生，传给 `officalQualityRate` 驱动星标状态） |
| hooks 派生状态 | 见 `useSearchAndFilter` / `useFavorites` | 筛选、POI 列表、收藏夹数据（抽屉开关状态在布局 `layout.tsx`） |

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| 搜索框有内容 | 不渲染 Recommended Places，改渲染「Press Enter」提示卡（结果在独立搜索页） |
| 加入行程成功 | AddToTripPicker 回调 `onAdded` → toast 显示 `✓ {name} added to {trip} · {day}`，3 秒自动清除 |
| 加入行程失败/异常 | 均在 AddToTripPicker 弹窗内展示（含坐标无法解析、服务端拒绝、未登录引导等，见 AddToTripPicker.md） |
| 收藏操作 | Recommended Places 星标切换后经收藏变更事件同步到全局收藏夹浮层（布局 `FavouriteList` 自动刷新） |
| 收藏数据加载失败 | hooks 内部保持空列表，页面不受影响 |

## 渲染结构

```
<main class="relative min-h-screen bg-gray-100 px-4 py-6 ...">
  └─ <div class="mx-auto max-w-7xl space-y-6 pb-24">
       ├─ ① SearchAndFilter（Bento 卡片，受控注入筛选/搜索状态）
       ├─ ② CuratedInspirations（灵感合辑 + 节日活动）
       └─ ③ searchQuery.trim()
             ├─ 非空 → 「Search Results」提示卡（Press Enter to view...）
             └─ 空   → officalQualityRate（Recommended Places）
  ├─ AddToTripPicker（addToTripCandidate 非空时渲染；fixed 全屏遮罩 + 居中弹窗，z-[80]）
  └─ tripToast（fixed bottom-8 z-[60]，成功两色）
（收藏夹浮层由 Module 03 布局 layout.tsx 渲染于本页面之后，fixed 定位覆盖全视口）
```

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./searchAndFilter` | 搜索栏 + 多维筛选面板（Bento 卡片，受控组件） |
| `./curatedInspirations` | 灵感合辑（Wikivoyage 主题）与节日活动区域 |
| `./officalQualityRate` | Recommended Places（官方品质评级 POI 网格） |
| `./AddToTripPicker` | 加入行程目标选择弹窗（+ `AddToTripCandidate` 类型） |
| `./hooks`（`useFavorites`、`useSearchAndFilter`） | 封装 BL 层数据调用的 Presentation hooks |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | 领域类型 `PoiItem`（仅记录 import，未打开源文件） |
| 外部库：`react`（`useState`/`useRef`） | 本地 UI 状态管理与 toast 定时器 |

## 导出与函数明细

### `TravelInspirationPage`（默认导出）
- 类型：React 组件（页面组件）
- 传入：无 props（Next.js App Router 页面）
- 传出：渲染 `<main className="relative min-h-screen bg-gray-100 px-4 py-6 ...">` 布局，自上而下依次为：
  1. `SearchAndFilter`（受控，注入 `activeTab`/`searchQuery`/`suggestions`/`isSuggesting`/`onSelectSuggestion`/`selectedExperienceType`/`selectedState`/`filterOptions` 及对应 setter）；
  2. `CuratedInspirations`（无 props，内部自行消费 hooks）；
  3. POI 决策区——`searchQuery.trim()` 非空时渲染「Search Results」提示卡（`<kbd>Enter</kbd>` 说明 + 提示结果在独立搜索页打开）；为空时渲染 `officalQualityRate`（传入 `pois`/`isLoading`/`onAddToTrip`/`favouriteIds`/`onToggleFavourite`）；
  4. `AddToTripPicker`（`addToTripCandidate` 非空时渲染）；
  5. 底部固定居中 toast（`z-[60]`，成功 `bg-[#10b981]`）。
- 用处：
  - 调用 `useSearchAndFilter()` 解构出：`activeTab`/`setActiveTab`（场景标签）、`searchQuery`/`setSearchQuery`（搜索词）、`suggestions`/`isSuggesting`/`selectSuggestion`（联想）、`selectedExperienceType`/`selectedState`（筛选下拉）、`filterOptions`（候选项）、`pois`/`isLoading`（Recommended Places 数据）。
  - 调用 `useFavorites()` 解构出 `toggleItem`（收藏切换）与 `savedItems`（收藏列表）。
  - `favouriteIds`：`useMemo(() => new Set(savedItems.map((item) => item.id)), [savedItems])` 派生已收藏地点 id 集合，与 `toggleItem` 一同传给 `officalQualityRate`——Recommended Places 卡片的星标实心/空心由 `favouriteIds.has(poi.id)` 驱动；`toggleItem` 成功后经收藏变更事件广播（见 hooks.md），本页 `savedItems` 与全局收藏夹浮层同步刷新，星标状态随之即时更新。
  - 维护 `addToTripCandidate`、`tripToast`（含定时清除 ref）两个本地状态，驱动「加入行程」弹窗与成功反馈。
  - 将 hooks 状态以受控 props 形式分发给子组件，页面本身只做组装与状态协调，不包含任何业务计算。

### `handleAddToTrip`（组件内部函数）
- 类型：函数
- 传入：`poi: PoiItem` —— 被点击的推荐地点（含 `id`/`name`/`imageUrl`/`experienceType`，官方评级来源可能有 `lat`/`lon`）
- 传出：无返回值，副作用为 `setAddToTripCandidate({...})`（打开 AddToTripPicker 弹窗）。
- 用处：
  - 数据转换：构造 `AddToTripCandidate`——`placeId` 优先取 `poi.placeId`，缺失时对 `geo-` 前缀剥离（`id.startsWith("geo-") ? id.slice("geo-".length) : id`）；`thumbnailUrl = poi.imageUrl`、`experienceType` 透传；`poi.lat/lon` 有效则一并携带（缺失时由 BL 解析补齐，见 AddToTripService.md）；注释明确「行程条目不归属收藏夹」。
  - 流程：打开弹窗后由用户选择目标旅行与行程日期并确认导入；成功经 `AddToTripPicker` 的 `onAdded` 回调显示 toast「✓ {name} added to {trip} · {day}」（`showTripToast` 自动 3 秒清除）。
  - 调用时机：Recommended Places 卡片上的「+ Add to Trip」按钮（经 `officalQualityRate` 的 `onAddToTrip` 回调传入）。
