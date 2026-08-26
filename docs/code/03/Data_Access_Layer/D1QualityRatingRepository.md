# D1QualityRatingRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/D1QualityRatingRepository.ts`
> - 类型：仓储实现（服务端 · Cloudflare D1）

## 责任

本文件是模块 03 官方品质评级仓储的 **Cloudflare D1 直接实现**，运行于**服务端**（Cloudflare Workers / Route API），将官方评级数据（JSON 原始字段 + Geoapify 补全详情）持久化到 D1 数据库，实现 `OfficialQualityRatingRepository` 接口。全部数据库操作（建表、查询、批量 upsert、清空）内聚在本类，**不包含任何 HTTP / 路由逻辑**（传输由 Route API 承担）。

使用方式：由 Route API（`app/03_Destination_Discovery_&_Inspiration/api/official-quality-ratings`）以 D1 binding 实例化，浏览器端经 `RemoteQualityRatingRepository` → Route API → 本类完成读写。

### 关键实现点

- **懒建表**：`ensureTable()` 以 `CREATE TABLE IF NOT EXISTS` 幂等确保 `official_quality_ratings` 表存在，首次请求无需手工建表；
- **全列 upsert**：21 个列以 `UPSERT_COLUMNS` 常量统一定义，`INSERT` 与 `ON CONFLICT(json_id) DO UPDATE` 共用同一列名集合，按 `jsonId` 幂等更新全部字段（含 Geoapify 补全结果，同步后重复执行不会产生重复行）；
- **可选字段归一**：Geoapify 补全字段为可选（`undefined` 或 `null`），`bind` 时统一 `?? null` 写入 SQL NULL；
- **坐标用 REAL 列**：`lat`、`lon`、`confidence` 为 `REAL` 类型（浮点存储）。

### `official_quality_ratings` 表结构（由本类 `ensureTable` 定义，21 列）

| 列名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `json_id` | TEXT | PRIMARY KEY | 评级 JSON 原始 id |
| `company_name` / `company_address` | TEXT | NOT NULL | 公司名称 / 地址 |
| `company_phone` | TEXT | 可空 | 公司电话 |
| `duration` / `award_category` | TEXT | NOT NULL | 评级有效期 / 档位（Platinum/Gold/Silver） |
| `place_id`、`name`、`formatted` | TEXT | 可空 | Geoapify place_id / 名称 / 格式化地址 |
| `address_line1`、`address_line2`、`city`、`state`、`country`、`country_code`、`category`、`result_type` | TEXT | 可空 | Geoapify 结构化地址与分类 |
| `lat`、`lon`、`confidence` | REAL | 可空 | 坐标（浮点）与匹配置信度 |
| `synced_at` | INTEGER | NOT NULL | 同步时间戳（毫秒） |

### 方法调用流程

1. Route API 收到请求 → 实例化 `D1QualityRatingRepository(env.DB)`；
2. `listAll`/`upsertAll` 内部先调 `ensureTable()`（幂等建表）；
3. `listAll`：单条 SELECT（21 列别名对应实体字段）→ `ORDER BY json_id ASC` → 返回数组；
4. `upsertAll`：以 `UPSERT_COLUMNS` 拼装 INSERT...ON CONFLICT（21 占位符）→ 逐条 `bind()`（可选字段 `?? null`）→ 返回 `items.length`；
5. `clearAll`：单条 DELETE → 返回 `meta.changes`（表不存在时按 0 处理）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `@cloudflare/workers-types`（外部库） | 仅导入 `D1Database` 类型，用于构造器注入与 prepared statement 类型 |
| `./OfficialQualityRatingRepository` | 导入 `OfficialQualityRatingEntity`、`OfficialQualityRatingRepository` 类型，实现接口契约 |

外部库：`@cloudflare/workers-types`（仅类型引用，无运行时依赖）。

## 导出与函数明细

### `UPSERT_COLUMNS`（模块内常量）

- 类型：常量（未导出，模块级）
- 传入：无
- 传出：以逗号拼接的 21 个列名：`json_id, company_name, company_address, company_phone, duration, award_category, place_id, name, formatted, address_line1, address_line2, city, state, country, country_code, category, result_type, lat, lon, confidence, synced_at`。
- 用处：`INSERT INTO official_quality_ratings (${UPSERT_COLUMNS})` 与 `ON CONFLICT(json_id) DO UPDATE SET`（全部列 `= excluded.<列>`）共用同一列名集合，保证 INSERT 列序、占位符序与 UPDATE 赋值一一对应，避免手写错位。

