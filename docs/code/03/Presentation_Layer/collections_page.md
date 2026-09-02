# collections/[collectionId]/page.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/collections/[collectionId]/page.tsx`
> - 类型：页面组件（客户端组件，`"use client"`）

## 责任

灵感合辑详情页：按动态路由参数 `collectionId` 展示 Wikivoyage 自动发现主题（InspirationsService）的成员目的地——Hero 封面（标题/副标题/成员数/Wikivoyage Star 数）、成员目的地网格（缩略图、导语 extract、Star 徽章、两个行动按钮）、附近灵感推荐区（geosearch 附近目的地，按距离排序）。数据全部经 Presentation hooks（`useCollectionDetail`、`useNearbyInspirations`）获取，本文件不触碰 BL 以下模块。

关键设计：
- `normalizeRouteParam` 幂等 URL 解码动态段参数（最多两轮 `decodeURIComponent`，兼容未编码 / 单次编码 / 双编码形态，不同环境下动态段参数可能保留编码或已解码）。
- 附近灵感区默认选中**第一个有坐标的成员**（`selectedItemId` 状态 + `useMemo` 派生 `selectedItem`），点击成员卡上的 Nearby 按钮切换选中成员；无坐标成员不显示该按钮；`useNearbyInspirations` 的结果携带来源坐标键，成员切换期间由派生逻辑显示加载过渡态。
- 行动闭环：成员卡「Search in TravelSync」跳模块搜索页（站内可继续收藏/加行程），「Read guide」外链 Wikivoyage 完整指南（`target="_blank"` + `rel="noopener noreferrer"`）。
- 页脚对 Wikivoyage 内容做 CC BY-SA 4.0 来源署名（外链 `WIKIVOYAGE_HOME`）。
- 错误态（含限流）提供「Try again」刷新按钮（`window.location.reload()`）。

## 分层数据流

```
CollectionDetailView（本页核心组件）
  ├─ useCollectionDetail(collectionId)     → inspirationsService.getCollectionDetail
  │                                         → BL 层 → Wikivoyage 主题聚合（跨会话直连时按需聚合）
  └─ useNearbyInspirations(lat, lon)       → inspirationsService.getNearbyInspirations
                                            → BL 层 → Wikivoyage geosearch（马来西亚限定）
```
路由参数经 `normalizeRouteParam` 幂等解码后再进入 hooks，保证跨环境正确性。

## 状态清单

