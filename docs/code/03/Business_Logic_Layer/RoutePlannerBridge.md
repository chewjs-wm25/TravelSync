# RoutePlannerBridge.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Business Logic Layer
> - 源文件：`business_logic_layer/03_Destination_Discovery_&_Inspiration/RoutePlannerBridge.ts`
> - 类型：跨模块桥接类（真实调用，单例导出）

## 责任

模块 03 → 模块 02（Trip Planning & Itinerary Management）的**跨模块数据交流桥接器**：将用户选中的地点加入行程的业务编排。

分层说明：跨模块数据交流发生在 Business Logic Layer（业务编排），API Layer 仅负责与外部第三方 API 交流，故本桥接器不属于 api_layer。

当前状态（真实接入，原 stub&driver 已移除）：
- 调用模块 02 提供的导入能力 —— HTTP `POST /02_Trip_Planning_&_Itinerary_Management/api/itineraries/{itineraryId}/items/import`（BL 层 `importPlaces` 的 HTTP 通道，见 `docs/communicate/02_interface.md` §3）；
- 目标行程日期（itineraryId）由上层经 `setTargetItinerary()` 注入（单例状态）；未注入时 `pushItem` 返回失败结果（`success: false`），不抛异常；
- `pushItem` 签名与返回结构保持不变（上层 FavoritesService / UI 无需改动）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./types` | `SavedItem` 领域类型 |
| 模块 02 Route API（HTTP） | `POST /02_Trip_Planning_&_Itinerary_Management/api/itineraries/{itineraryId}/items/import`，请求体 `{ items: [{ placeId?, name, lat?, lon? }] }`，响应 `{ success, importedCount }` |

## 导出与函数明细

### 接口 `PushToRoutePlannerResult`
- 类型：接口
- 字段：`success: boolean`（是否成功）、`pushedCount: number`（本次加入条目数量）、`target: "02_Trip_Planning_&_Itinerary_Management"`（目标模块标识，真实跨模块调用后保持不变）
- 用处：加入行程操作的结果，供上层展示反馈。

### 类 `RoutePlannerBridge`
- 类型：类
- 用处：跨模块桥接实现，FavoritesService 默认实例化使用（默认参数为模块级单例 `routePlannerBridge`）。

#### `setTargetItinerary(itineraryId: string | null)`
- 传入：`itineraryId` —— 模块 02 目标行程日期（itineraries 主键）；传 `null` 清除选择。
- 传出：无
- 用处：注入/清除"加入行程"的目标行程日期。上层在用户选择行程后调用；未注入时 `pushItem` 返回失败结果。

#### `pushItem(item: SavedItem)`
- 传入：`item: SavedItem`（要加入行程的收藏条目）
- 传出：`Promise<PushToRoutePlannerResult>` —— 真实调用模块 02 导入接口的结果映射：成功 → `{ success: true, pushedCount: importedCount, target }`；目标行程未设置 / 网络错误 / 服务端失败 → `{ success: false, pushedCount: 0, target }`（不抛异常）。
- 用处：将单个地点加入行程（模块 02）。请求体将 `SavedItem` 映射为 `ImportPlaceInput`（`placeId` / `name` 透传，`lat` / `lon` 置 `null`——收藏条目无坐标）。

### 常量导出
- **`routePlannerBridge`**：`RoutePlannerBridge` 单例（FavoritesService 默认注入使用，保证 `setTargetItinerary` 注入与 `addToTrip` 调用共享同一实例状态）。
