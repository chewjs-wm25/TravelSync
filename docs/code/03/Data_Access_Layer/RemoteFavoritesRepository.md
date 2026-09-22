# RemoteFavoritesRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteFavoritesRepository.ts`
> - 类型：仓储实现（浏览器端 · 经 Route API 远程调用）

## 责任

本文件是模块 03 收藏夹仓储的「远程」实现，运行于**浏览器端**，通过 HTTP 调用 Route API（`/03_Destination_Discovery_&_Inspiration/api/favourites`，路径遵循 guideline §5）实现 `FavoritesRepository` 接口。职责单一：仅做参数序列化与响应解析，**不含任何 SQL / 数据库逻辑**（数据库操作由服务端 `D1FavoritesRepository` 承担）。

依赖方向为：浏览器端 BL → 本类 → Route API → `D1FavoritesRepository` → Cloudflare D1。

**授权（安全审计修复，见 docs/fix/module03-security-audit.md §3.1）**：请求携带当前会话凭证（`Authorization: Bearer <token>`，经 `sessionAuthHeaders()`），服务端以会话解析当前用户 ID——接口签名已完全移除 userId 参数（安全审计修复后的最终形态），本类不向服务端传递任何 userId，杜绝"前端指定任意 userId"的越权路径。未登录（无 token）时：GET 返回空列表（服务端按匿名返回 `[]`），POST / DELETE 服务端返回 401 并在此抛出 `Error`。

### 请求/响应契约

| 方法 | HTTP | 请求 | 成功响应体 | 返回值 |
| --- | --- | --- | --- | --- |
| `listItems` | GET | 无 query（userId 以会话为准） | `FavoriteItemEntity[]`（数组） | 直接 `res.json()` |
| `addItem` | POST | JSON `{ item }`（userId 以会话为准） | `FavoriteItemEntity`（条目） | 直接 `res.json()` |
| `removeItem` | DELETE | 查询串 `?id=` | 无（204） | `void` |

请求/响应示例（示意，非代码内固定值）：

```jsonc
// GET /03_Destination_Discovery_&_Inspiration/api/favourites
// POST /03_Destination_Discovery_&_Inspiration/api/favourites
{ "item": { "id": "geo-123", "placeId": "123", "name": "...", "thumbnailUrl": "...", "experienceType": "Museums & Culture" } }
// 响应（addItem）
{ "id": "geo-123", "placeId": "123", "name": "...", "thumbnailUrl": "...", "experienceType": "Museums & Culture" }
// DELETE /03_Destination_Discovery_&_Inspiration/api/favourites?id=geo-123 → 204
```

**错误语义**：任何非 2xx 响应均抛出带 HTTP 状态码的 `Error`（如 `` `Failed to load favourites (HTTP ${res.status})` ``），由调用方决定如何处理。`id` 经 `encodeURIComponent` 编码，避免特殊字符破坏查询串。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./FavoritesRepository` | 仅导入 `FavoriteItemEntity`、`FavoritesRepository` 类型，用于实现接口签名 |
| `./sessionAuth` | `sessionAuthHeaders()`（携带当前会话 `Authorization` 凭证） |

外部库：无（使用 Web 标准 `fetch`，无额外依赖）。

## 导出与函数明细

### `FAVORITES_API`（模块内常量）

- 类型：常量（未导出）
- 传入：无
- 传出：字符串 `"/03_Destination_Discovery_&_Inspiration/api/favourites"`。
- 用处：Route API 端点（模块 03 收藏夹），三个方法共用；**前导 `/` 保证任意子路由下均解析到站点根路径**（guideline §5 统一路径格式）。

### `RemoteFavoritesRepository`

- 类型：类（`implements FavoritesRepository`）
- 传入：无（无构造参数）。
- 传出：三个接口方法的实现（接口签名不含 userId 参数——服务端以会话凭证解析用户 ID，不信任前端传入的 userId）：
  - `listItems(): Promise<FavoriteItemEntity[]>` —— `fetch(FAVORITES_API)`（GET，携带会话凭证）；非 2xx 抛 `` `Failed to load favourites (HTTP ${res.status})` ``；成功时 `res.json()` 反序列化为 `FavoriteItemEntity[]`（Route API 响应体即数组）。
  - `addItem(item: FavoriteItemEntity): Promise<FavoriteItemEntity>` —— POST，请求头 `Content-Type: application/json` + 会话凭证，请求体 `JSON.stringify({ item })`；非 2xx 抛 `` `Failed to add favourite (HTTP ${res.status})` ``；成功时 `res.json()` 返回服务端确认后的条目（`FavoriteItemEntity`）。
  - `removeItem(id: string): Promise<void>` —— DELETE，URL 形如 `` `${FAVORITES_API}?id=${encodeURIComponent(id)}` ``（携带会话凭证）；非 2xx 抛 `` `Failed to remove favourite (HTTP ${res.status})` ``；成功时无返回体（204）。
- 用处：浏览器端收藏夹读写的标准入口。删除成功后调用方即可从本地收藏列表移除该条目；`listItems` 返回顺序由服务端保证（`created_at DESC`，最新在前）。

### 常量 `remoteFavoritesRepository`（单例导出）

- 类型：常量（`RemoteFavoritesRepository` 实例）
- 用处：模块内共享的收藏仓储单例，BL 层 `sharedFavoritesRepository` 的默认实现；保证 DiscoveryService 与 FavoritesService 读写同一份数据。

## 边界情况与错误处理

- **非 2xx 一律抛错**：三个方法对 `!res.ok` 抛出带 HTTP 状态码的 `Error`，错误消息区分操作（load / add / remove）。
- **参数编码**：`id` 经 `encodeURIComponent` 编码，含空格、`&`、`=`、中文等特殊字符时查询串仍有效。
- **网络层错误未包装**：`fetch` 本身失败抛出的 `TypeError` 直接向上传播，由调用方统一处理。
- **响应体解析**：`listItems`/`addItem` 假定响应体为合法 JSON（数组/条目），解析失败直接传播；`removeItem` 无返回体，仅检查状态码。
- **重复添加**：本类不短路去重，重复 `addItem` 会透传到服务端并可能触发主键冲突错误，由 BL 层负责幂等。

## 设计要点与注意事项

- **单例导出**：文件末尾导出 `remoteFavoritesRepository` 单例（BL 层共享使用），与其余 Remote 仓储风格一致。
- **无状态**：每次调用独立发起 fetch，不缓存收藏数据；本地收藏状态由上层（BL/组件状态）维护。
- **幂等性由服务端保证**：`addItem` 重复添加同一 `id` 会触发 D1 主键冲突报错（服务端 `INSERT` 非 upsert），本类不做去重，由 BL 层负责。

## 关联文档

- [`FavoritesRepository.md`](./FavoritesRepository.md)：本类实现的仓储接口与实体定义。
- [`D1FavoritesRepository.md`](./D1FavoritesRepository.md)：服务端 D1 实现（本类经 Route API 转发的目标）。
