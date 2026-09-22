# OfficialQualityRatingRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/OfficialQualityRatingRepository.ts`
> - 类型：仓储接口

## 责任

本文件是模块 03「官方品质评级（Official Quality Rating）」数据的仓储接口定义，同时定义了贯穿全模块的实体类型 `OfficialQualityRatingEntity`。接口职责单一：封装官方品质评级数据的持久化读写契约，不包含任何业务判断（地点匹配/回退策略由 Business Logic Layer 负责）。

数据模型要点：官方评级原始数据来自官方评级 hardcode JSON（`officalQualityRating_hardcode.json`），**经 Geoapify 补全地点详情后**写入 Cloudflare D1。因此实体由两部分构成：

1. **JSON 原始字段**：公司名称、地址、电话、评级有效期、评级档位；
2. **Geoapify 补全字段**：place_id、名称、结构化地址、坐标、置信度等，未匹配到地点时为 `null`。

### 实现类一览

| 实现类 | 运行环境 | 数据源/方式 | 场景 |
| --- | --- | --- | --- |
| `HardcodedQualityRatingRepository` | 浏览器端 | 直接读取 `officalQualityRating_hardcode.json` | 同步链路的 JSON 快照源 |
| `D1QualityRatingRepository` | 服务端（Route API） | 操作 Cloudflare D1，SQL 内聚于该类 | 评级数据持久化 |
| `RemoteQualityRatingRepository` | 浏览器端 | 经 Route API（`app/03_Destination_Discovery_&_Inspiration/api/official-quality-ratings`）转发到服务端实现 | 页面查询 / DEV 同步入口 |

### 数据流

- **查询链路（页面）**：浏览器端 BL → `RemoteQualityRatingRepository.listAll()` → Route API → `D1QualityRatingRepository.listAll()` → D1；
- **同步链路（DEV 按钮）**：`HardcodedQualityRatingRepository.listAll()` 取 JSON 快照 → BL 层经 Geoapify 匹配地点、补全详情 → `RemoteQualityRatingRepository.upsertAll()` → Route API → `D1QualityRatingRepository.upsertAll()` → D1（`clearAll` 用于全量重建前清空）。

调用方（Business Logic Layer）只依赖本接口，切换实现时无需改动。

## 依赖

本文件为纯类型/接口声明，**没有任何 import**（不依赖模块 03 内部文件，也不依赖外部库）。

## 导出与函数明细

### `OfficialQualityRatingEntity`

- 类型：接口
- 传入：无（实体类型）
- 传出：官方品质评级条目对象，对应 D1 表 `official_quality_ratings` 的一行，字段分四组：

**① 主键与原始字段**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `jsonId` | `string` | JSON 原始条目 id（D1 主键） |
| `companyName` | `string` | 公司名称 |
| `companyAddress` | `string` | 公司地址 |
| `companyPhone` | `string \| null` | 公司电话（可为空） |
| `duration` | `string` | 官方评级有效期（如 "07/08/25 - 06/08/28"） |
| `awardCategory` | `string` | 官方品质评级（Platinum / Gold / Silver） |

**② Geoapify 必填补全字段**（未匹配到地点时为 `null`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `placeId` | `string \| null` | Geoapify place_id |
| `name` | `string \| null` | 地点名称 |
| `formatted` | `string \| null` | 格式化地址 |

**③ Geoapify 可选补全字段**（均可能缺省，缺省/未匹配均为 `null`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `addressLine1?`、`addressLine2?`、`city?`、`state?`、`country?`、`countryCode?`、`category?`、`resultType?` | `string \| null` | 结构化地址与分类 |
| `lat?`、`lon?` | `number \| null` | 坐标 |
| `confidence?` | `number \| null` | Geoapify 匹配置信度 0~1 |

**④ 同步元数据**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `syncedAt` | `number` | 写入/更新时间戳（毫秒） |

- 用处：官方评级数据的传输载体。`jsonId` 为 upsert 主键；Geoapify 补全字段使「爬取原始评级 → 匹配地点 → 入库」链路中的中间产物可被完整持久化与回读，供前端展示评级时附加地点详情。

### `OfficialQualityRatingRepository`

- 类型：接口
- 传入：无（接口本身）
- 传出：三个方法的签名与语义：

| 方法 | 签名 | 语义 |
| --- | --- | --- |
| `listAll` | `(): Promise<OfficialQualityRatingEntity[]>` | 列出全部官方评级条目 |
| `upsertAll` | `(items: OfficialQualityRatingEntity[]): Promise<number>` | 批量写入/更新（按 `jsonId` upsert），返回实际写入条数 |
| `clearAll` | `(): Promise<number>` | 清空全部官方评级数据，返回删除条数 |

- 用处：所有官方评级仓储实现的统一契约，覆盖「读取全量 → 批量同步（含 Geoapify 补全结果）→ 全量清空」的完整同步链路。与 `EventRepository` 的形态一致，便于 BL 层以同一套同步流程处理两类数据。

## 设计要点与注意事项

- **`jsonId` vs `placeId`**：`jsonId` 是评级爬取数据的自有 id（D1 主键）；`placeId` 是 Geoapify 匹配结果，可空。两者解耦，使「评级数据」与「地点数据」可独立演化。
- **可选补全字段的可空性**：接口层用 `?` 标注可选 + `| null`，反映「同步前缺省（undefined）/ 同步后未匹配（null）」两种状态，D1 实现以 `?? null` 统一落库为 SQL NULL。
- **与 Event 数据同步流程对称**：本接口刻意与 `EventRepository` 保持相同的三方法形态，降低 BL 层同步编排的复杂度。
- **相关文件**：`HardcodedQualityRatingRepository.ts`、`RemoteQualityRatingRepository.ts`、`D1QualityRatingRepository.ts`（三个实现类文件）、`officalQualityRating_hardcode.json`（数据源）。
