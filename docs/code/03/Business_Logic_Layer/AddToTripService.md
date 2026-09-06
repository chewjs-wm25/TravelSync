# AddToTripService.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Business Logic Layer
> - 源文件：`business_logic_layer/03_Destination_Discovery_&_Inspiration/AddToTripService.ts`
> - 类型：业务编排服务（单例导出）

## 责任

模块 03"加入行程"（→ 模块 02）的**端到端业务编排**：把用户在模块 03 选中的地点真实加入模块 02 指定行程日期（itinerary）。它补齐了此前"Add to Trip 只是摆设"的两个缺口：

1. **目标行程注入**：调用方（AddToTripPicker 弹窗）选定行程日期后，本服务经 `RoutePlannerBridge.setTargetItinerary` 注入目标并调用真实导入接口（`POST /02_Trip_Planning_&_Itinerary_Management/api/itineraries/{itineraryId}/items/import`），调用结束在 `finally` 中清除目标——每次加入都必须由用户明确选择目标；
2. **坐标补全**：模块 02 的 `importPlaces` 强制要求每条地点坐标有效（`hasValidCoordinates`，坐标缺失时整批返回失败）。收藏条目 `SavedItem` 不含坐标，本服务在坐标缺失时经 `discoveryService.resolveImportCoordinates` 解析（官方评级 D1 坐标 → `getPlaceDetail` 两级策略 → Geoapify 名称搜索兜底，全部马来西亚限定）。

分层说明：跨模块数据交流与编排发生在 Business Logic Layer（API Layer 仅与外部第三方 API 交流）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./DiscoveryService` | `resolveImportCoordinates`：坐标解析补齐（D1 / Geoapify，马来西亚限定） |
| `./RoutePlannerBridge` | `routePlannerBridge.setTargetItinerary` + `pushItem`：真实调用模块 02 导入接口 |
| `./FavoritesService` | `currentUserId`：当前登录用户（未登录抛"请先登录"） |
| `./types` | `AddToTripImportItem`（SavedItem + 可选 lat/lon）领域类型 |

> 无循环依赖：本文件只被 Presentation（AddToTripPicker）调用，不存在被
> DiscoveryService ⇄ FavoritesService ⇄ RoutePlannerBridge 反向引用的情况。

## 导出与函数明细

### 类 `AddToTripService`
- 类型：类
- 用处：加入行程的 BL 编排入口。

#### `addToTripToItinerary(item: AddToTripImportItem, itineraryId: string): Promise<PushToRoutePlannerResult>`
- 传入：`item` —— 地点条目（SavedItem + 可选 `lat`/`lon`；坐标缺失自动解析补齐）；`itineraryId` —— 模块 02 目标行程日期（itineraries 主键，弹窗选择所得）。
- 传出：`PushToRoutePlannerResult`：
  - 成功 → `{ success: true, pushedCount ≥ 1, target }`；
  - 失败 → `{ success: false, pushedCount: 0, target, message? }`（不抛异常；坐标无法解析 / 未实际新增 / 服务端拒绝均返回失败并附原因）；
  - 未登录 → 抛 `Error("Please log in first")`（由上层 UI 捕获并引导登录）。
- 执行流程：
  1. 登录校验（`currentUserId()`，行程归属当前用户，未登录不发起写入）；
  2. 入参已有有限 `lat`/`lon` → 直接复用（不发请求）；否则调 `discoveryService.resolveImportCoordinates`，解析失败返回失败结果；
  3. `routePlannerBridge.setTargetItinerary(itineraryId)` → `pushItem({ ...item, lat, lon })`；
  4. `finally` 清除目标（每次加入都需明确选择行程日期）；
  5. `pushedCount === 0` 时视为未实际新增，返回失败 + message。

### 常量导出
- **`addToTripService`**：`AddToTripService` 单例（AddToTripPicker 调用；与 FavoritesService 共用 `routePlannerBridge` 单例保证注入与调用一致）。