| 状态 | 来源 | 说明 |
| --- | --- | --- |
| `collectionId` | `normalizeRouteParam(params.collectionId ?? "")` | 幂等解码后的合辑标识 |
| `detail` / `isLoading` / `error` | `useCollectionDetail(collectionId)` | 合辑详情三态（错误含限流，提供 Try again） |
| `selectedItemId` | `useState<string \| null>` | 当前查看附近推荐的成员 id（默认第一个有坐标成员） |
| `itemsWithCoords` / `selectedItem` | `useMemo` 派生 | 有坐标成员过滤与当前选中成员解析 |
| `nearby` / `nearbyLoading` | `useNearbyInspirations(selectedItem?.lat, selectedItem?.lon)` | 附近灵感与加载态 |

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| 合辑加载失败 / 限流 | 错误卡 + 「Try again」按钮（`window.location.reload()`） |
| 无 `detail`（未找到） | 未找到卡「This collection could not be found.」+ 可能被移除/链接过期提示 |
| 成员无坐标 | 不显示 Nearby 切换按钮；附近灵感区仅在 `selectedItem` 存在时渲染 |
| 附近推荐为空 | 「No nearby destinations found.」；加载中显示「Loading nearby destinations...」 |
| 成员切换过渡 | `useNearbyInspirations` 的 coordKey 派生逻辑显示加载态 |
| 图片缺失 | 成员卡 / 附近卡显示 `ImageOff` 图标 |
| 封面缺失 | Hero 用渐变色块占位（`from-primary-500/20 ...`） |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../../hooks`（`useCollectionDetail`、`useNearbyInspirations`） | 合辑详情与附近灵感的 BL 数据封装 |
| `../../routes`（`MODULE_03_HOME`、`searchPagePath`、`WIKIVOYAGE_HOME`） | 路由与 Wikivoyage 外链常量 |
| `../../safeUrl` | 外部 URL 协议白名单（`safeHttpUrl`，所有 `<img src>` 与外部 `<a href>` 渲染前过滤，防存储型 XSS） |
| 外部库：`react`、`next/navigation`（`useParams`）、`next/link`、`lucide-react`（`Compass`/`ExternalLink`/`ImageOff`/`Search`/`Star`） | UI 与路由能力 |

## 导出与函数明细

### `formatDistance`
- 类型：函数
- 传入：`meters: number` —— 距离（米）
- 传出：`string` —— 小于 1000m 显示 `Math.round` 的整米（如 `850m`），否则保留一位小数的公里（如 `1.5km`）。
- 用处：附近灵感卡片右上角距离标签的格式化工具。

### `normalizeRouteParam`
- 类型：函数
- 传入：`raw: string` —— 路由动态段原始参数
- 传出：`string` —— 最多两轮 `decodeURIComponent` 幂等解码后的值（解码无变化或抛错即停止）。
- 用处：兼容不同环境下动态段参数可能保留编码或已解码的形态，确保 `collectionId` 被正确还原（如双编码的 `%2520` → 空格）。

### `CollectionDetailView`（文件内组件）
- 类型：React 组件
- 传入：无 props；依赖 `useParams<{ collectionId: string }>()`。
- 传出：渲染（`<div className="space-y-6">`）：
  - 返回导航：Back to Explore 胶囊按钮；
  - 加载态：`Loading collection…`；
  - 错误态：错误卡 + 「Try again」按钮（`window.location.reload()`，覆盖限流等临时故障）；
  - 未找到态：「This collection could not be found.」+ 可能被移除或链接过期提示；
  - 详情主体（`detail` 存在时）：Hero 封面、成员目的地网格、附近灵感横滑列表、Wikivoyage CC BY-SA 4.0 署名。
- 用处（状态与数据流）：
  - `collectionId = normalizeRouteParam(params.collectionId ?? "")`，交给 `useCollectionDetail(collectionId)` 得 `{ detail, isLoading, error }`。
  - `itemsWithCoords = useMemo(() => detail?.items.filter(有 lat/lon) ?? [], [detail])`；`selectedItem = itemsWithCoords.find(id === selectedItemId) ?? itemsWithCoords[0]`（默认首个有坐标成员）。
  - `useNearbyInspirations(selectedItem?.lat, selectedItem?.lon)` 得 `{ nearby, isLoading: nearbyLoading }`（Wikivoyage geosearch，马来西亚限定）。
  - Hero：`detail.imageUrl` 有则渲染封面大图，无则渐变色块占位；叠加 `from-gray-800/70 via-gray-800/30 to-transparent` 渐变遮罩保证文字可读；展示标题、副标题（有则）、成员数徽章（`memberCount` 带单复数）、`starCount > 0` 时展示 Wikivoyage Star 徽章（`Star` 实心图标）。
  - 成员卡（`detail.items.map`）：图片区（`safeHttpUrl(item.imageUrl)` 或 `ImageOff` 图标）、`item.isStar` 时左上角 Wikivoyage Star 徽章（社区质量评级，注释明确区别于官方品质徽章）、有坐标成员右下角 Nearby 切换按钮（选中态 `bg-primary-500 text-white`）；正文标题、`line-clamp-3` 导语；行动按钮区——「Search in TravelSync」（`Link` 到 `searchPagePath(item.title)`，`Search` 图标）与「Read guide」（`<a href={safeHttpUrl(item.wikivoyageUrl)}>`，`ExternalLink` 图标）。
  - 附近灵感区：仅 `selectedItem` 存在时渲染；标题「Nearby {selectedItem.title}」；`nearbyLoading` 显示加载文案、空列表显示「No nearby destinations found.」；`snap-x` 横滑卡片（`min-w-[220px]`）展示缩略图（`safeHttpUrl(place.imageUrl)`）/`ImageOff`、右上角距离标签（`formatDistance(place.distanceMeters)`）、标题（`truncate`）、`isStar` 时 Star 徽章；整卡外链 `safeHttpUrl(place.wikivoyageUrl)`。

### `CollectionDetailPage`（默认导出）
- 类型：React 组件（页面入口）
- 传入：无 props
- 传出：渲染 `<CollectionDetailView />`。
- 用处：无额外逻辑（本页未使用 `useSearchParams`，故无需 Suspense 边界）。
