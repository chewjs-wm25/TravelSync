# 模块 03：目的地探索与灵感推荐 — 组件数据设计

> 本文档基于 `app/03_Destination_Discovery_&_Inspiration/` 下的 UI 代码与
> `docs/requirement/03_Destination_Discovery_&_Inspiration.md` 需求文档整理，
> 记录该模块中每个组件所需的数据（变量名称、描述、类型）。
> 当前 UI 中多数数据为硬编码占位（mock），下表标注了其对应的真实数据字段来源。

---

## 1. page.tsx — TravelInspirationPage（页面容器）

负责组装各子组件并管理模块级共享状态。

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `activeTab` | 当前选中的室内外场景分类标签（"indoor" / "outdoor" / "all"），传递给 SearchAndFilter 控制高亮 | `activeType`（`"indoor" \| "outdoor" \| "all"`） |
| `setActiveTab` | 更新 `activeTab` 的 setter，由 SearchAndFilter 的标签按钮调用 | `React.Dispatch<React.SetStateAction<activeType>>` |
| `isDrawerOpen` | 收藏抽屉（FavouriteList）当前是否打开，控制悬浮按钮显示与抽屉滑入滑出 | `boolean` |
| `setIsDrawerOpen` | 更新 `isDrawerOpen` 的 setter | `React.Dispatch<React.SetStateAction<boolean>>` |

---

## 2. searchAndFilter.tsx — SearchAndFilter（智能搜索与多维筛选）

### Props（来自父组件 page.tsx）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `activeTab` | 当前选中的室内外场景标签，决定按钮高亮样式 | `activeType` |
| `setActiveTab` | 点击 Indoor / Outdoor / All 标签时更新场景分类 | `React.Dispatch<React.SetStateAction<activeType>>` |

### 组件内部 UI 所需数据（当前为硬编码，应由 API 提供）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `searchQuery` | 用户在搜索栏输入的关键词（支持地点、地标、主题），当前输入框无受控状态，需接入后驱动 POI 列表过滤 | `string` |
| `experienceTypeOptions` | 体验类型筛选下拉的候选项，如 Cultural Heritage、Nature & Adventure | `string[]` |
| `selectedExperienceType` | 用户当前选中的体验类型（文化 / 自然探险等） | `string` |
| `qualityRatingOptions` | 官方品质认证下拉候选项，如 Platinum Certified、Gold Certified（对应需求中的白金、金、银级） | `string[]` |
| `selectedQualityRating` | 用户当前选中的官方品质评级 | `string` |
| `isMuslimFriendly` | 是否勾选"穆斯林友好设施"筛选条件（checkbox 当前无受控状态） | `boolean` |
| `venueScene` | 室内外场景分类枚举，供标签页切换使用 | `"indoor" \| "outdoor" \| "all"`（即 `activeType`） |

> 备注：需求要求"支持按体验类型、官方品质认证、文化及特定需求（如穆斯林友好设施）等多维度精确筛选"，以上筛选条件最终需组合成过滤参数传给 POI 查询接口。

---

## 3. curatedInspirations.tsx — CuratedInspirations（灵感合辑与节日活动推荐）

### 主题合辑轮播（Curated Collections）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `collections` | 灵感合辑列表，如"历史街区漫步指南"、"本地美食推荐"、"艺术与博物馆巡游" | `Collection[]` |
| `collections[].id` | 合辑唯一标识，用于点击跳转合辑详情 | `string` |
| `collections[].title` | 合辑标题，如 "Historic District Walking Guide" | `string` |
| `collections[].img` | 合辑封面图片（当前为 Tailwind 背景色类名占位，真实应为图片 URL 或资源类名） | `string`（当前为 `bg-accent-400/20` 等类名，真实数据为 `imageUrl: string`） |

