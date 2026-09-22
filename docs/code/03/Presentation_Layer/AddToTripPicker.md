# AddToTripPicker.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/AddToTripPicker.tsx`
> - 类型：客户端组件（`"use client"`，加入行程目标选择弹窗；导出 `AddToTripCandidate` / `AddToTripSuccessInfo` 类型）

## 责任

把 Module 03 的「+ Add to Trip」做成**真正端到端可用**：点击按钮后弹窗让用户**选择目标旅行 → 选择该旅行的行程日期 → 确认后真实导入模块 02**。此前模块 03 虽有 Add to Trip 按钮与 `RoutePlannerBridge` 桥接，但全站没有任何地方注入目标行程（`setTargetItinerary` 从未被调用）且导入请求不带坐标——点按钮必然失败；本组件补齐"选择目标"环节（坐标补齐在 BL，见 AddToTripService.md）。

弹窗结构：
1. 未登录 → 提示登录 + 引导到登录页（`/01_User_&_Account_Management`）；
2. 已登录 → 经 `listTripsAction(userId)`（**模块 02 只读 server action**，不改模块 02，先例同模块 05 `SharedTripPlanEditor`）列出当前用户全部旅行（名称 + 日期区间），空态/失败可重试/加载骨架齐全；
3. 选中旅行 → 经 `listItinerariesAction(tripId)` 懒加载该旅行**已持久化**的行程日期（`Day N` 标题 + 日期；模块 02 的 `local-` 临时日不存在于服务端，不作为目标）；
4. 选中行程日期 → 「Add to Trip」：经 `addToTripService.addToTripToItinerary(item, itineraryId)`（BL 编排：登录校验 + 坐标解析补齐 + RoutePlannerBridge 目标注入 + 调用模块 02 真实导入接口 `POST /02_.../api/itineraries/{itineraryId}/items/import`）完成导入；失败（含坐标无法解析/服务端拒绝/未实际新增）在弹窗内展示原因并可重试；成功回调 `onAdded` 供父级 toast 并自动关闭。

## 分层数据流

```
AddToTripPicker（外层仅挂载判断；每次打开以新 key 挂载内层会话组件）
  ├─ useAuthStore()            → 登录态（isLoggedIn / user.id，写入行程归属当前用户）
  ├─ listTripsAction(userId)   → 模块 02 只读 server action：当前用户旅行列表
  ├─ listItinerariesAction(tripId) → 模块 02 只读 server action：行程日期列表
  └─ addToTripService.addToTripToItinerary(item, itineraryId)
                                → BL：discoveryService.resolveImportCoordinates（坐标补齐）
                                → routePlannerBridge.setTargetItinerary + pushItem
                                → POST /02_.../api/itineraries/{itineraryId}/items/import
```

## 状态与交互清单

| 状态/事件 | 说明 |
| --- | --- |
| `trips` | `TripRow[] \| null`（null=加载中；[]=无旅行；非 null=已加载） |
| `tripsError` | 旅行列表加载失败文案（提供 Retry，经 `loadTripsKey` 重拉） |
| `selectedTripId` | 选中的旅行 id（触发 `listItinerariesAction` 懒加载） |
| `itineraries` | `ItineraryRow[] \| null`（null=加载中；[]=该旅行暂无行程日期） |
| `itinerariesError` | 行程日期加载失败文案 |
| `selectedItineraryId` | 选中的行程日期 id（未选时底部主按钮禁用） |
| `isSubmitting` / `submitError` | 提交进行中 / 弹窗内错误（坐标无法解析、服务端拒绝等） |
| 遮罩 / X 关闭 | `onClose()`（父级复位候选；不打断抽屉等下层 UI） |
| AddToTripPicker 成功 | `onAdded({ placeName, tripName, dayTitle, importedCount })` → `onClose()` |

> 组件结构说明：外层 `AddToTripPicker` 不持有 hooks，仅当 `item` 非空时以
> `key={item.id-name}` 挂载内层 `AddToTripPickerDialog`——每次打开都从
> `useState` 初始值开始（交互状态天然重置，无需在 effect 中同步清空）；
> 异步加载/提交全部在回调中 `setState`（规避 react-hooks/set-state-in-effect）。

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| 未登录 | 弹窗内提示 + 「Go to Sign in」链接；不做任何写入 |
| 无旅行 | 空态提示 + 「Go to Trip Planner」（`/02_Trip_Planning_&_Itinerary_Management`）链接 |
| 旅行列表加载失败 | 显示失败文案 + Retry（`loadTripsKey` 自增重拉） |
| 选中旅行无行程日期 | 提示需先在模块 02 为该旅行添加行程日期，附该旅行页链接（`/02_.../{tripId}`） |
| 坐标无法解析（收藏条目无坐标且名称搜索失败等） | BL 返回失败 + message，弹窗内展示「Unable to locate coordinates…」，不发送无效导入 |
| 服务端拒绝/网络失败 | 弹窗内展示 message（模块 02 失败响应透传），可改选目标后重试 |
| 重复打开 | 每次打开全新会话组件（新 key），状态不残留 |
| SSR | 未打开时不渲染任何内容；所有异步仅客户端触发 |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `@/app/Admin_Panel/authUser` | `useAuthStore`：全站登录态（用户 id） |
| `@/app/02_Trip_Planning_&_Itinerary_Management/api/tripApi` | `listTripsAction`（模块 02 只读 server action） |
| `@/app/02_Trip_Planning_&_Itinerary_Management/api/itineraryApi` | `listItinerariesAction`（模块 02 只读 server action） |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/AddToTripService` | `addToTripToItinerary`：加入行程 BL 编排 |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | `AddToTripImportItem` |
| 外部库：`react` | `useState`/`useEffect`/`useCallback` |

> 行程/旅行行类型经 `Awaited<ReturnType<typeof listTripsAction>>[number]` 推导，
> 不引入模块 02 的类型依赖（零运行时耦合）。

## 导出与函数明细

### `AddToTripCandidate`（接口）
- 内容：`{ id?: string; placeId?: string \| null; name: string; thumbnailUrl?: string; experienceType?: string; lat?: number \| null; lon?: number \| null }`
- 用处：父级（page.tsx 从 `PoiItem` 转换、favouriteList.tsx 直接传 `SavedItem`）传入的待加入行程地点；坐标可选，缺失由 BL 解析补齐。

### `AddToTripSuccessInfo`（接口）
- 内容：`{ placeName: string; tripName: string; dayTitle: string; importedCount: number }`
- 用处：成功回调数据，父级据此展示「✓ {placeName} added to {tripName} · {dayTitle}」toast。

### `AddToTripPicker`（默认导出）
- 传入：`{ item: AddToTripCandidate \| null; onClose(): void; onAdded?(info): void }`；`item` 为 null 时返回 null（不渲染）。
- 传出：`item` 非空时挂载 `AddToTripPickerDialog`（key = 候选 id + 名称，保证每次打开全新会话）。
- 用处：挂载判断 + 会话隔离（把交互状态重置收敛到内层组件的挂载/卸载生命周期）。

### `AddToTripPickerDialog`（内部会话组件）
- 用处：弹窗本体。挂载时（已登录）加载旅行列表；选中旅行加载行程日期；确认后调 `addToTripService.addToTripToItinerary`；结果失败显示 `submitError`，成功回调 `onAdded` 并 `onClose()`。视觉沿用模块 03 风格（`rounded-3xl`、`primary-500` 主按钮、遮罩点击关闭，z-[80] 高于收藏夹抽屉 z-50 与 toast z-60）。
