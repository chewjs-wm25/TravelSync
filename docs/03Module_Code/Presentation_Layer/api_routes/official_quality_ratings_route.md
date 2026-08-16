# official-quality-ratings/route.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/api/discovery/official-quality-ratings/route.ts`
> - 类型：服务端 Route API（Next.js App Router Route Handler，薄传输桥）

## 责任

`official-quality-ratings/route.ts` 是模块 03 官方品质评级的 Route API，职责单一：HTTP 传输层——解析/校验请求参数、获取 Cloudflare D1 binding（`TEST_DB`）、实例化 `D1QualityRatingRepository` 并委托其方法、序列化响应。**本文件不含任何 SQL / 数据库逻辑**（数据库操作全部位于 Data Access 层 `D1QualityRatingRepository` 内）。

数据流（读取方向）：`officalQualityRate` 组件 → `hooks.useSearchAndFilter` 的 `pois` → BL 层 `discoveryService.getQualityRatedPois` → 本 Route API → `D1QualityRatingRepository` → Cloudflare D1（`TEST_DB`）。注意 BL 层 `getQualityRatedPois` **不接受筛选条件**——无论主页筛选状态如何始终返回全部官方评级数据（Recommended Places 与搜索栏完全解绑）。写入方向：`officalQualityRating_hardcode.json` 同步时经 `POST` 批量 upsert，`DELETE` 清空数据。

端点提供三个操作：
- `GET /api/discovery/official-quality-ratings` —— 返回全部官方评级条目（`OfficialQualityRatingEntity[]`）；
- `POST /api/discovery/official-quality-ratings`（body `{ items }`）—— 批量 upsert（非空数组校验），供 hardcode 数据同步；
- `DELETE /api/discovery/official-quality-ratings` —— 清空全部官方评级数据，返回 `{ cleared }`。

`POST` 校验 body 中 `items` 必须为非空数组，否则返回 400；响应携带同步条数 `{ synced }`（201 Created）。

## 请求 / 响应示例

```
GET  /api/discovery/official-quality-ratings
     → 200 [ { "id": "json-1", "name": "Batu Caves", "qualityBadge": "gold", "formatted": "...", "phone": "...", "ratingDuration": "2024-2026", "lat": 3.237, "lon": 101.684 } ]

POST /api/discovery/official-quality-ratings
     body: { "items": [ { "id": "json-1", "name": "Batu Caves", ... } ] }
     → 201 { "synced": 1 }

DELETE /api/discovery/official-quality-ratings
     → 200 { "cleared": true }
```

## 错误码汇总

| 状态码 | 场景 | 响应体 |
| --- | --- | --- |
| 400 | `items` 缺失 / 非数组 / 空数组 | `{ "error": "items (non-empty array) is required" }` |
| 400 | body 非合法 JSON | 同 items 校验错误（按空 body 处理） |
| 500（默认） | D1 绑定缺失 / 数据库异常 | 框架默认错误页（未捕获异常） |

## 安全与分层要点

- **薄传输**：文件内无 SQL / 无数据库逻辑，全部委托 Data Access 层仓储，符合分层约束；
- **binding 获取**：`getCloudflareContext({ async: true })` 在 Cloudflare Workers 环境异步解析 `TEST_DB` binding；
- **批量 upsert 语义**：`POST` 一次写入整批（`officalQualityRating_hardcode.json` 同步入口），空数组拒绝；
- **只读消费**：`GET` 是主页 Recommended Places（`getQualityRatedPois`）的唯一数据入口；BL 层不接收筛选条件，始终全量返回（与搜索栏筛选解绑的设计基础）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/D1QualityRatingRepository` | D1 评级仓储：`listAll` / `upsertAll` / `clearAll`（仅记录 import，未打开源文件） |
| `../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository`（仅类型） | 实体类型 `OfficialQualityRatingEntity`（仅记录 import） |
| 外部库：`@opennextjs/cloudflare`（`getCloudflareContext`） | 获取当前环境 D1 binding（`env.TEST_DB`） |

## 导出与函数明细

### `qualityRatingRepo`（文件内 helper）
- 类型：函数（异步）
- 传入：无
- 传出：`Promise<D1QualityRatingRepository>` —— 以 `getCloudflareContext({ async: true })` 取得的 `env.TEST_DB` 构建仓储实例。
- 用处：三个 HTTP handler 共用的仓储构造入口。

### `GET`
- 类型：函数（Route API handler）
- HTTP 方法：`GET /api/discovery/official-quality-ratings`
- 请求参数：无
- 响应体：`Response.json(items)` —— 全部官方评级条目（`OfficialQualityRatingEntity[]`，空数组表示暂无数据）。
- 用处：`repo.listAll()` 委托 Data Access 层读取全表；主页 Recommended Places 数据源（BL 层 `getQualityRatedPois` 不接收筛选条件，始终返回全部官方评级数据；组件侧空列表时显示「No officially rated places available yet.」）。

### `POST`
- 类型：函数（Route API handler）
- HTTP 方法：`POST /api/discovery/official-quality-ratings`
- 请求参数：body `{ items: OfficialQualityRatingEntity[] }`；`request.json()` 解析失败（`.catch(() => null)`）视为空 body。校验：`items` 非数组或空数组返回 400 `{ error: "items (non-empty array) is required" }`。
- 响应体：`Response.json({ synced }, { status: 201 })` —— 同步成功条数。
- 用处：`repo.upsertAll(items)` 委托 Data Access 层批量 upsert 到 D1（`officalQualityRating_hardcode.json` 同步入口，幂等更新）。

### `DELETE`
- 类型：函数（Route API handler）
- HTTP 方法：`DELETE /api/discovery/official-quality-ratings`
- 请求参数：无
- 响应体：`Response.json({ cleared })` —— 清除操作结果。
- 用处：`repo.clearAll()` 委托 Data Access 层清空全部官方评级数据。

### 错误处理汇总
- body 缺失/非法（非数组或空数组）：400 + JSON 错误消息。
- JSON body 解析失败：`request.json().catch(() => null)` 按空 body 处理 → 校验后返回 400。
- 未捕获异常（D1 绑定缺失、数据库错误）：不在此处吞掉，直接向上抛出（框架默认 500），保证错误可观测。
