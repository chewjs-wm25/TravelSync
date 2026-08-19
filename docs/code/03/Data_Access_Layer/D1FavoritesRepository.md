# D1FavoritesRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/D1FavoritesRepository.ts`
> - 类型：仓储实现（服务端 · Cloudflare D1）

## 责任

本文件是模块 03 收藏夹（Favourite List）仓储的 **Cloudflare D1 直接实现**，运行于**服务端**（Cloudflare Workers / Route API），将用户收藏条目持久化到 D1 数据库，实现 `FavoritesRepository` 接口。全部数据库操作（建表、查询、插入、删除）内聚在本类，**不包含任何 HTTP / 路由逻辑**（传输由 Route API 承担）。

使用方式：由 Route API（`app/api/discovery/favorites`）以 D1 binding 实例化，浏览器端经 `RemoteFavoritesRepository` → Route API → 本类完成读写。

### 关键实现点

- **懒建表**：`ensureTable()` 以 `CREATE TABLE IF NOT EXISTS` 幂等确保 `favorite_items` 表存在，首次请求无需手工建表；
- **按用户隔离**：所有 SQL 均以 `user_id` 为过滤/写入条件（`listItems` 的 `WHERE user_id = ?`、`removeItem` 的 `WHERE id = ? AND user_id = ?`），实现接口约定的「条目按 user_id 归属」；
- **创建时间自动填充**：`addItem` 的 `created_at` 列由服务端 `Date.now()` 注入（非客户端传入，防篡改），列表按 `created_at DESC` 排序，保证「最新收藏在前」。

### `favorite_items` 表结构（由本类 `ensureTable` 定义）

| 列名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PRIMARY KEY | 收藏条目 id（= 地点 POI id） |
| `user_id` | TEXT | NOT NULL | 所属用户 id |
| `place_id` | TEXT | NOT NULL | Geoapify 原始 place_id |
| `name` | TEXT | NOT NULL | 地点名称 |
| `thumbnail_url` | TEXT | NOT NULL DEFAULT '' | 缩略图 URL |
| `experience_type` | TEXT | NOT NULL DEFAULT '' | 体验类型 |
| `created_at` | INTEGER | NOT NULL | 收藏时间戳（毫秒） |

### 方法调用流程

1. Route API 收到请求 → 实例化 `D1FavoritesRepository(env.DB)`；
2. 三个方法内部均先调 `ensureTable()`（幂等建表）；
3. `listItems`：SELECT（列别名对应实体字段）→ `bind(userId)` → 返回数组（`created_at DESC`）；
4. `addItem`：INSERT（`created_at = Date.now()` 服务端注入）→ 原样返回 `item`；
5. `removeItem`：DELETE（`id` + `user_id` 双条件）→ 无返回体。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `@cloudflare/workers-types`（外部库） | 仅导入 `D1Database` 类型，用于构造器注入与 prepared statement 类型 |
| `./FavoritesRepository` | 导入 `FavoriteItemEntity`、`FavoritesRepository` 类型，实现接口契约 |

外部库：`@cloudflare/workers-types`（仅类型引用，无运行时依赖）。

## 导出与函数明细

### `D1FavoritesRepository`

- 类型：类（`implements FavoritesRepository`）
- 传入：构造器 `constructor(private readonly db: D1Database)` —— 注入 D1 数据库 binding。
- 传出：三个接口方法 + 一个私有方法：
  - `ensureTable(): Promise<void>`（私有）—— 执行 `CREATE TABLE IF NOT EXISTS favorite_items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, place_id TEXT NOT NULL, name TEXT NOT NULL, thumbnail_url TEXT NOT NULL DEFAULT '', experience_type TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`；幂等，首次访问时建表。
  - `listItems(userId: string): Promise<FavoriteItemEntity[]>` —— 先 `ensureTable()`，再 `SELECT id, place_id AS placeId, name, thumbnail_url AS thumbnailUrl, experience_type AS experienceType FROM favorite_items WHERE user_id = ? ORDER BY created_at DESC`（`.bind(userId)`）；结果直接映射为 `FavoriteItemEntity[]`（列别名与实体字段一一对应）。
  - `addItem(userId: string, item: FavoriteItemEntity): Promise<FavoriteItemEntity>` —— 先 `ensureTable()`，执行 `INSERT INTO favorite_items (id, user_id, place_id, name, thumbnail_url, experience_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`，`bind(item.id, userId, item.placeId, item.name, item.thumbnailUrl, item.experienceType, Date.now())`；成功后原样返回 `item`。
  - `removeItem(userId: string, id: string): Promise<void>` —— 先 `ensureTable()`，执行 `DELETE FROM favorite_items WHERE id = ? AND user_id = ?`（`bind(id, userId)`）；无返回体。`id` 与 `user_id` 双重限定防止越权删除他人收藏。
- 用处：服务端收藏数据的唯一持久化入口。`addItem` 使用普通 `INSERT`（非 upsert）：同一 `id` 重复收藏会因主键冲突报错，由 BL 层负责去重/幂等；`thumbnail_url`、`experience_type` 有默认空串兜底。

## 边界情况与错误处理

- **重复收藏**：`addItem` 使用普通 `INSERT`，同一 `(id)` 重复插入触发主键冲突（`id` 为 PRIMARY KEY），错误向上传播，由 BL 层负责去重。
- **删除不存在的条目**：`removeItem` 的 DELETE 影响 0 行时仍静默成功（不检查 `meta.changes`），幂等删除。
- **空收藏夹**：`listItems` 对无条目的用户返回空数组（SELECT 无结果）。
- **默认值兜底**：`thumbnail_url`、`experience_type` 有 `DEFAULT ''`，即使绑定空串也合法；`created_at` 恒由服务端 `Date.now()` 注入，客户端无法伪造排序依据。
- **SQL 注入防护**：`userId`/`id` 均通过 `bind` 参数化绑定，不拼接进 SQL 字符串。

## 设计要点与注意事项

- **无事务/批量**：三个方法均为单条 SQL，简单直接；收藏操作频率低、单条写入，无需批量优化。
- **创建时间不可由客户端指定**：`created_at` 恒为服务端 `Date.now()`，保证排序可信且防客户端伪造。
- **删除不检查影响行数**：`removeItem` 不校验 `meta.changes`，即使目标条目不存在也静默成功（幂等删除），符合「删除不存在条目不算错误」的语义。
- **与 Remote 实现的对应**：本类由 Route API 直接持有，`RemoteFavoritesRepository` 通过 HTTP 契约与其解耦；本类无单例导出，与 Remote 端保持一致（Remote 端同样无单例）。

## 关联文档

- [`FavoritesRepository.md`](./FavoritesRepository.md)：本类实现的仓储接口与实体定义。
- [`RemoteFavoritesRepository.md`](./RemoteFavoritesRepository.md)：浏览器端远程实现（经 Route API 转发到本类）。
