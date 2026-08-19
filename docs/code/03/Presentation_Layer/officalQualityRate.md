# officalQualityRate.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/officalQualityRate.tsx`
> - 类型：客户端组件（`"use client"`，Recommended Places 兴趣点决策视图）

## 责任

`officalQualityRate.tsx` 是模块 03 主页的「兴趣点（POI）决策视图」——Recommended Places 网格：展示官方品质评级地点（数据来自 `officalQualityRating_hardcode.json` 同步至 Cloudflare D1，经 Presentation hooks `useSearchAndFilter` 的 `pois` 传入），每页 8 个（`PAGE_SIZE = 8`，4 列 × 2 行）前端分页。

关键设计：
- 整卡为 `<a>` 外链——点击新标签页打开 Google Maps（`googleMapsUrl(`${poi.name} ${poi.formatted ?? ""}`.trim())`，按公司名+地址搜索，`target="_blank"` + `rel="noopener noreferrer"`）；
- 图片经统一图片链路 `usePlaceImages` 懒加载（Wikivoyage 条目配图 → Wikipedia 条目配图 → Wikimedia Commons Geosearch 按经纬度 → Mapillary 兜底，马来西亚限定），**仅当前页取图**（`visiblePois`），翻页/重复浏览走内部缓存，不重复消耗免费 API 额度；
- 图片底部叠加 `PlaceImageAttribution`（开源协议合规：CC BY-SA 等要求保留原作者与许可声明）；
- 官方品质徽章（Platinum/Gold/Silver，含星形 SVG）叠加在图片左上角（`bg-gray-800/90` 半透明底 + `backdrop-blur-sm`）；
- 组件接受可选的 `onAddToTrip` 回调（模块 02 桥接），传入后卡片显示「+ Add to Trip」按钮并带 loading 态（`addingToTripId`）；
- 分页为纯前端 UI 行为（状态内聚于组件），数据/筛选变化时 `useEffect` 回到第一页；`safePage` 防越界。

## 分层数据流

```
officalQualityRate（本组件）
  ├─ props.pois ← 父级 page.tsx ← useSearchAndFilter().pois
  │               ← discoveryService.getQualityRatedPois → Route API /official-quality-ratings → Cloudflare D1
  ├─ usePlaceImages(visiblePois) → discoveryService.getPlaceImage（图片查询链 + 缓存）
  └─ 卡片外链 → routes.googleMapsUrl(name + formatted) → Google Maps 新标签页
```

## 状态与交互清单

| 状态/事件 | 说明 |
| --- | --- |
| `page` | 当前页码（默认 1）；`pois` 变化时 `useEffect` 回第一页 |
| `totalPages` / `safePage` | `Math.max(1, ceil(len / PAGE_SIZE))`；`safePage` 防越界 |
| `visiblePois` | 当前页切片（仅当前页取图，减少并发） |
| Prev / Next 点击 | `setPage(±1)`，边界禁用（`safePage <= 1` / `>= totalPages`） |
| 数字页码点击 | `setPage(n)`；当前页高亮 |
| 卡片点击 | 整卡 `<a>` 新标签页打开 Google Maps（`target="_blank"` + `rel="noopener noreferrer"`） |
| Add to Trip 点击 | `preventDefault` + `stopPropagation` + `onAddToTrip(poi)`（`addingToTripId === poi.id` 时禁用） |

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| `isLoading` | 网格显示「Loading places...」（`col-span-full`） |
| 数据为空（非加载） | 「No officially rated places available yet.」 |
| 单页数据 | 不显示页码指示与分页控件（`totalPages <= 1`） |
| 无图 | `ImageOff` 图标占位 |
| 无 `onAddToTrip` | 不渲染 Add to Trip 按钮（模块 02 桥接未接时安全降级） |
| `pois` 变化 | `useEffect` 自动回到第一页 |
| `page` 越界 | `safePage = Math.min(page, totalPages)` 钳制 |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./routes`（`googleMapsUrl`） | 卡片点击的 Google Maps 搜索链接构造 |
| `./hooks`（`usePlaceImages`） | 当前页地点图片懒加载 |
| `./placeImageAttribution` | 图片作者与许可署名展示 |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | `PoiItem`（仅记录 import，未打开源文件） |
| 外部库：`react`（`useEffect`/`useState`）、`lucide-react`（`ImageOff`） | 分页状态与无图图标 |

## 导出与函数明细

### `PAGE_SIZE`（文件内常量）
- 类型：常量
- 内容：`8` —— 每页展示的地点数（4 列网格 × 2 行）。

### `OfficalQualityRateProps`（接口）
- 类型：常量（TypeScript 接口，命名沿用代码原文）
- 内容：`{ pois: PoiItem[]; isLoading?: boolean; onAddToTrip?: (poi: PoiItem) => void; addingToTripId?: string | null }` —— `onAddToTrip` 传入后卡片显示 Add to Trip 按钮；`addingToTripId` 驱动按钮 loading 态（`addingToTripId === poi.id` 时禁用并显示「Adding to trip…」）。

### `BADGE_LABEL`（文件内常量）
- 类型：常量
- 内容：`Record<NonNullable<PoiItem["qualityBadge"]>, string>`：`platinum → "Platinum"`、`gold → "Gold"`、`silver → "Silver"` —— 品质徽章等级 → 展示文案（纯 UI 映射）。

### `officalQualityRate`（默认导出，命名沿用代码原文）
- 类型：React 组件
- 传入：`OfficalQualityRateProps`（见上）
- 传出：渲染（`<section>`）：
  - 标题行：「Recommended Places」+ `totalPages > 1` 时的页码指示（`Page {safePage} / {totalPages}`）；
  - 4 列 POI 卡片网格（`md:grid-cols-2 lg:grid-cols-4`）；`isLoading` 时「Loading places...」占整行、`!isLoading && pois.length === 0` 时「No officially rated places available yet.」；
  - 分页控件（`totalPages > 1` 时）：Prev / 数字页码 / Next（边界禁用）。
- 用处（交互逻辑与状态）：
  - 分页：`page` 状态（默认 1）；`totalPages = Math.max(1, Math.ceil(pois.length / PAGE_SIZE))`；`useEffect(() => setPage(1), [pois])` 数据/筛选变化回第一页；`safePage = Math.min(page, totalPages)` 防越界；`visiblePois = pois.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE)`。
  - `images = usePlaceImages(visiblePois)`：`images[poi.id]?.url` 有则渲染 `<img>`（`object-cover`），无则 `ImageOff` 图标（`h-10 w-10`）。
  - 卡片内容：图片区（署名 + 品质徽章 + 真实图/无图图标）+ 信息区——名称、地址（`poi.formatted`，`line-clamp-2`）、电话（📞 `poi.phone`）、评级有效期（📅 Valid `poi.ratingDuration`）、`onAddToTrip` 存在时的「+ Add to Trip」按钮（`preventDefault` + `stopPropagation` 阻止外链跳转后回调 `onAddToTrip(poi)`）。
  - 分页控件：Prev 点击 `setPage(p => Math.max(1, p-1))`（`safePage <= 1` 禁用）、Next 点击 `setPage(p => Math.min(totalPages, p+1))`（`safePage >= totalPages` 禁用）、数字按钮 `setPage(n)`（当前页 `bg-primary-500 text-white` 高亮）。