### `D1QualityRatingRepository`

- 类型：类（`implements OfficialQualityRatingRepository`）
- 传入：构造器 `constructor(private readonly db: D1Database)` —— 注入 D1 数据库 binding。
- 传出：三个接口方法 + 一个私有方法：
  - `ensureTable(): Promise<void>`（私有）—— 执行上表 21 列的 `CREATE TABLE IF NOT EXISTS official_quality_ratings (...)`；幂等，首次访问时建表。Geoapify 字段与 `company_phone` 可空，`lat`/`lon`/`confidence` 为 REAL。
  - `listAll(): Promise<OfficialQualityRatingEntity[]>` —— 先 `ensureTable()`，再 `SELECT json_id AS jsonId, company_name AS companyName, company_address AS companyAddress, company_phone AS companyPhone, duration, award_category AS awardCategory, place_id AS placeId, name, formatted, address_line1 AS addressLine1, address_line2 AS addressLine2, city, state, country, country_code AS countryCode, category, result_type AS resultType, lat, lon, confidence, synced_at AS syncedAt FROM official_quality_ratings ORDER BY json_id ASC`；结果直接映射为 `OfficialQualityRatingEntity[]`（21 个列别名与实体字段一一对应）。
  - `upsertAll(items: OfficialQualityRatingEntity[]): Promise<number>` —— 先 `ensureTable()`，预编译 `` INSERT INTO official_quality_ratings (${UPSERT_COLUMNS}) VALUES (?, ?, ..., 共 21 个占位符) ON CONFLICT(json_id) DO UPDATE SET `` + 全部列 `= excluded.<列>`（21 项）；对每个 item 按 `UPSERT_COLUMNS` 顺序 `bind(jsonId, companyName, companyAddress, companyPhone, duration, awardCategory, placeId, name, formatted, addressLine1 ?? null, addressLine2 ?? null, city ?? null, state ?? null, country ?? null, countryCode ?? null, category ?? null, resultType ?? null, lat ?? null, lon ?? null, confidence ?? null, syncedAt)` 逐条执行；返回 `items.length`（实际写入条数，含更新）。
  - `clearAll(): Promise<number>` —— 执行 `DELETE FROM official_quality_ratings`，返回 `result.meta.changes`（删除条数；表不存在时 D1 按 0 行变更处理，因此不先 ensureTable）。
- 用处：服务端官方评级数据的唯一持久化入口。逐条 upsert 天然幂等（同一 `jsonId` 重复同步只更新）；Geoapify 字段缺省时写入 SQL NULL，回读时保持 `null`，与实体可选字段语义一致。

## 边界情况与错误处理

- **可选字段归一**：实体中 Geoapify 可选字段为 `undefined`（同步前缺省）或 `null`（同步后未匹配）时，`bind` 统一 `?? null` 写入 SQL NULL，回读时保持 `null`，落库状态一致。
- **空数组 upsert**：`upsertAll([])` 中循环不执行，直接返回 0（仍会先执行 `ensureTable`）。
- **clearAll 表不存在**：`clearAll` 不先建表，表不存在时 D1 将 DELETE 视为 0 行变更，返回 0。
- **主键冲突**：`upsertAll` 中重复 `jsonId` 由 `ON CONFLICT(json_id) DO UPDATE` 消化，不会抛错；重复同步安全。
- **REAL 列精度**：`lat`/`lon`/`confidence` 以 REAL 存储浮点，回读时保持数值类型；`company_phone` 等可空 TEXT 列为 SQL NULL 时回读为 `null`。

## 设计要点与注意事项

- **`?? null` 归一**：实体中可选补全字段可能为 `undefined`（同步前）或 `null`（同步后未匹配），`bind` 统一转为 SQL NULL，保证落库状态一致、避免 D1 对 `undefined` 的绑定歧义。
- **无 HTTP 逻辑**：本类不感知 Route API 的请求方法/路由，只暴露仓储方法；HTTP 语义映射完全由 Route API 层完成。
- **逐条写入**：`upsertAll` 对每条 item 单独 `bind().run()`（未用 D1 batch），以简单性换取性能；中途失败可能留下部分写入，由上层同步服务决定是否重试。
- **与 Remote 实现的对应**：本类由 Route API 直接持有，`RemoteQualityRatingRepository` 通过 HTTP 契约与其解耦。
