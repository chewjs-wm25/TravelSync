# curatedInspirations.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/curatedInspirations.tsx`
> - 类型：客户端组件（`"use client"`，灵感合辑与节日活动区域）

## 责任

`curatedInspirations.tsx` 是模块 03 主页的「专题合集与活动」区域，包含两大块：
1. **灵感合辑（Curated Inspirations）**：数据来自 Wikivoyage 主题自动发现（经 `useCollections`），默认 3 个；点「Generate more」（`Compass` 图标）经 `generateMore` 追加下一批，累计至 `MAX_COLLECTIONS_DISPLAYED`（9）个后 `hasMore = false`，按钮切换为「Browse all regions on Wikivoyage」外链（`WIKIVOYAGE_HOME`）。
2. **节日活动（Upcoming Festivals & Events）**：数据来自 Cloudflare D1（经 `useEventFeed`），横向滚动列表，卡片外链官方 url；左右按钮（Prev/Next）驱动平滑滚动。

关键设计：
- 合辑封面在 `imageUrl` 未就绪时用三色轮换占位色块（`COLLECTION_COVER_CLASSES`，按索引取模），就绪后显示真实图片（hover 放大 `group-hover:scale-105`）；
- 活动横向滚动用 `scrollEvents` **动态步进**——步进取「首张卡片宽度 + 当前列间隙」（`getComputedStyle(container).columnGap`），使平滑滚动终点精确落在 snap 吸附点上，避免固定步进滚动结束后被 snap 强制纠正造成跳变；卡片不可测量时兜底 `EVENT_SCROLL_STEP = 320`；
- 降级文案完备：合辑加载失败展示「Couldn't load inspirations...」+ Retry 按钮（`window.location.reload()`）；活动为空提示「No events available yet. Sync them via the DEV page.」（数据由 DEV 页面经 Route API 同步 `parsed_events.json`）；
- 活动卡片含日期徽章、标题、地点、分类标签（来自 D1 中 `parsed_events.json` 的 categories）。

## 分层数据流

```
CuratedInspirations（本组件）
  ├─ useCollections()  → inspirationsService.getCollections / getMoreCollections
  │                      → BL 层 → Wikivoyage 主题自动发现（数据源）
  │                      → sessionStorage 展示状态缓存（hooks 内部）
  └─ useEventFeed()    → discoveryService.getEventFeed
                       → BL 层 → Route API /03_Destination_Discovery_&_Inspiration/api/events → Cloudflare D1
```
本组件不直接调用任何 BL 服务，数据全部经 Presentation hooks 注入，保持纯展示。

## 状态与交互清单

| 状态/行为 | 来源 | 说明 |
| --- | --- | --- |
| `collections` / `collectionsLoading` / `isGenerating` / `hasMore` | `useCollections()` | 合辑列表与追加能力；`hasMore` 控制按钮形态 |
| `generateMore` | `useCollections()` | 追加下一批合辑；进行中按钮禁用（`disabled={isGenerating}`，文案切「Loading…」） |
| `events` / `eventsLoading` | `useEventFeed()` | 节日活动列表与加载态 |
| `eventsScrollerRef` | `useRef<HTMLDivElement>` | 活动横向滚动容器引用 |
| `scrollEvents(±1)` | 组件内部 | 动态步进平滑滚动（见下） |
| 合辑加载失败 | `collectionsLoading === false && collections.length === 0` | 降级文案 + Retry（`window.location.reload()`） |
| 活动为空 | `!eventsLoading && events.length === 0` | 「No events available yet. Sync them via the DEV page.」 |
| 活动列表为空 | `events.length > 0` 才显示 Prev/Next | 无活动时不显示无用的滚动按钮 |

## 渲染结构

