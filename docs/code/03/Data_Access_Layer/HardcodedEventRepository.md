# HardcodedEventRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/HardcodedEventRepository.ts`
> - 类型：仓储实现（浏览器端 · JSON 硬编码数据源）

## 责任

本文件是模块 03 节日/活动数据的「硬编码 JSON」数据源实现，运行于**浏览器端**。职责单一：读取官方活动爬取结果 `parsed_events.json`（同目录数据文件，与内部接口 `RawParsedEvent` 结构一致），将其映射为 `EventEntity` 列表供上层使用；不包含任何业务判断（由 Business Logic Layer 负责）。

它对应 `EventRepository` 接口的浏览器端直读实现，但**不 `implements` 该接口**：其 `listAll()` 为同步方法（直接返回数组而非 Promise），因为 JSON 在打包时已被 Vite/打包器内联，无需异步 IO。典型使用场景是 DEV 同步链路：`HardcodedEventRepository` 提供 JSON 全量快照 → BL 层加工 → `D1EventRepository.upsertAll()` 写入 D1。

### 关键设计

- **id 幂等**：映射时由活动 `title` 生成稳定 slug 作为 `id`（`titleToSlug`），该 id 与 D1 表 `events` 的主键语义一致——同一活动无论同步多少次，生成的 id 都相同，从而保证后续按 id upsert 幂等（重复同步只更新不新增）。
- **`syncedAt` 占位**：固定填 `0`，真实时间戳由同步服务（DEV 同步按钮链路）在写入 D1 时填充，此处 0 表示「尚未同步」。

### 字段映射

| JSON 原始字段（snake/原样） | 实体字段 | 处理 |
| --- | --- | --- |
| `title` | `id` | 经 `titleToSlug` 生成 slug |
| `title` | `title` | 原样透传 |
| `categories` | `categories` | 原样透传（数组） |
| `date` | `date` | 原样透传 |
| `location` | `location` | 原样透传 |
| `url` | `url` | 原样透传 |
| （无） | `syncedAt` | 固定 `0` |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./parsed_events.json` | 官方活动爬取结果数据源（同目录 JSON 文件，运行时内联；原始行含 title/categories/date/location/url 五个字段） |
| `./EventRepository` | 仅导入 `EventEntity` 类型，作为映射输出的实体类型 |

外部库：无（未使用任何外部依赖）。

## 导出与函数明细

### `RawParsedEvent`（内部接口）

- 类型：接口（未导出）
- 传入：无
- 传出：`parsed_events.json` 原始行的形态：`title: string`、`categories: string[]`、`date: string`、`location: string`、`url: string`（无 `id`、无 `syncedAt`）。
- 用处：把 JSON 原始数据断言为强类型（`rawData as RawParsedEvent[]`），供 `listAll()` 映射使用，保证字段名与 JSON 结构一致。

### `titleToSlug(title: string): string`（内部函数）

- 类型：函数（未导出）
- 传入：`title` —— 活动名称字符串。
- 传出：稳定 slug 字符串。处理规则：
  1. `toLowerCase()` 全部转小写；
  2. `replace(/[^a-z0-9]+/g, "-")` 将连续的非字母数字字符替换为单个连字符；
  3. `replace(/^-+|-+$/g, "")` 去除首尾连字符；
  4. 若结果为**空串**（title 全为非字母数字字符），回退为 `` `evt-${title.length}` ``（以长度保证唯一且非空）。
- 用处：生成 `EventEntity.id`（D1 主键）。同一 title 永远映射到同一 slug，是 upsert 幂等的前提；回退分支保证任何 title 都不会产生空 id。示例：`"Tatreez: Reclaiming Palestine"` → `"tatreez-reclaiming-palestine"`（基于正则规则推导，非代码内固定值）。

### `HardcodedEventRepository`

- 类型：类
- 传入：无（无构造参数）。
- 传出：
  - `listAll(): EventEntity[]`（同步）—— 将 JSON 全量行逐条映射为 `EventEntity`：`id = titleToSlug(row.title)`；`title`、`categories`、`date`、`location`、`url` 原样透传；`syncedAt = 0`。
- 用处：浏览器端读取全部活动的唯一切入点。同步返回便于同步服务在写入 D1 前先取得全量快照；`syncedAt: 0` 表示「尚未同步」，由同步链路在 upsert 时替换为真实时间戳（`Date.now()` 级别，毫秒）。

### `hardcodedEventRepository`

- 类型：常量（模块级单例）
- 传入：无
- 传出：`new HardcodedEventRepository()` 的实例。
- 用处：模块内导出的默认单例，供调用方（如 BL 层同步服务）直接 import 使用，避免重复实例化。

## 边界情况与错误处理

- **slug 回退**：标题全部为非字母数字字符（如纯中文/符号）时，`titleToSlug` 的输出为空串，自动回退为 `` `evt-${title.length}` ``，保证 id 非空；代价是这类标题的 id 失去可读性（但稳定）。
- **空 title**：`title.length === 0` 时同样触发回退分支，生成 `"evt-0"`；多个空/非字母数字标题可能产生相同 id，但 `parsed_events.json` 为爬取产物，假定标题唯一。
- **`categories` 假定为数组**：映射直接透传，若 JSON 中为非数组会破坏后续 `JSON.stringify` 序列化（数据文件生成时保证结构）。
- **无运行时校验**：映射不做类型/字段校验，`rawData as RawParsedEvent[]` 仅为编译期断言。

## 设计要点与注意事项

- 本实现是**只读数据源**：没有 `upsertAll`/`clearAll`（写入由 D1 实现承担），因此不完整实现 `EventRepository` 接口，这是有意为之——JSON 硬编码数据在项目中只作为「爬取产物快照」存在。
- 映射过程不校验 JSON 数据合法性，依赖数据文件本身结构正确（爬取/生成时保证）。
