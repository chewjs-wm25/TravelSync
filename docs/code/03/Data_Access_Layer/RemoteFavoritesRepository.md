# RemoteFavoritesRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteFavoritesRepository.ts`
> - 类型：仓储实现（浏览器端 · 经 Route API 远程调用）

## 责任

本文件是模块 03 收藏夹仓储的「远程」实现，运行于**浏览器端**，通过 HTTP 调用 Route API（`app/api/discovery/favorites`）实现 `FavoritesRepository` 接口。职责单一：仅做参数序列化与响应解析，**不含任何 SQL / 数据库逻辑**（数据库操作由服务端 `D1FavoritesRepository` 承担）。

依赖方向为：浏览器端 BL → 本类 → Route API → `D1FavoritesRepository` → Cloudflare D1。

### 请求/响应契约

| 方法 | HTTP | 请求 | 成功响应体 | 返回值 |
| --- | --- | --- | --- | --- |
| `listItems` | GET | 查询串 `?userId=` | `FavoriteItemEntity[]`（数组） | 直接 `res.json()` |
| `addItem` | POST | JSON `{ userId, item }` | `FavoriteItemEntity`（条目） | 直接 `res.json()` |
| `removeItem` | DELETE | 查询串 `?userId=&id=` | 无 | `void` |

请求/响应示例（示意，非代码内固定值）：

```jsonc
// GET /api/discovery/favorites?userId=demo-user
// POST /api/discovery/favorites
{ "userId": "demo-user", "item": { "id": "geo-123", "placeId": "123", "name": "...", "thumbnailUrl": "...", "experienceType": "Museums & Culture" } }
// 响应（addItem）
{ "id": "geo-123", "placeId": "123", "name": "...", "thumbnailUrl": "...", "experienceType": "Museums & Culture" }
```

**错误语义**：任何非 2xx 响应均抛出带 HTTP 状态码的 `Error`（如 `` `Failed to load favourites (HTTP ${res.status})` ``），由调用方决定如何处理。`userId`/`id` 一律经 `encodeURIComponent` 编码，避免特殊字符破坏查询串。

**注意**：与其它 Remote 仓储（`RemoteEventRepository`、`RemoteQualityRatingRepository`、`RemotePlaceImageCacheRepository`）不同，本文件**没有导出单例常量**，仅导出类本身，实例化由调用方负责。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./FavoritesRepository` | 仅导入 `FavoriteItemEntity`、`FavoritesRepository` 类型，用于实现接口签名 |

外部库：无（使用 Web 标准 `fetch`，无额外依赖）。

## 导出与函数明细

### `FAVORITES_API`（模块内常量）

- 类型：常量（未导出）
- 传入：无
- 传出：字符串 `"/api/discovery/favorites"`。
- 用处：Route API 端点（模块 03 收藏夹），三个方法共用；为相对路径，由浏览器端按当前站点 origin 解析。

### `RemoteFavoritesRepository`

- 类型：类（`implements FavoritesRepository`）
- 传入：无（无构造参数）。
- 传出：三个接口方法的实现：
  - `listItems(userId: string): Promise<FavoriteItemEntity[]>` —— `fetch(\`${FAVORITES_API}?userId=${encodeURIComponent(userId)}\`)`（GET）；非 2xx 抛 `` `Failed to load favourites (HTTP ${res.status})` ``；成功时 `res.json()` 反序列化为 `FavoriteItemEntity[]`（Route API 响应体即数组）。
  - `addItem(userId: string, item: FavoriteItemEntity): Promise<FavoriteItemEntity>` —— POST，请求头 `Content-Type: application/json`，请求体 `JSON.stringify({ userId, item })`；非 2xx 抛 `` `Failed to add favourite (HTTP ${res.status})` ``；成功时 `res.json()` 返回服务端确认后的条目（`FavoriteItemEntity`）。
  - `removeItem(userId: string, id: string): Promise<void>` —— DELETE，URL 形如 `` `${FAVORITES_API}?userId=${encodeURIComponent(userId)}&id=${encodeURIComponent(id)}` ``；非 2xx 抛 `` `Failed to remove favourite (HTTP ${res.status})` ``；成功时无返回体。
- 用处：浏览器端收藏夹读写的标准入口。删除成功后调用方即可从本地收藏列表移除该条目；`listItems` 返回顺序由服务端保证（`created_at DESC`，最新在前）。

## 边界情况与错误处理

- **非 2xx 一律抛错**：三个方法对 `!res.ok` 抛出带 HTTP 状态码的 `Error`，错误消息区分操作（load / add / remove）。
- **参数编码**：`userId`/`id` 经 `encodeURIComponent` 编码，含空格、`&`、`=`、中文等特殊字符时查询串仍有效。
- **网络层错误未包装**：`fetch` 本身失败抛出的 `TypeError` 直接向上传播，由调用方统一处理。
- **响应体解析**：`listItems`/`addItem` 假定响应体为合法 JSON（数组/条目），解析失败直接传播；`removeItem` 无返回体，仅检查状态码。
- **重复添加**：本类不短路去重，重复 `addItem` 会透传到服务端并可能触发主键冲突错误，由 BL 层负责幂等。

## 设计要点与注意事项

- **无单例导出**：与其余 Remote 仓储不一致，调用方需自行 `new RemoteFavoritesRepository()`；若后续统一风格可补充单例（当前代码未提供）。
- **无状态**：每次调用独立发起 fetch，不缓存收藏数据；本地收藏状态由上层（BL/组件状态）维护。
- **幂等性由服务端保证**：`addItem` 重复添加同一 `id` 会触发 D1 主键冲突报错（服务端 `INSERT` 非 upsert），本类不做去重，由 BL 层负责。

## 关联文档

- [`FavoritesRepository.md`](./FavoritesRepository.md)：本类实现的仓储接口与实体定义。
- [`D1FavoritesRepository.md`](./D1FavoritesRepository.md)：服务端 D1 实现（本类经 Route API 转发的目标）。
