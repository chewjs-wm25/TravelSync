# favouriteList.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/favouriteList.tsx`
> - 类型：客户端组件（`"use client"`，收藏夹抽屉 + 悬浮按钮）

## 责任

`favouriteList.tsx` 是模块 03 主页的「愿望清单与收藏夹」区域：右下角悬浮的「Favourite List (n)」按钮（未开抽屉时显示）+ 右侧滑出的抽屉面板。数据经 `useFavorites`（Presentation hooks）从 BL 层获取。

抽屉内容：①类型过滤按钮组——「All」+ `typeOptions`（自动从收藏条目体验类型去重生成，`activeType` 由父级受控传入）；②已收藏地点列表——缩略图（经 `usePlaceImages` 统一图片链路获取真实图片，与 Recommended Places / Search Places 一致；无图用 `ImageOff` 占位，旧数据 `thumbnailUrl` 作兜底）、名称（`line-clamp-1`）、体验类型标签；③每条的操作——移除收藏（星星按钮，`removeItem`）与「+ Add to Trip」（经 RoutePlannerBridge 调用模块 02 真实导入接口，`addToTrip`，成功后 3 秒 toast 反馈）；④空列表提示文案。

关键交互细节：
- 条目整体可点击 → `router.push(placeDetailPath(item.placeId, item.name))` 跳地点详情页（以收藏名称作为搜索词重查）；
- 移除与加入行程按钮均 `e.stopPropagation()` 阻止触发条目跳转；
- 加入行程期间按钮置 loading（`addingToTripId === item.id` → 「Adding…」）并禁用；
- 抽屉过渡动画：`translate-x-0`（开）/ `translate-x-full`（关），移动端全宽、`sm:w-96`；
- `StarIcon` 是导出具名组件（heroicons outline star 的 SVG 封装），被搜索结果页（`search/page.tsx`）与地点详情页（`place/[placeId]/page.tsx`）复用。

## 分层数据流

```
FavouriteList（本组件）
  ├─ useFavorites()  → favoritesService.getSavedItems / removeSavedItem / addToTrip / togglePoiFavourite
  │                    → Route API /03_Destination_Discovery_&_Inspiration/api/favourites → Cloudflare D1
  │                    → addToTrip 经 RoutePlannerBridge 调用模块 02 导入接口
  ├─ usePlaceImages(visibleItems) → discoveryService.getPlaceImage（与 Recommended Places / Search
  │                    Places 同一查询链 + 同一缓存：Wikivoyage → Wikipedia 条目配图 → Commons
  │                    Geosearch → Mapillary 兜底，马来西亚限定；收藏条目无坐标，Geosearch/Mapillary
  │                    环节自动跳过；缓存键为 placeId，同地点在其他页面已查过的图直接命中）
  └─ 受控 props（父级 page.tsx 注入）：isDrawerOpen / typeOptions / activeType
```

## 状态与交互清单

