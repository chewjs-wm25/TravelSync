# HardcodedQualityRatingRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/HardcodedQualityRatingRepository.ts`
> - 类型：仓储实现（浏览器端 · JSON 硬编码数据源）

## 责任

本文件是模块 03 官方品质评级数据的「硬编码 JSON」数据源实现，运行于**浏览器端**。职责单一：读取官方评级爬取结果 `officalQualityRating_hardcode.json`（同目录数据文件，与内部接口 `RawOfficialQualityRating` 结构一致），映射为 `OfficialQualityRatingEntity` 列表供上层使用；不包含匹配/回退等业务判断（由 Business Logic Layer 负责）。

它对应 `OfficialQualityRatingRepository` 接口的浏览器端直读实现，但**不 `implements` 该接口**：`listAll()` 为同步方法（JSON 在打包时内联，无需异步 IO）。典型使用场景是同步链路：本类提供评级原始数据快照 → BL 层经 Geoapify 匹配地点、补全详情 → `D1QualityRatingRepository.upsertAll()` 写入 D1。

### 关键设计

- **Geoapify 字段显式置 `null`**：映射时所有补全字段（`placeId`、`name`、`formatted`、地址字段、坐标、`confidence` 等 14 个）一律初始化为 `null`，等待同步时补全。显式置 `null` 而非省略，保证实体字段齐全、与 D1 表结构一一对应（D1 实现以 `?? null` 落库 SQL NULL）。
- **`syncedAt` 占位**：固定填 `0`，真实时间戳由同步链路在写入 D1 时填充。

### 字段映射

| JSON 原始字段（snake_case） | 实体字段 | 处理 |
| --- | --- | --- |
| `id` | `jsonId` | 原样透传（D1 主键） |
| `company_name` | `companyName` | 原样透传 |
| `company_address` | `companyAddress` | 原样透传 |
| `company_phone` | `companyPhone` | 原样透传（可空） |
| `duration` | `duration` | 原样透传 |
| `award_category` | `awardCategory` | 原样透传 |
| （无） | `placeId`、`name`、`formatted`、`addressLine1`、`addressLine2`、`city`、`state`、`country`、`countryCode`、`category`、`resultType`、`lat`、`lon`、`confidence` | 全部固定 `null` |
| （无） | `syncedAt` | 固定 `0` |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./officalQualityRating_hardcode.json` | 官方评级爬取结果数据源（同目录 JSON 文件，运行时内联；原始行含 id/company_name/company_address/company_phone/duration/award_category 六个 snake_case 字段） |
| `./OfficialQualityRatingRepository` | 仅导入 `OfficialQualityRatingEntity` 类型，作为映射输出的实体类型 |

外部库：无（未使用任何外部依赖）。

## 导出与函数明细

### `RawOfficialQualityRating`（内部接口）

- 类型：接口（未导出）
- 传入：无
- 传出：`officalQualityRating_hardcode.json` 原始行的形态：`id: string`、`company_name: string`、`company_address: string`、`company_phone: string | null`、`duration: string`、`award_category: string`（snake_case 字段，与 JSON 文件一致）。
- 用处：把 JSON 原始数据断言为强类型（`rawData as RawOfficialQualityRating[]`），供 `listAll()` 映射使用，保证字段名与 JSON 结构一致。

### `HardcodedQualityRatingRepository`

- 类型：类
- 传入：无（无构造参数）。
- 传出：
  - `listAll(): OfficialQualityRatingEntity[]`（同步）—— 将 JSON 全量行映射为 `OfficialQualityRatingEntity[]`：`jsonId = row.id`、`companyName = row.company_name`、`companyAddress = row.company_address`、`companyPhone = row.company_phone`、`duration`、`awardCategory = row.award_category` 原样透传；`placeId`、`name`、`formatted`、`addressLine1`、`addressLine2`、`city`、`state`、`country`、`countryCode`、`category`、`resultType`、`lat`、`lon`、`confidence` 全部置 `null`；`syncedAt = 0`。
- 用处：浏览器端读取全部官方评级原始数据的唯一切入点，供同步链路（Geoapify 匹配 → upsert D1）使用。字段名从 snake_case 到 camelCase 的映射在此完成。

### `hardcodedQualityRatingRepository`

- 类型：常量（模块级单例）
- 传入：无
- 传出：`new HardcodedQualityRatingRepository()` 的实例。
- 用处：模块内导出的默认单例，供调用方（如 BL 层同步服务）直接 import 使用，避免重复实例化。

## 边界情况与错误处理

- **`company_phone` 可空**：JSON 原始字段本身为 `string | null`，映射原样透传，实体与 D1 列（可空）保持一致。
- **Geoapify 字段全 null 的含义**：`listAll` 输出的补全字段全部为 `null`，表示「尚未同步/未匹配」，与「同步后仍无匹配」（也是 null）在实体层不可区分，由 BL 层结合 `syncedAt` 判断同步状态。
- **无运行时校验**：映射不做类型/字段校验，`rawData as RawOfficialQualityRating[]` 仅为编译期断言；若 JSON 缺字段将产生 `undefined` 并被原样透传。
- **空数据文件**：JSON 为空数组时 `listAll` 返回空数组，同步链路自然跳过。

## 设计要点与注意事项

- 本实现是**只读数据源**：没有 `upsertAll`/`clearAll`（写入由 D1 实现承担），因此不完整实现 `OfficialQualityRatingRepository` 接口，与 `HardcodedEventRepository` 的设计一致。
- 原始 JSON 中 `company_phone` 本身可空（`string | null`），映射时原样透传；其余原始字段假定非空。
- 映射过程不校验 JSON 数据合法性，依赖数据文件本身结构正确（爬取/生成时保证）。

## 关联文档

- [`OfficialQualityRatingRepository.md`](./OfficialQualityRatingRepository.md)：本类映射输出的实体类型与仓储接口定义。
- [`D1QualityRatingRepository.md`](./D1QualityRatingRepository.md)：服务端 D1 实现（同步链路的落库目标）。
