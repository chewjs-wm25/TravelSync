# favorites/route.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/api/favorites/route.ts`
> - 类型：服务端 Route API（Next.js App Router Route Handler，薄传输桥）

## 责任

`favorites/route.ts` 是模块 03 收藏夹的 Route API，职责单一：HTTP 传输层——解析/校验请求参数、获取 Cloudflare D1 binding（`TEST_DB`）、实例化 `D1FavoritesRepository` 并委托其方法、序列化响应。**本文件不含任何 SQL / 数据库逻辑**（数据库操作全部位于 Data Access 层 `D1FavoritesRepository` 内），符合「Presentation 层只做传输、Data Access 层负责持久化」的分层约束。

数据流（读取方向）：前端组件（`FavouriteList` / `hooks.useFavorites`）→ BL 层 `favoritesService` → 本 Route API → `D1FavoritesRepository` → Cloudflare D1（`TEST_DB`）。写入方向（收藏/取消收藏/删除）同样经本端点回写 D1。

端点提供三个操作：
- `GET /api/discovery/favorites?userId=xxx` —— 按 userId 列出收藏条目；
- `POST /api/discovery/favorites`（body `{ userId, item }`）—— 新增一条收藏；
- `DELETE /api/discovery/favorites?userId=xxx&id=yyy` —— 按 userId + id 移除一条收藏。

参数校验采用最小必要校验：`GET`/`DELETE` 校验 query 必填项（`userId` / `id`），`POST` 校验 body 中 `userId` 与 `item` 的必填字段（`id`/`placeId`/`name`），缺失返回 400 并附字段提示。

## 请求 / 响应示例

```
GET  /api/discovery/favorites?userId=u123
     → 200 [ { "id": "p1", "placeId": "geocode:abc", "name": "Batu Caves", "thumbnailUrl": "...", "experienceType": "..." } ]

POST /api/discovery/favorites
     body: { "userId": "u123", "item": { "id": "p1", "placeId": "geocode:abc", "name": "Batu Caves" } }
     → 201 { "id": "p1", "placeId": "geocode:abc", "name": "Batu Caves" }

DELETE /api/discovery/favorites?userId=u123&id=p1
     → 204 （空响应体）
```

## 错误码汇总

| 状态码 | 场景 | 响应体 |
| --- | --- | --- |
| 400 | GET 缺 `userId` | `{ "error": "userId is required" }` |
| 400 | DELETE 缺 `userId` 或 `id` | `{ "error": "userId and id are required" }` |
| 400 | POST 缺 `userId` 或 `item.id`/`item.placeId`/`item.name` | `{ "error": "userId and item (id, placeId, name) are required" }` |
| 400 | body 非合法 JSON | 同 POST 校验错误（按空 body 处理） |
| 500（默认） | D1 绑定缺失 / 数据库异常 | 框架默认错误页（未捕获异常） |

## 安全与分层要点

- **薄传输**：文件内无 SQL / 无数据库逻辑，全部委托 Data Access 层仓储，符合分层约束；
- **binding 获取**：`getCloudflareContext({ async: true })` 在 Cloudflare Workers 环境异步解析 `TEST_DB` binding；
- **参数校验**：只做「必要字段存在性」校验，不做业务规则校验（业务规则在 BL 层 / 仓储层），保持传输层职责单一；
- **无鉴权**：本端点依赖 `userId` 参数区分数据（Demo 语义，未实现会话鉴权），前端调用方（BL 层 `favoritesService`）负责传入当前用户标识。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/D1FavoritesRepository` | D1 收藏仓储：`listItems` / `addItem` / `removeItem`（仅记录 import，未打开源文件） |
| `../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository`（仅类型） | 实体类型 `FavoriteItemEntity`（仅记录 import） |
| 外部库：`@opennextjs/cloudflare`（`getCloudflareContext`） | 获取当前环境 D1 binding（`env.TEST_DB`） |

## 导出与函数明细

### `favoritesRepo`（文件内 helper）
- 类型：函数（异步）
- 传入：无
- 传出：`Promise<D1FavoritesRepository>` —— 以 `getCloudflareContext({ async: true })` 取得的 `env.TEST_DB` 构建仓储实例。
- 用处：三个 HTTP handler 共用的仓储构造入口；`async: true` 保证在 Cloudflare Workers 环境正确读取 binding。

### `GET`
- 类型：函数（Route API handler）
- HTTP 方法：`GET /api/discovery/favorites?userId=xxx`
- 请求参数：query `userId`（必填，缺失返回 400 `{ error: "userId is required" }`）
- 响应体：`Response.json(items)` —— 该用户收藏夹条目列表（`FavoriteItemEntity[]`，空数组表示无收藏）。
- 用处：`repo.listItems(userId)` 委托 Data Access 层读取列表；无收藏时返回空数组而非报错。

### `POST`
- 类型：函数（Route API handler）
- HTTP 方法：`POST /api/discovery/favorites`
- 请求参数：body `{ userId: string, item: FavoriteItemEntity }`；`request.json()` 解析失败（`.catch(() => null)`）视为空 body。校验：`userId` 与 `item.id` / `item.placeId` / `item.name` 任一缺失返回 400（提示信息列出必填字段）。
- 响应体：`Response.json(added, { status: 201 })` —— 新增成功的收藏条目。
- 用处：`repo.addItem(userId, item)` 委托 Data Access 层写入 D1，返回 201 Created。

### `DELETE`
- 类型：函数（Route API handler）
- HTTP 方法：`DELETE /api/discovery/favorites?userId=xxx&id=yyy`
- 请求参数：query `userId` 与 `id`（任一缺失返回 400 `{ error: "userId and id are required" }`）
- 响应体：`new Response(null, { status: 204 })` —— 空响应体（No Content）。
- 用处：`repo.removeItem(userId, id)` 委托 Data Access 层删除记录，返回 204；删除不存在条目由仓储内部处理（幂等）。

### 错误处理汇总
- 参数校验失败：400 + JSON 错误消息（`userId` / `id` / `item` 字段缺失，各自独立提示）。
- JSON body 解析失败：`request.json().catch(() => null)` 按空 body 处理 → 校验必填字段后同样返回 400。
- 未捕获异常（如 D1 绑定缺失、数据库错误）：不在此处吞掉，直接向上抛出（框架默认 500），保证错误可观测。
