# EventSyncService.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Business Logic Layer
> - 源文件：`business_logic_layer/03_Destination_Discovery_&_Inspiration/EventSyncService.ts`
> - 类型：业务服务类（单例导出）

## 责任

模块 03 节日/活动**同步**业务逻辑（DEV 工具链路）。职责（单一）：

- 编排"parsed_events.json 硬编码数据 → 写入 Cloudflare D1"全流程；
- **幂等策略**：按 id（title 生成的 slug）upsert，重复执行仅覆盖更新；
- 无外部 API 依赖（Event 数据为官方爬取结果，无需补全）。

注意：本服务不负责活动展示（展示走 `DiscoveryService.getEventFeed`），只负责把硬编码 JSON 数据同步进 D1（浏览器端经 Route API 写入），供 DEV-ACCOUNT-STATE 页面按钮调用。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `data_access_layer/.../HardcodedEventRepository` | 读取 parsed_events.json 全量条目 |
| `data_access_layer/.../RemoteEventRepository` | 浏览器端远程 D1 仓储（upsertAll / clearAll） |

## 导出与函数明细

### 接口 `EventSyncResult`
- 类型：接口
- 字段：`total: number`（JSON 总条数）、`synced: number`（实际写入 D1 条数）、`failed: number`（写入失败被跳过条数）
- 用处：同步结果统计，供 UI 反馈展示。

### 类 `EventSyncService`
- 类型：类
- 用处：活动同步业务入口，DEV 页面通过 `eventSyncService` 单例调用。

#### `syncEvents()`
- 传入：无
- 传出：`Promise<EventSyncResult>`
- 用处：执行一次全量同步：①读取 parsed_events.json 全量条目；②填充 `syncedAt` 时间戳；③批量 upsert 到 D1（按 id 幂等）；④返回统计（total/synced/failed）。

#### `clearEvents()`
- 传入：无
- 传出：`Promise<number>`（实际删除的 D1 events 记录条数）
- 用处：清空全部活动数据（DEV 工具），调远程仓储 DELETE 全部 events 记录；失败抛错由调用方反馈。

### 常量导出
- **`eventSyncService`**：`EventSyncService` 单例。
