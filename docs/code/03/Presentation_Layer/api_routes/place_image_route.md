# place-image/route.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/api/place-image/route.ts`
> - 类型：服务端 Route API（Next.js App Router Route Handler，薄传输桥）

## 责任

`place-image/route.ts` 是模块 03 地点图片缓存的 Route API，职责单一：HTTP 传输层——解析/校验请求参数、获取 Cloudflare KV binding（`PLACE_IMAGE_CACHE`）、实例化 `CloudflareKvPlaceImageCacheRepository` 并委托其方法、序列化响应。**本文件不含任何 KV 读写逻辑**（KV 操作全部位于 Data Access 层 `CloudflareKvPlaceImageCacheRepository` 内）。

它是 BL 层 `getPlaceImage` 图片查询链（Wikivoyage 条目配图 → Wikipedia 条目配图 → Wikimedia Commons Geosearch → Mapillary 兜底）的**引用缓存持久层**：重复浏览/翻页时不重复消耗免费 API 额度（Wikimedia 匿名配额、Mapillary 免费套餐）。数据流：`hooks.usePlaceImages` → BL 层 `discoveryService.getPlaceImage` → 先查本端点的引用缓存（`GET`），未命中才走真实查询链，确定结果后回写（`PUT`）。

**值语义（与仓储一致，v5 来源引用格式）**：
- `GET` 返回 `{ entry }`：`entry: null` = 未缓存；`{source:"none"}` = 确定无图（负缓存，避免反复查）；`{source:"wikimedia", url}` = 永久 URL（可直接缓存 URL）；`{source:"mapillary", imageId}` = 图片 id（**URL 有时效，用 id 换取新 URL，不得缓存 URL**）。
- `PUT` 写入 `{ placeId, entry }`，`entry.source` 枚举校验（`isValidEntry` 类型守卫：`none` / `wikimedia`+url / `mapillary`+imageId）。

端点提供三个操作：`GET`（读缓存，公开）、`PUT`（写缓存，登录用户）、`DELETE`（清空全部缓存，管理员）。

## 请求 / 响应示例

```
GET /03_Destination_Discovery_&_Inspiration/api/place-image?placeId=geocode:abc
    → 200 { "entry": null }                                  // 未缓存
    → 200 { "entry": { "source": "none" } }                  // 确定无图（负缓存）
    → 200 { "entry": { "source": "wikimedia", "url": "https://upload.wikimedia.org/..." } }
    → 200 { "entry": { "source": "mapillary", "imageId": "123456789" } }

PUT /03_Destination_Discovery_&_Inspiration/api/place-image
    body: { "placeId": "geocode:abc", "entry": { "source": "wikimedia", "url": "https://..." } }
    → 200 { "success": true }

DELETE /03_Destination_Discovery_&_Inspiration/api/place-image
    → 200 { "cleared": true }
```

## 错误码汇总

| 状态码 | 场景 | 响应体 |
| --- | --- | --- |
| 400 | GET 缺 `placeId` | `{ "message": "placeId is required" }` |
| 401 | PUT 未登录 | `requireUser` 返回的 401 响应 |
| 400 | PUT 缺 `placeId` | `{ "message": "placeId is required" }` |
| 400 | PUT `entry` 结构非法 | `{ "message": "entry must be {source:'none'} \| {source:'wikimedia',url(http/https)} \| {source:'mapillary',imageId}" }` |
| 400 | body 非合法 JSON | 同 placeId / entry 校验错误（按空 body 处理） |
| 401 / 403 | DELETE 未登录 / 非管理员 | `requireAdmin` 返回的响应 |
| 500（默认） | KV 绑定缺失 / KV 异常 | 框架默认错误页（未捕获异常） |

## 安全与分层要点

