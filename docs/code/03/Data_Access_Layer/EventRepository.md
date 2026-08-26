# EventRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/EventRepository.ts`
> - 类型：仓储接口

## 责任

本文件是模块 03「节日/活动（Events）」数据的仓储接口定义，同时定义了贯穿全模块的事件实体类型 `EventEntity`。接口职责单一：封装活动数据的持久化读写契约，数据来源为官方活动爬取结果 `parsed_events.json`（由 DEV 同步按钮负责解析并写入 Cloudflare D1），本文件本身不包含任何业务判断（映射/编排由 Business Logic Layer 负责）。

作为四层架构中 Data Access Layer 与 Business Logic Layer 之间的边界，本文件保证：BL 层只依赖接口，DAL 实现可替换（本地硬编码 ↔ 远程 D1）而不影响上层代码。

### 实现类一览

| 实现类 | 运行环境 | 数据源/方式 | 场景 |
| --- | --- | --- | --- |
| `HardcodedEventRepository` | 浏览器端 | 直接读取 `parsed_events.json`（打包内联） | 同步链路的 JSON 快照源 |
| `D1EventRepository` | 服务端（Route API） | 操作 Cloudflare D1，SQL 内聚于该类 | 活动数据持久化 |
| `RemoteEventRepository` | 浏览器端 | 经 Route API（`app/03_Destination_Discovery_&_Inspiration/api/events`）转发到服务端实现 | 页面查询 / DEV 同步入口 |

### 数据流

- **查询链路（页面）**：浏览器端 BL → `RemoteEventRepository.listAll()` → Route API → `D1EventRepository.listAll()` → D1；
- **同步链路（DEV 按钮）**：`HardcodedEventRepository.listAll()` 取 JSON 快照 → BL 加工 → `RemoteEventRepository.upsertAll()` → Route API → `D1EventRepository.upsertAll()` → D1（`clearAll` 用于全量重建前清空）。

## 依赖

本文件为纯类型/接口声明，**没有任何 import**（不依赖模块 03 内部文件，也不依赖外部库）。

## 导出与函数明细

### `EventEntity`

- 类型：接口
- 传入：无（实体类型）
- 传出：活动条目对象，字段如下：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 活动唯一标识，由 title 生成的稳定 slug，对应 D1 表 `events` 的主键 |
| `title` | `string` | 活动名称 |
| `categories` | `string[]` | 活动分类（如 "Arts & Culture"、"Sports"），在 D1 中以 JSON 字符串存储 |
| `date` | `string` | 活动举办日期区间（如 "19 Jun 2026 - 25 Apr 2027"） |
| `location` | `string` | 活动举办地点 |
| `url` | `string` | 活动官方页面 URL |
| `syncedAt` | `number` | 写入/更新时间戳（毫秒） |

- 用处：对应 D1 表 `events` 的一行，是 `listAll()` / `upsertAll()` 的传输载体。`id` 的 slug 语义保证按 `id` upsert 时具备幂等性；`categories` 在接口层以数组表达，序列化细节（JSON 字符串）由 D1 实现内部处理，对上层透明。

### `EventRepository`

- 类型：接口
- 传入：无（接口本身）
- 传出：三个方法的签名与语义：

| 方法 | 签名 | 语义 |
| --- | --- | --- |
| `listAll` | `(): Promise<EventEntity[]>` | 列出全部活动条目；服务端实现按 `date ASC` 排序返回，浏览器端远程实现透传该顺序 |
| `upsertAll` | `(items: EventEntity[]): Promise<number>` | 批量写入/更新（按 `id` upsert），返回实际写入条数（含更新，非仅新增） |
| `clearAll` | `(): Promise<number>` | 清空全部活动数据，返回删除条数 |

- 用处：所有 Event 仓储实现的统一契约。三个方法覆盖「读取全量 → 批量同步 → 全量清空」的完整同步链路，供 DEV 同步按钮与页面查询复用。

## 边界情况与错误处理

- **错误处理职责下放**：接口本身不处理任何错误，由各实现类决定策略——`RemoteEventRepository` 对非 2xx 抛 `Error`；`D1EventRepository` 对脏数据内部容错（`parseCategories` 降级为 `[]`）；`HardcodedEventRepository` 不校验 JSON 合法性（依赖数据文件本身结构正确）。
- **空数据**：`listAll` 无数据时返回空数组（而非 null）；`upsertAll([])` 空数组直接返回 0（D1 实现循环不执行）；`clearAll` 对空表返回 0（D1 的 `meta.changes` 为 0）。
- **幂等**：`upsertAll` 对相同 `id` 重复调用只更新不新增（D1 的 `ON CONFLICT(id) DO UPDATE`），重复同步安全。
- **同步时序**：同步链路依赖「先 `listAll` 或 `clearAll` 再 `upsertAll`」的编排，接口本身不保证时序，由 BL 层控制。

## 设计要点与注意事项

- **异步契约与同步实现的差异**：接口方法均为异步（`Promise` 返回），而浏览器端硬编码实现 `HardcodedEventRepository.listAll()` 为同步方法（JSON 打包内联、无需 IO），二者为松耦合关系——硬编码实现未 `implements` 本接口，由使用方（BL 层同步服务）按需适配。
- **`syncedAt` 语义**：硬编码数据源中为 0（表示「尚未同步」），真实时间戳由服务端 upsert 时写入（D1 列 `synced_at`），可供上层判断数据同步新旧。
- **接口与 JSON 文件的关系**：`EventEntity` 与 `parsed_events.json` 原始行（`RawParsedEvent`）结构相近但多出 `id`、`syncedAt` 两字段，映射逻辑位于 `HardcodedEventRepository`。
- **相关文件**：`HardcodedEventRepository.ts`、`RemoteEventRepository.ts`、`D1EventRepository.ts`（三个实现类文件）、`parsed_events.json`（数据源）。

## 关联文档

- [`HardcodedEventRepository.md`](./HardcodedEventRepository.md)：浏览器端 JSON 直读实现。
- [`RemoteEventRepository.md`](./RemoteEventRepository.md)：浏览器端经 Route API 的远程实现。
- [`D1EventRepository.md`](./D1EventRepository.md)：服务端 Cloudflare D1 实现。