```
<section class="space-y-6">
  ├─ <div> 灵感合辑区
  │    ├─ 标题行：h2「Curated Inspirations」
  │    │    ├─ hasMore ? Generate more 按钮（Compass 图标，isGenerating 时禁用）
  │    │    └─ : collections.length > 0 ? 「Browse all regions on Wikivoyage」外链
  │    ├─ 加载/降级文案（collectionsLoading / 空列表 + Retry）
  │    └─ 合辑卡片网格（md:grid-cols-3）：
  │         Link → collectionDetailPath(id)
  │         ├─ 封面：imageUrl 图片（hover:scale-105）或占位色块（COLLECTION_COVER_CLASSES[i % 3]）
  │         ├─ 渐变遮罩（from-gray-800/70）
  │         └─ 底部：标题 / line-clamp-2 副标题 / 成员数徽章 / starCount>0 时 Star 徽章
  └─ <div> 活动区
       ├─ 标题行：h2「Upcoming Festivals & Events」+ events.length>0 时 Prev/Next
       ├─ 加载/空态文案
       └─ 横向滚动列表（ref=eventsScrollerRef, snap-x scroll-smooth）：
            <a href=event.url target=_blank> 卡片（min-w-[300px]）
            ├─ 日期徽章 + 标题
            ├─ 地点
            └─ categories.length>0 时分类标签组
```

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./hooks`（`useCollections`、`useEventFeed`） | 合辑列表（含 `generateMore`）与活动流的 BL 数据封装 |
| `./routes`（`collectionDetailPath`、`WIKIVOYAGE_HOME`） | 合辑详情路径与 Wikivoyage 外链 |
| 外部库：`react`（`useRef`）、`next/link`、`lucide-react`（`Compass`/`Star`） | 滚动容器引用、路由链接与图标 |

## 导出与函数明细

### `COLLECTION_COVER_CLASSES`（文件内常量）
- 类型：常量
- 内容：`["bg-accent-400/20", "bg-secondary-500/20", "bg-primary-500/20"]` —— 合辑封面占位色块（`imageUrl` 未就绪时按索引轮换；就绪后显示真实图片）。

### `EVENT_SCROLL_STEP`（文件内常量）
- 类型：常量
- 内容：`320` —— 兜底滚动步进（首张卡片宽度不可测量时使用）。

### `CuratedInspirations`（默认导出）
- 类型：React 组件
- 传入：无 props
- 传出：渲染（`<section className="space-y-6">`）：
  - **合辑区**：标题行（「Curated Inspirations」+ `hasMore` 时 Generate more 按钮 / 否则 `collections.length > 0` 时的「Browse all regions on Wikivoyage」外链）；`collectionsLoading` 时加载文案；空列表时降级文案 + Retry 按钮；3 列合辑卡片网格（`md:grid-cols-3`）。
  - **活动区**：标题行（「Upcoming Festivals & Events」+ `events.length > 0` 时 Prev/Next 滚动按钮）；`eventsLoading` 时加载文案；空列表提示；横向滚动列表（`flex snap-x scroll-smooth gap-4 overflow-x-auto`）。
- 用处（交互逻辑）：
  - 调用 `useCollections()` 得 `{ collections, isLoading: collectionsLoading, isGenerating, hasMore, generateMore }`；`useEventFeed()` 得 `{ events, isLoading: eventsLoading }`；`eventsScrollerRef = useRef<HTMLDivElement>(null)` 指向横向滚动容器。
  - `scrollEvents(direction: 1 | -1)`：读容器 `firstElementChild`（首张卡片）的 `offsetWidth` 与 `getComputedStyle(container).columnGap`（列间隙，解析失败取 0）计算 `step`；`container.scrollTo({ left: container.scrollLeft + direction * step, behavior: "smooth" })`。
  - 合辑卡片：`Link` 到 `collectionDetailPath(item.id)`；封面（真实图或占位色块）+ `from-gray-800/70` 渐变遮罩 + 标题、`line-clamp-2` 副标题、成员数徽章（`memberCount` 带单复数）、`starCount > 0` 时 Star 徽章（`Star` 实心 + 数量）。
  - 活动卡片：`<a href={event.url} target="_blank" rel="noopener noreferrer">`，`min-w-[300px]`；日期徽章（`bg-primary-500/10 text-primary-500`）、标题、地点；`event.categories.length > 0` 时渲染分类标签组（灰色小圆角标签）。