- **薄传输**：文件内无 KV 读写逻辑，全部委托 Data Access 层仓储，符合分层约束；
- **授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）**：`GET` 公开读缓存（匿名可访问）；`PUT` 写入缓存为正常用户流程，要求登录会话（`requireUser`，未登录 401）；`DELETE` 清空全部缓存为危险操作，要求管理员会话（`requireAdmin`，未登录 401 / 非 admin 403）；
- **binding 获取**：`getCloudflareContext({ async: true })` 在 Cloudflare Workers 环境异步解析 `PLACE_IMAGE_CACHE` KV binding；
- **结构校验**：`isValidEntry` 类型守卫做来源枚举 + 对应引用字段（`url` / `imageId`）校验，防止写入非法缓存条目；
- **URL 时效策略**：Mapillary 的 URL 有时效，只缓存 `imageId` 不缓存 URL；Wikimedia URL 为永久 URL 可直存——值语义由 Data Access 层与 BL 层共同维护，本端点负责透传；
- **负缓存**：`{source:"none"}` 表示确定无图，避免对无图地点反复走查询链消耗免费配额。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../../../../data_access_layer/03_Destination_Discovery_&_Inspiration/PlaceImageCacheRepository` | KV 图片缓存仓储：`get` / `put` / `clearAll`，以及类型 `PlaceImageCacheEntry`、`CloudflareKvPlaceImageCacheRepository`（仅记录 import，未打开源文件） |
| 外部库：`@opennextjs/cloudflare`（`getCloudflareContext`） | 获取当前环境 KV binding（`env.PLACE_IMAGE_CACHE`） |

## 导出与函数明细

### `placeImageCacheRepo`（文件内 helper）
- 类型：函数（异步）
- 传入：无
- 传出：`Promise<CloudflareKvPlaceImageCacheRepository>` —— 以 `getCloudflareContext({ async: true })` 取得的 `env.PLACE_IMAGE_CACHE` 构建仓储实例。
- 用处：三个 HTTP handler 共用的仓储构造入口。

### `isValidEntry`（文件内 helper）
- 类型：函数（TypeScript 类型守卫）
- 传入：`entry: unknown`
- 传出：`entry is PlaceImageCacheEntry` —— 校验规则：
  - 非对象返回 false；
  - `source === "none"` 恒合法；
  - `source === "wikimedia"` 须 `url` 为非空 string 且匹配 http/https 协议（`HTTP_URL_PATTERN`，防 `javascript:`/`data:` 等异常协议注入，纵深防御见 docs/fix/module03-security-audit.md §3.2）；
  - `source === "mapillary"` 须 `imageId` 为非空 string；
  - 未知 source 返回 false。
- 用处：`PUT` 写入前校验缓存条目结构，非法则返回 400 并提示合法结构。

### `GET`
- 类型：函数（Route API handler）
- HTTP 方法：`GET /03_Destination_Discovery_&_Inspiration/api/place-image?placeId=xxx`
- 请求参数：query `placeId`（必填，`trim` 后非空，否则 400 `{ message: "placeId is required" }`）
- 响应体：`Response.json({ entry })` —— `entry` 为 `PlaceImageCacheEntry | null`（null = 未缓存）。
- 用处：`repo.get(placeId)` 委托 Data Access 层读 KV；BL 层图片查询链据此判断是否命中引用缓存（含负缓存 `{source:"none"}`）。

### `PUT`
- 类型：函数（Route API handler）
- HTTP 方法：`PUT /03_Destination_Discovery_&_Inspiration/api/place-image`
- 请求参数：body `{ placeId: string, entry: PlaceImageCacheEntry }`；`request.json()` 解析失败（`.catch(() => null)`）视为空 body。鉴权：`requireUser(request)`，未登录返回 401。校验：
  - `placeId`：须为非空 string（`trim` 后），否则 400 `{ message: "placeId is required" }`；
  - `entry`：须通过 `isValidEntry`（wikimedia 的 url 还须匹配 http/https 协议），否则 400 `{ message: "entry must be {source:'none'} | {source:'wikimedia',url(http/https)} | {source:'mapillary',imageId}" }`。
- 响应体：`Response.json({ success: true })`（结果标志遵循 guideline §5，禁止 `ok`）。
- 用处：`repo.put(placeId, entry)` 委托 Data Access 层写 KV；BL 层在确定图片查询链结果（含确定无图 `none`）后回写缓存。

### `DELETE`
- 类型：函数（Route API handler）
- HTTP 方法：`DELETE /03_Destination_Discovery_&_Inspiration/api/place-image`
- 请求参数：无
- 鉴权：`requireAdmin(request)`，未登录返回 401 / 非管理员返回 403。
- 响应体：`Response.json({ cleared })` —— 清除操作结果。
- 用处：`repo.clearAll()` 委托 Data Access 层清空全部地点图片缓存（管理员专用，如数据源更新后需强制刷新缓存时使用）。

### 错误处理汇总
- `GET` 缺 `placeId`：400；`PUT` 缺 `placeId` 或 `entry` 非法：400 + 对应 `message`；JSON body 解析失败按空 body 处理 → 校验后 400。
- 未捕获异常（KV 绑定缺失、KV 读写错误）：不在此处吞掉，直接向上抛出（框架默认 500），保证错误可观测。
