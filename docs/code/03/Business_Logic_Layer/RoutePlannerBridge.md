# RoutePlannerBridge.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Business Logic Layer
> - 源文件：`business_logic_layer/03_Destination_Discovery_&_Inspiration/RoutePlannerBridge.ts`
> - 类型：跨模块桥接类（stub&driver，单例导出）

## 责任

模块 03 → 模块 02（Trip Planning & Itinerary Management）的**跨模块数据交流桥接器**：将用户选中的地点加入行程的业务编排。

分层说明：跨模块数据交流发生在 Business Logic Layer（业务编排），API Layer 仅负责与外部第三方 API 交流，故本桥接器不属于 api_layer。

当前状态（stub&driver）：
- **stub**：模块 02 尚未接入，此处以模拟实现占位（异步提交 150ms 模拟网络延迟 + 内存记录 + 返回成功）；
- **driver**：上层可经 `getPushedItems()` 读取 stub 记录，验证"加入行程"链路真实生效。
- **未来无缝衔接**：将内部实现替换为调用模块 02 提供的导入端点/客户端，保持 `pushItem` 签名与返回结构不变，上层（FavoritesService）无需改动。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./types` | `SavedItem` 领域类型 |

## 导出与函数明细

### 接口 `PushToRoutePlannerResult`
- 类型：接口
- 字段：`success: boolean`（是否成功）、`pushedCount: number`（本次加入条目数量）、`target: "02_Trip_Planning_&_Itinerary_Management"`（目标模块标识，未来替换为真实跨模块调用后保持不变）
- 用处：加入行程操作的结果，供上层展示反馈。

### 类 `RoutePlannerBridge`
- 类型：类
- 用处：跨模块桥接实现，FavoritesService 默认实例化使用。

#### `getPushedItems()`
- 传入：无
- 传出：`SavedItem[]`（stub 内存记录的已加入行程条目副本）
- 用处：读取 stub 已记录的条目（仅供 driver / 调试验证 stub 行为；接入模块 02 后移除）。

#### `pushItem(item: SavedItem)`
- 传入：`item: SavedItem`（要加入行程的收藏条目）
- 传出：`Promise<PushToRoutePlannerResult>`（mock：恒为 `{ success: true, pushedCount: 1, target: "02_Trip_Planning_&_Itinerary_Management" }`）
- 用处：将单个地点加入行程（模块 02）。mock 实现：模拟 150ms 网络延迟 → 记录条目到内存 → 返回成功。未来替换为真实跨模块调用，签名不变。

### 常量导出
- **`routePlannerBridge`**：`RoutePlannerBridge` 单例。