### 节日/活动卡片（Festivals & Events）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `events` | 根据出行时间检索到的官方节日、文化活动与赛事列表 | `EventItem[]` |
| `events[].id` | 活动唯一标识 | `string` |
| `events[].name` | 活动名称，如 "Annual City Lantern Festival" | `string` |
| `events[].dateRange` | 活动举办日期区间（UI 显示为 "Sep 15 - Sep 20"，需求要求按出行时间自动检索） | `string`（如 `"2025-09-15 ~ 2025-09-20"`） |
| `events[].description` | 活动简介文案 | `string` |
| `events[].venue` | 活动举办场地/地点（当前未展示，供周边推荐与联动使用） | `string` |

### 周边推荐（Nearby Recommendations，活动联动住宿与餐饮）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `nearbyRecommendations` | 活动场地周边的优质住宿与餐饮推荐列表 | `NearbyPlace[]` |
| `nearbyRecommendations[].name` | 周边地点名称，如 "Plaza Hotel"、"Night Market Eats" | `string` |
| `nearbyRecommendations[].category` | 周边地点类别（住宿 🏨 / 餐饮 🍜） | `"hotel" \| "restaurant" \| "food"` |
| `nearbyRecommendations[].distanceKm` | 距活动场地的距离（UI 显示为 0.2km / 0.1km） | `number` |

---

## 4. upcomingFestivalsEvent.tsx — UpcomingFestivalsEvent（POI 深度决策卡片）

「Recommended Places」区域渲染 POI 决策卡片网格（当前为 4 张占位卡）。

### POI 卡片列表

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `pois` | 推荐地点列表，供卡片网格渲染 | `PoiItem[]` |
| `pois[].id` | 地点唯一标识 | `string` |
| `pois[].name` | 地点名称，如 "Grand National Museum" | `string` |
| `pois[].imageUrl` | 地点图片（当前为灰色占位块） | `string` |

### 官方品质徽章（需求：白金、金、银级认证）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `pois[].qualityBadge` | 官方机构授予的品质评级徽章等级（当前硬编码 "Platinum"） | `"platinum" \| "gold" \| "silver"` |
| `pois[].badgeLabel` | 徽章展示文案（如 "Platinum"），可由 `qualityBadge` 派生 | `string` |

### 收藏与营业状态

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `pois[].isFavourite` | 该地点是否已被收藏（卡片右上角收藏按钮的填充/高亮状态，当前无受控状态） | `boolean` |
| `pois[].isOpenNow` | 当前营业状态，true 显示绿色 "Open Now" 圆点与文案（需求：当前营业状态提醒） | `boolean` |
| `pois[].openStatusText` | 营业状态文案（如 "Open Now" / "Closed"），可由 `isOpenNow` 派生 | `string` |

### 决策辅助信息（需求：建议停留时长、门票、最佳游玩时段）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `pois[].suggestedDuration` | 建议停留时长（UI 显示 "⏱️ 2-3 hrs"） | `string`（如 `"2-3 hrs"`，或 `{ min: number; max: number }`） |
| `pois[].ticketPrice` | 门票价格（UI 显示 "🎟️ $15"，免费地点可为 "Free"） | `string`（如 `"$15"`） |
| `pois[].bestVisitTime` | 最佳游玩时段（需求字段，当前 UI 未展示，供后续补充） | `string`（如 `"Morning 9am-11am"`） |

### 设施排雷提示（需求：无障碍设施等基础设施状态）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `pois[].facilities` | 设施标签列表，如无障碍通道、停车情况等 | `FacilityTag[]` |
| `pois[].facilities[].type` | 设施类型标识（如 `"wheelchair"`、`"parking"`），决定图标与配色 | `string` |
| `pois[].facilities[].label` | 设施标签文案，如 "Wheelchair Accessible"、"Limited Parking" | `string` |
| `pois[].facilities[].status` | 设施状态（可用 / 受限），用于区分友好提示与警告样式 | `"available" \| "limited" \| "unavailable"` |

---

## 5. favouriteList.tsx — FavouriteList（收藏夹 / 愿望清单抽屉）

### Props（来自父组件 page.tsx）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `isDrawerOpen` | 抽屉是否打开，控制悬浮按钮显隐与抽屉 `translate-x` 动画 | `boolean` |
| `setIsDrawerOpen` | 打开/关闭抽屉的 setter（悬浮按钮与关闭按钮调用） | `React.Dispatch<React.SetStateAction<boolean>>` |

