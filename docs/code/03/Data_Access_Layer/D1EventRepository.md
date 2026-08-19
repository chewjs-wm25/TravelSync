# D1EventRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/D1EventRepository.ts`
> - 类型：仓储实现（服务端 · Cloudflare D1）

## 责任

本文件是模块 03 节日/活动仓储的 **Cloudflare D1 直接实现**，运行于**服务端**（Cloudflare Workers / Route API），将 `parsed_events.json` 的解析结果持久化到 D1 数据库，实现 `EventRepository` 接口。全部数据库操作（建表、查询、批量 upsert、清空）内聚在本类，**不包含任何 HTTP / 路由逻辑**（传输由 Route API 承担）。

使用方式：由 Route API（`app/api/discovery/events`）以 D1 binding 实例化（如 `new D1EventRepository(env.DB)`），浏览器端经 `RemoteEventRepository` → Route API → 本类完成读写。

### 关键实现点

- **懒建表**：`ensureTable()` 在读写前以 `CREATE TABLE IF NOT EXISTS` 幂等确保 `events` 表存在，首次请求无需手工建表（建表语句与项目 schema.sql 对应）；
- **categories 序列化**：D1 中 `categories` 列以 JSON 字符串存储（列默认值 `'[]'`），写入时 `JSON.stringify`，读取时经 `parseCategories` 反序列化并做容错降级；
- **upsert 幂等**：`INSERT ... ON CONFLICT(id) DO UPDATE`，按 `id`（title slug）去重，同一活动重复同步只更新不新增；
- **排序稳定**：`listAll` 按 `date ASC` 返回，保证页面展示顺序一致。

### `events` 表结构（由本类 `ensureTable` 定义）

| 列名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | TEXT | PRIMARY KEY | 活动 slug 主键 |
| `title` | TEXT | NOT NULL | 活动名称 |
| `categories` | TEXT | NOT NULL DEFAULT '[]' | 分类的 JSON 字符串 |
| `date` | TEXT | NOT NULL | 举办日期区间 |
| `location` | TEXT | NOT NULL | 举办地点 |
| `url` | TEXT | NOT NULL | 官方页面 URL |
| `synced_at` | INTEGER | NOT NULL | 同步时间戳（毫秒） |

### 方法调用流程

1. Route API 收到请求 → 实例化 `D1EventRepository(env.DB)`；
2. `listAll`/`upsertAll` 内部先调 `ensureTable()`（幂等建表）；
3. `listAll`：单条 SELECT（含 `synced_at AS syncedAt` 别名）→ 逐行 `parseCategories` → 返回数组；
4. `upsertAll`：预编译 INSERT...ON CONFLICT 语句 → 逐条 `bind().run()` → 返回 `items.length`；
5. `clearAll`：单条 DELETE → 返回 `meta.changes`（表不存在时按 0 处理）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `@cloudflare/workers-types`（外部库） | 仅导入 `D1Database` 类型，用于构造器注入与 prepared statement 类型 |
| `./EventRepository` | 导入 `EventEntity`、`EventRepository` 类型，实现接口契约 |

外部库：`@cloudflare/workers-types`（仅类型引用，无运行时依赖）。

## 导出与函数明细

### `D1EventRepository`

- 类型：类（`implements EventRepository`）
- 传入：构造器 `constructor(private readonly db: D1Database)` —— 注入 D1 数据库 binding。
- 传出：三个接口方法 + 一个私有方法：
  - `ensureTable(): Promise<void>`（私有）—— 执行 `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, title TEXT NOT NULL, categories TEXT NOT NULL DEFAULT '[]', date TEXT NOT NULL, location TEXT NOT NULL, url TEXT NOT NULL, synced_at INTEGER NOT NULL)`；幂等，首次访问时建表。
  - `listAll(): Promise<EventEntity[]>` —— 先 `ensureTable()`，再 `SELECT id, title, categories, date, location, url, synced_at AS syncedAt FROM events ORDER BY date ASC`；结果行映射为 `EventEntity`，其中 `categories` 列经 `parseCategories` 反序列化为数组（`synced_at` 经 SQL 别名 `syncedAt` 直接对应实体字段）。
  - `upsertAll(items: EventEntity[]): Promise<number>` —— 先 `ensureTable()`，预编译 `INSERT INTO events (id, title, categories, date, location, url, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, categories = excluded.categories, date = excluded.date, location = excluded.location, url = excluded.url, synced_at = excluded.synced_at`；对每个 item 用 `bind(item.id, item.title, JSON.stringify(item.categories), item.date, item.location, item.url, item.syncedAt)` 逐条执行；返回 `items.length`（实际写入条数，含更新）。
  - `clearAll(): Promise<number>` —— 执行 `DELETE FROM events`，返回 `result.meta.changes`（删除条数）。注意本方法**不先 `ensureTable()`**：表不存在时 D1 将 `DELETE` 视为 0 行变更，天然按 0 处理。
- 用处：服务端活动数据的唯一持久化入口。逐条 upsert（未用 D1 batch）实现简单且天然幂等；`syncedAt` 由同步链路传入（通常为 `Date.now()`），覆盖硬编码源的 0 占位。

### `parseCategories(raw: string): string[]`（内部函数）

- 类型：函数（未导出，模块级）
- 传入：`raw` —— D1 中 `categories` 列的 JSON 字符串。
- 传出：`string[]`。
- 用处：反序列化分类数组。`JSON.parse` 成功且为数组时，仅保留其中的字符串元素（`filter` 做类型收窄，剔除意外混入的非字符串项）；解析失败或非数组时降级返回 `[]`。该容错保证单个脏数据不会导致整条记录读取失败。

## 边界情况与错误处理

- **categories 脏数据降级**：读取时 `JSON.parse` 失败、非数组、或含非字符串元素，`parseCategories` 分别降级为 `[]` 或过滤掉非字符串项，单条脏数据不会拖垮整次读取。
- **空数组 upsert**：`upsertAll([])` 中循环不执行，直接返回 0（仍会先执行 `ensureTable`）。
- **clearAll 表不存在**：`clearAll` 不先建表，表不存在时 D1 将 DELETE 视为 0 行变更，返回 0。
- **主键冲突**：`upsertAll` 中重复 `id` 由 `ON CONFLICT(id) DO UPDATE` 消化，不会抛错；重复同步安全。
- **`syncedAt` 缺失/非法**：写入时按传入值原样绑定，接口假定调用方提供合法毫秒时间戳（硬编码源为 0 时也会原样写入 0）。

## 设计要点与注意事项

- **无 HTTP 逻辑**：本类不感知 Route API 的请求方法/路由，只暴露仓储方法；HTTP 语义映射完全由 Route API 层完成，符合四层架构的分层职责。
- **逐条写入性能**：`upsertAll` 对每条 item 单独 `bind().run()`，数据量大时存在 N 次往返；当前以简单性换取性能，若需批量可改用 D1 `batch`（代码中未使用）。
- **事务性**：`upsertAll` 非事务执行，中途失败可能留下部分写入；由上层同步服务决定是否整体重试（代码中未实现回滚）。
- **与 Remote 实现的对应**：本类由 Route API 直接持有，`RemoteEventRepository` 不直接引用本类，二者通过 HTTP 契约解耦。
