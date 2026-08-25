# favourites/route.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/api/favourites/route.ts`
> - 类型：服务端 Route API（Next.js App Router Route Handler，薄传输桥）

## 责任

`favourites/route.ts` 是模块 03 收藏夹的 Route API，职责单一：HTTP 传输层——解析/校验请求参数、获取 Cloudflare D1 binding（`TEST_DB`）、实例化 `D1FavoritesRepository` 并委托其方法、序列化响应。**本文件不含任何 SQL / 数据库逻辑**（数据库操作全部位于 Data Access 层 `D1FavoritesRepository` 内），符合「Presentation 层只做传输、Data Access 层负责持久化」的分层约束。

数据流（读取方向）：前端组件（`FavouriteList` / `hooks.useFavorites`）→ BL 层 `favoritesService` → 本 Route API → `D1FavoritesRepository` → Cloudflare D1（`TEST_DB`）。写入方向（收藏/取消收藏/删除）同样经本端点回写 D1。

**授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1；路径遵循 guideline §5）**：当前用户 ID 一律从服务端会话（`Authorization: Bearer <token>`，经 `getAuthSession`）解析，**不再信任请求参数/body 中的 userId**——杜绝越权读写任意用户收藏。GET 未登录返回空列表 `[]`（浏览不中断、无信息泄露）；POST / DELETE 必须登录（401）。

端点提供三个操作（统一路径 `/03_Destination_Discovery_&_Inspiration/api/favourites`）：
- `GET /03_Destination_Discovery_&_Inspiration/api/favourites` —— 列出当前登录用户的收藏条目（未登录返回 `[]`）；
- `POST /03_Destination_Discovery_&_Inspiration/api/favourites`（body `{ item }`）—— 为当前登录用户新增一条收藏；
- `DELETE /03_Destination_Discovery_&_Inspiration/api/favourites?id=yyy` —— 移除当前登录用户的一条收藏。

参数校验采用最小必要校验：`POST` 校验 body 中 `item` 的必填字段（`id`/`placeId`/`name`），`DELETE` 校验 query 必填项（`id`），缺失返回 400 并附 `message` 字段提示。

## 请求 / 响应示例

```
GET  /03_Destination_Discovery_&_Inspiration/api/favourites
     → 200 [ { "id": "p1", "placeId": "geocode:abc", "name": "Batu Caves", "thumbnailUrl": "...", "experienceType": "..." } ]

POST /03_Destination_Discovery_&_Inspiration/api/favourites
     body: { "item": { "id": "p1", "placeId": "geocode:abc", "name": "Batu Caves" } }
     → 201 { "id": "p1", "placeId": "geocode:abc", "name": "Batu Caves" }

DELETE /03_Destination_Discovery_&_Inspiration/api/favourites?id=p1
     → 204 （空响应体）
```

## 错误码汇总

| 状态码 | 场景 | 响应体 |
| --- | --- | --- |
| 401 | POST / DELETE 未登录（无会话凭证） | `{ "message": "Unauthorized: please log in first" }` |
| 400 | POST 缺 `item.id`/`item.placeId`/`item.name` | `{ "message": "item (id, placeId, name) is required" }` |
| 400 | DELETE 缺 `id` | `{ "message": "id is required" }` |
| 400 | body 非合法 JSON | 同 POST 校验错误（按空 body 处理） |
| 500（默认） | D1 绑定缺失 / 数据库异常 | 框架默认错误页（未捕获异常） |

## 安全与分层要点

- **薄传输**：文件内无 SQL / 无数据库逻辑，全部委托 Data Access 层仓储，符合分层约束；
- **binding 获取**：`getCloudflareContext({ async: true })` 在 Cloudflare Workers 环境异步解析 `TEST_DB` binding；
- **会话鉴权**：userId 由服务端会话解析（`getAuthSession`），前端传入的 userId 一律忽略——GET 未登录返回 `[]`（匿名浏览不中断），POST / DELETE 未登录返回 401；
- **参数校验**：只做「必要字段存在性」校验，不做业务规则校验（业务规则在 BL 层 / 仓储层），保持传输层职责单一；
- **结果标志**：失败响应统一使用 `message` 字段（guideline §5），成功响应直接返回数据（数组 / 条目 / 204）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/D1FavoritesRepository` | D1 收藏仓储：`listItems` / `addItem` / `removeItem`（以 `env.TEST_DB` 与会话 userId 构造） |
| `../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository`（仅类型） | 实体类型 `FavoriteItemEntity` |
| `../../../../app/DEV-ACCOUNT-STATE/api/session` | 会话工具 `getAuthSession`（解析 `Authorization: Bearer <token>` 为当前用户） |
| 外部库：`@opennextjs/cloudflare`（`getCloudflareContext`） | 获取当前环境 D1 binding（`env.TEST_DB`） |

## 导出与函数明细

### `favoritesRepo`（文件内 helper）
- 类型：函数（异步）
- 传入：`userId: string`（会话解析出的当前用户 ID）
- 传出：`Promise<D1FavoritesRepository>` —— 以 `getCloudflareContext({ async: true })` 取得的 `env.TEST_DB` 与 userId 构建仓储实例。
- 用处：三个 HTTP handler 共用的仓储构造入口；`async: true` 保证在 Cloudflare Workers 环境正确读取 binding。

### `GET`
- 类型：函数（Route API handler）
- HTTP 方法：`GET /03_Destination_Discovery_&_Inspiration/api/favourites`
- 请求参数：无 query；`getAuthSession` 解析会话（未登录 → 返回 `Response.json([])`）。
- 响应体：`Response.json(items)` —— 当前登录用户收藏夹条目列表（`FavoriteItemEntity[]`，空数组表示无收藏）。
- 用处：`repo.listItems()` 委托 Data Access 层读取列表；未登录返回空数组而非报错（不泄露任何用户数据）。

### `POST`
- 类型：函数（Route API handler）
- HTTP 方法：`POST /03_Destination_Discovery_&_Inspiration/api/favourites`
- 请求参数：body `{ item: FavoriteItemEntity }`；`request.json()` 解析失败（`.catch(() => null)`）视为空 body。鉴权：未登录返回 401 `{ message: "Unauthorized: please log in first" }`。校验：`item.id` / `item.placeId` / `item.name` 任一缺失返回 400（`message` 提示列出必填字段）。
- 响应体：`Response.json(added, { status: 201 })` —— 新增成功的收藏条目。
- 用处：`repo.addItem(item)` 委托 Data Access 层写入 D1（userId 经构造器注入，忽略请求中的任何 userId），返回 201 Created。

### `DELETE`
- 类型：函数（Route API handler）
- HTTP 方法：`DELETE /03_Destination_Discovery_&_Inspiration/api/favourites?id=yyy`
- 请求参数：query `id`（缺失返回 400 `{ message: "id is required" }`）。鉴权：未登录返回 401。
- 响应体：`new Response(null, { status: 204 })` —— 空响应体（No Content）。
- 用处：`repo.removeItem(id)` 委托 Data Access 层删除记录（以会话 userId 限定，防越权），返回 204；删除不存在条目由仓储内部处理（幂等）。

### 错误处理汇总
- 未登录写操作：401 + `message` 提示；参数校验失败：400 + `message` 提示（各自独立）。
- JSON body 解析失败：`request.json().catch(() => null)` 按空 body 处理 → 校验必填字段后同样返回 400。
- 未捕获异常（如 D1 绑定缺失、数据库错误）：不在此处吞掉，直接向上抛出（框架默认 500），保证错误可观测。