| 状态/事件 | 说明 |
| --- | --- |
| `addingToTripId` | 加入行程中条目 id；对应按钮禁用并显示「Adding…」 |
| `tripToast` | 加入行程反馈（成功 `#10b981` / 失败 `#ef4444`），3 秒自动清除 |
| 悬浮按钮点击 | `setIsDrawerOpen(true)`（未开抽屉时显示「Favourite List (n)」） |
| 关闭按钮点击 | `setIsDrawerOpen(false)`（自定义 SVG X 图标） |
| 条目点击 | `handleOpenPlace` → `router.push(placeDetailPath(placeId, name))` |
| 移除按钮点击 | `handleRemove` → `stopPropagation` + `removeItem(id)`（hooks 内部自动 `refresh`） |
| Add to Trip 点击 | `handleAddToTrip` → `stopPropagation` + `addToTrip(item)` + toast |
| 类型过滤按钮 | 「All」+ `typeOptions`；激活项 `bg-primary-500 text-white` |

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| 收藏夹为空 | 抽屉显示「No favourite places yet. Tap the star icon on any place to save it.」 |
| 无图片（统一链路无结果且无旧 thumbnailUrl） | 灰底圆角块 + `ImageOff` 图标占位（`h-16 w-16`） |
| 图片加载中 | 统一链路结果未返回前显示占位，返回后切换为真实图片（不重复消耗免费 API 额度，缓存命中即时） |
| 有图 | 展示真实图片并在底部叠加 `PlaceImageAttribution` 署名（开源协议合规） |
| 旧收藏数据 | 统一链路无结果时以 `safeHttpUrl(item.thumbnailUrl)` 兜底（兼容历史收藏） |
| 加入行程失败/异常 | toast 显示错误文案，3 秒自动清除 |
| 加入行程进行中 | 对应按钮禁用并显示「Adding…」（`addingToTripId`） |
| 移除收藏 | `stopPropagation` 阻止条目跳转；hooks 内部自动 `refresh` 刷新列表 |
| 收藏加载失败 | hooks 保持空列表（页面不崩） |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./hooks`（`useFavorites`、`usePlaceImages`） | 收藏夹数据：`visibleItems`、`savedItemsCount`、`removeItem`、`addToTrip`；条目图片统一链路懒加载 |
| `./placeImageAttribution` | 条目图片的作者与许可署名展示（开源协议合规） |
| `./routes`（`placeDetailPath`） | 条目点击跳转地点详情页路径 |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | `SavedItem`（仅记录 import，未打开源文件） |
| 外部库：`react`（`useState`）、`next/navigation`（`useRouter`）、`lucide-react`（`ImageOff`） | 本地状态、路由与无图图标 |

## 导出与函数明细

### `ChildProbs`（接口）
- 类型：常量（TypeScript 接口，命名沿用代码原文）
- 内容：`{ isDrawerOpen: boolean; setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>; typeOptions: string[]; activeType: string; setActiveType: React.Dispatch<React.SetStateAction<string>> }` —— 抽屉开关与类型过滤的受控 props（父级 `page.tsx` 传入）。

### `StarIcon`
- 类型：React 组件（导出具名组件）
- 传入：props `{ filled: boolean; className?: string }` —— `filled` 决定 `fill="currentColor"` 或 `fill="none"`；`className` 透传到 `<svg>`。
- 传出：渲染 heroicons outline star 的 SVG 路径（`stroke="currentColor"`、`strokeWidth="2"`、`viewBox="0 0 24 24"`）。
- 用处：收藏星星图标，被本组件及搜索结果页、地点详情页复用。

### `FavouriteList`（默认导出）
- 类型：React 组件
- 传入：`ChildProbs`（见上）
- 传出：`<>` 片段包含：
  - 悬浮开关按钮（`!isDrawerOpen` 时）：固定 `right-8 bottom-8 z-40`，`StarIcon` + 「Favourite List ({savedItemsCount})」，点击 `setIsDrawerOpen(true)`；
  - 抽屉面板：固定 `top-0 right-0 z-50`，头部（标题 + `StarIcon` + 关闭按钮 `setIsDrawerOpen(false)`，关闭按钮为自定义 SVG X 图标）、类型过滤按钮组、条目列表（`overflow-y-auto`）、空态文案、底部 toast。
- 用处（交互逻辑）：
  - 调用 `useFavorites()` 取 `{ visibleItems, savedItemsCount, removeItem, addToTrip }`（`activeType`/`setActiveType` 来自父级受控 props）。
  - 本地状态：`addingToTripId`（加入行程中条目 id）、`tripToast`（`{ status: "success" | "error", message }`，3 秒自动清除）。
  - `handleAddToTrip(e, item)`：`e.stopPropagation()` → `setAddingToTripId(item.id)` → `await addToTrip(item)` → 按 `result.success` 设 toast（成功 `✓ {name} added to your trip` / 失败 `Failed to add {name} to trip`）；`catch` 兜底错误 toast；`finally` 复位 loading + `setTimeout(3000)` 清 toast。
  - `handleRemove(e, id)`：`e.stopPropagation()` 后 `await removeItem(id)`（hooks 内部会 `refresh` 重新拉取列表）。
  - `handleOpenPlace(item)`：`router.push(placeDetailPath(item.placeId, item.name))`。
  - 条目渲染：缩略图（`h-16 w-16`）——`images[item.id]?.url` 优先（`usePlaceImages` 统一图片链路结果，`safeHttpUrl` 过滤后渲染，底部叠加 `PlaceImageAttribution` 署名），无则 `safeHttpUrl(item.thumbnailUrl)` 兜底（旧数据），再无可显示 `ImageOff` 灰底占位；名称 + 体验类型标签；右侧操作列——移除星星（hover 变红 `hover:text-[#ef4444]`）+ Add to Trip 胶囊按钮（`addingToTripId === item.id` 时禁用显示「Adding…」）。
  - 空列表时显示「No favourite places yet. Tap the star icon on any place to save it.」。
