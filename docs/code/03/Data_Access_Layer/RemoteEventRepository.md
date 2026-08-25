# RemoteEventRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteEventRepository.ts`
> - 类型：仓储实现（浏览器端 · 经 Route API 远程调用）

## 责任

本文件是模块 03 节日/活动仓储的「远程」实现，运行于**浏览器端**，通过 HTTP 调用 Route API（`app/03_Destination_Discovery_&_Inspiration/api/events`）实现 `EventRepository` 接口。职责单一：仅做参数序列化与响应解析，**不含任何 SQL / 数据库逻辑**（数据库操作由服务端 `D1EventRepository` 承担）。

依赖方向为：浏览器端 BL → 本类 → Route API → `D1EventRepository` → Cloudflare D1。

### 请求/响应契约

| 方法 | HTTP | 请求 | 成功响应体 | 返回值 |
| --- | --- | --- | --- | --- |
| `listAll` | GET | 无 | `EventEntity[]`（数组） | 直接 `res.json()` |
| `upsertAll` | POST | JSON `{ items }` | `{ synced?: number }` | `data.synced ?? 0` |
| `clearAll` | DELETE | 无 | `{ cleared?: number }` | `data.cleared ?? 0` |

**写操作鉴权**：`upsertAll` / `clearAll` 为危险写操作，请求携带当前会话凭证（Authorization 头），服务端要求管理员会话（未登录 401 / 非 admin 403）。

请求/响应示例（示意，非代码内固定值）：

```jsonc
// POST /03_Destination_Discovery_&_Inspiration/api/events
{ "items": [{ "id": "tatreez-reclaiming-palestine", "title": "...", "categories": ["Arts & Culture"], "date": "...", "location": "...", "url": "...", "syncedAt": 1755000000000 }] }
// 响应
{ "synced": 1 }
```

**错误语义**：任何非 2xx 响应均抛出带 HTTP 状态码的 `Error`（如 `` `Failed to load events (HTTP ${res.status})` ``），由调用方决定如何处理（如 DEV 同步按钮展示失败信息）。`upsertAll`/`clearAll` 的响应体字段缺失时（`undefined`）用 `?? 0` 兜底为 0。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./EventRepository` | 仅导入 `EventEntity`、`EventRepository` 类型，用于实现接口签名 |

外部库：无（使用 Web 标准 `fetch`，无额外依赖）。

## 导出与函数明细

### `EVENTS_API`（模块内常量）

- 类型：常量（未导出）
- 传入：无
- 传出：字符串 `"/03_Destination_Discovery_&_Inspiration/api/events"`。
- 用处：Route API 端点（模块 03 节日/活动），三个方法共用；为相对路径，由浏览器端按当前站点 origin 解析。

### `RemoteEventRepository`

- 类型：类（`implements EventRepository`）
- 传入：无（无构造参数）。
- 传出：三个接口方法的实现：
  - `listAll(): Promise<EventEntity[]>` —— `fetch(EVENTS_API)`（GET）；非 2xx 抛 `` `Failed to load events (HTTP ${res.status})` ``；成功时直接 `res.json()` 反序列化为 `EventEntity[]`（Route API 响应体即数组，不含包装字段）。
  - `upsertAll(items: EventEntity[]): Promise<number>` —— POST，请求头 `Content-Type: application/json`，请求体 `JSON.stringify({ items })`；非 2xx 抛 `` `Failed to sync events (HTTP ${res.status})` ``；响应体解析为 `{ synced?: number }`，返回 `data.synced ?? 0`。
  - `clearAll(): Promise<number>` —— DELETE；非 2xx 抛 `` `Failed to clear events (HTTP ${res.status})` ``；响应体解析为 `{ cleared?: number }`，返回 `data.cleared ?? 0`。
- 用处：浏览器端读写活动数据的标准入口。`upsertAll`/`clearAll` 的返回值（`synced`/`cleared`）由服务端 Route API 透传 `D1EventRepository` 的实际写入/删除条数，供同步链路统计与反馈。

### `remoteEventRepository`

- 类型：常量（模块级单例）
- 传入：无
- 传出：`new RemoteEventRepository()` 的实例。
- 用处：导出的默认单例，供调用方（如 BL 层查询/同步服务）直接 import 使用，避免重复实例化。

## 边界情况与错误处理

- **非 2xx 一律抛错**：三个方法对 `!res.ok` 抛出带 HTTP 状态码的 `Error`，错误消息区分操作（load / sync / clear），便于定位。
- **网络层错误未包装**：`fetch` 本身失败（断网、DNS 等）抛出的 `TypeError` 直接向上传播，本类不捕获包装；由调用方统一处理。
- **响应体解析**：`upsertAll`/`clearAll` 的响应缺 `synced`/`cleared` 字段时按 0 处理（`?? 0`）；若响应体不是合法 JSON，`res.json()` 抛出的解析错误同样直接传播（代码未捕获）。
- **空数组同步**：`upsertAll([])` 仍会发出 POST 请求（本类不短路），服务端 D1 实现循环不执行并返回 0。

## 设计要点与注意事项

- 本类**无状态**：不缓存数据、不维护内部状态，每次调用独立发起 fetch，适合浏览器端高频调用。
- 与 `HardcodedEventRepository` 的分工：浏览器端**查询**活动通常走 Remote 实现（读取 D1 中已同步的数据），而硬编码 JSON 仅作为同步链路的输入源，两者面向不同场景。
- 错误全部以异常抛出、不做静默降级：活动数据的读写失败应被上层显式感知（与图片缓存链路的「失败静默跳过」策略不同）。

## 关联文档

- [`EventRepository.md`](./EventRepository.md)：本类实现的仓储接口与实体定义。
- [`D1EventRepository.md`](./D1EventRepository.md)：服务端 D1 实现（本类经 Route API 转发的目标）。