### 收藏项目列表（需求：自定义收藏文件夹管理）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `savedItems` | 已收藏的地点/活动列表（抽屉内逐条渲染，当前硬编码 3 条） | `SavedItem[]` |
| `savedItems[].id` | 收藏条目唯一标识 | `string` |
| `savedItems[].name` | 收藏条目名称，如 "Grand National Museum" | `string` |
| `savedItems[].folder` | 所属自定义收藏文件夹名，如 "Cultural Trip"、"Events"、"Food" | `string` |
| `savedItems[].thumbnailUrl` | 条目缩略图（当前为灰色占位块 `h-16 w-16`） | `string` |
| `folderOptions` | 用户自定义收藏文件夹列表（需求：系统性的分类浏览与管理） | `string[]` |

### 计数与批量推送（需求：行程备选池一键批量推送到路线规划模块）

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `savedItemsCount` | 收藏总数，悬浮按钮显示 "Bucket List (3)" | `number` |
| `isDeleting` / `deletingId` | 删除条目时的加载状态与目标条目 id（删除按钮当前无交互，预留） | `boolean` / `string \| null` |
| `pushToRoutePlanner` | 将全部（或选中）收藏批量推送到路线规划模块的动作，底部按钮显示 "Export 3 items to your itinerary planner" | `() => void`（动作函数） |
| `pushedCount` | 本次推送的条目数量（按钮下方文案 "Export 3 items" 使用） | `number` |

---

## 6. bucketList.tsx — BucketList（行程备选池，与 FavouriteList 结构一致）

该组件与 `favouriteList.tsx` 代码结构完全相同（悬浮按钮 + 抽屉 + 收藏列表 + 批量推送），
当前未被 `page.tsx` 引用，可视为备选池的独立实现或 FavouriteList 的替代版本，所需数据一致：

| 变量名称 | 描述 | 类型 |
| --- | --- | --- |
| `isDrawerOpen` | 抽屉是否打开（Props） | `boolean` |
| `setIsDrawerOpen` | 打开/关闭抽屉的 setter（Props） | `React.Dispatch<React.SetStateAction<boolean>>` |
| `savedItems` | 暂存箱中的备选地点列表（需求：探索阶段自由囤积大量备选地点） | `SavedItem[]` |
| `savedItems[].id` | 备选条目唯一标识 | `string` |
| `savedItems[].name` | 备选地点名称 | `string` |
| `savedItems[].folder` | 所属收藏文件夹名 | `string` |
| `savedItems[].thumbnailUrl` | 条目缩略图 | `string` |
| `savedItemsCount` | 备选池条目总数（悬浮按钮 "Bucket List (3)"） | `number` |
| `pushToRoutePlanner` | 一键批量推送备选地点到路线规划模块的动作 | `() => void` |

---

## 共享类型汇总（跨组件复用）

| 类型名称 | 描述 | 定义 |
| --- | --- | --- |
| `activeType` | 室内外场景分类，由 searchAndFilter.tsx 导出 | `"indoor" \| "outdoor" \| "all"` |
| `Collection` | 灵感合辑条目 | `{ id: string; title: string; imageUrl: string }` |
| `EventItem` | 节日/活动条目 | `{ id: string; name: string; dateRange: string; description: string; venue?: string }` |
| `NearbyPlace` | 活动周边住宿/餐饮推荐 | `{ name: string; category: "hotel" \| "restaurant" \| "food"; distanceKm: number }` |
| `PoiItem` | 地点决策卡片条目 | `{ id: string; name: string; imageUrl: string; qualityBadge: "platinum" \| "gold" \| "silver"; isFavourite: boolean; isOpenNow: boolean; suggestedDuration: string; ticketPrice: string; bestVisitTime?: string; facilities: FacilityTag[] }` |
| `FacilityTag` | 设施状态标签 | `{ type: string; label: string; status: "available" \| "limited" \| "unavailable" }` |
| `SavedItem` | 收藏/备选条目 | `{ id: string; name: string; folder: string; thumbnailUrl: string }` |
