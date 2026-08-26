# DiscoveryExternalApi.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/DiscoveryExternalApi.ts`
> - 对接的外部服务：暂无真实外部服务（筛选维度字典与州/省信息为硬编码占位；地点搜索/灵感合辑已拆分至同目录其他客户端）

## 责任

本文件是模块 03 的"外部第三方 API 客户端"总入口占位文件，职责单一：仅负责与外部第三方 API 交流（Geoapify 地理编码、官方活动数据源等），不包含业务规则、不触碰本地持久化、不编排跨模块流程。

当前实现状态：地点搜索与自动联想已迁至真实的 `GeoapifyGeocodingApi.ts`；灵感合辑已迁至真实的 `WikivoyageApi.ts`（由 Business Logic 层 `InspirationsService` 编排主题自动发现与内容聚合）；节日活动数据已迁移至 Cloudflare D1（`parsed_events.json` 经 DEV 按钮同步），由 Data Access 层 Event 仓储读取，不再经本 API。因此本文件仅剩**筛选维度字典**（`fetchFilterOptions`）与**州/省信息**（`fetchStateInfo`）两个对外方法，且暂无免费数据源可用，暂以硬编码静态候选占位。

关键设计：筛选字典的两组候选与业务层取值保持一致——`experienceTypes`（体验类型）与 BL 层 `geoapifyToPoiItem` 的 Geoapify 结果推断映射取值一致；`states`（马来西亚州/联邦直辖区）为静态地理事实（13 州 + 3 联邦直辖区，不含从搜索结果提取，因候选须完整）。州/省信息（`StateInfoDto`，供模块 02 创建旅行时选择州/省）坐标为州首府/主要城市静态地理事实，`imageUrl` 空串由前端渐变占位。未来对接真实 API 时，仅需替换各方法内部实现，方法签名保持不变，上层无需改动。旅游规划范围仅限马来西亚（项目约束）。

## 职责演进现状（截至本文件）

| 对外能力 | 当前状态 | 承接实现 |
| --- | --- | --- |
| 地点搜索与自动联想 | 已迁移真实 API | `./GeoapifyGeocodingApi.ts`（经本地代理 `/03_Destination_Discovery_&_Inspiration/api/geocode`） |
| 灵感合辑（主题发现/内容聚合） | 已迁移真实 API | `./WikivoyageApi.ts`（BL 层 `InspirationsService` 编排） |
| 筛选维度字典（体验类型/州属） | 硬编码静态候选占位 | 本文件 `fetchFilterOptions` → `MOCK_FILTER_OPTIONS` |
| 州/省信息（模块 02 创建旅行选州/省） | 硬编码静态候选占位 | 本文件 `fetchStateInfo` → `MOCK_STATE_INFO` |
| 节日活动数据 | 已迁移 Cloudflare D1 | `parsed_events.json` 经 DEV 按钮同步，由 Data Access 层 Event 仓储读取，不再经本 API |
| 未来：筛选维度字典 API（体验类型）/ 州/省信息 API | 仅替换方法内部实现 | 方法签名保持不变，上层无需改动 |

## 依赖

无模块 03 内部文件依赖（不 import 任何本模块文件）。

| 外部库 | 用途 |
| --- | --- |
| 无 | 纯 TypeScript 硬编码占位，无外部依赖 |

## 导出与函数明细

### `FilterOptionsDto`
- 类型：类型（interface）
- 传入：无（纯数据结构声明）
- 传出：筛选维度字典的数据形态
- 用处：声明筛选字典返回结构，包含两个字段：
  - `experienceTypes: string[]`——体验类型候选（如 "Cities & Towns"、"Food & Dining"）；
  - `states: string[]`——马来西亚州/联邦直辖区候选（Geoapify `state` 字段的显示名，如 "Penang"）。

### `MOCK_FILTER_OPTIONS`
- 类型：常量
- 传入：无
- 传出：`FilterOptionsDto` 硬编码静态候选数据
- 用处：占位数据源，未来替换为真实第三方 API 响应。`experienceTypes` 含 7 项（Cities & Towns、Attractions & Landmarks、Museums & Culture、Food & Dining、Shopping、Nature & Adventure、Discover Malaysia），与 BL 层 Geoapify 结果推断映射取值一致；`states` 含马来西亚 13 州 + 3 联邦直辖区共 16 项（Johor、Kedah、Kelantan、Kuala Lumpur、Labuan、Melaka、Negeri Sembilan、Pahang、Penang、Perak、Perlis、Putrajaya、Sabah、Sarawak、Selangor、Terengganu）。注意 Geoapify `state` 字段实际取值与显示名存在差异（如 "Pulau Pinang" ↔ Penang），匹配逻辑在 BL 层别名表处理。

### `StateInfoDto`
- 类型：类型（interface）
- 传入：无（纯数据结构声明）
- 传出：州/省信息的数据形态（坐标遵循 guideline §5 扁平 `lat`/`lon` 标准）
- 用处：声明州/省信息返回结构，包含五个字段：
  - `stateId: string`——州/联邦直辖区标识（小写 slug，如 `"penang"`、`"kuala-lumpur"`）；
  - `name: string`——显示名（与 `FilterOptionsDto.states` 一致）；
  - `lat: number`——州首府/主要城市纬度；
  - `lon: number`——州首府/主要城市经度；
  - `imageUrl: string`——州封面图 URL（暂无数据源，空串由前端渐变占位）。
- 用处：供模块 02 创建旅行时选择州/省（BL 层 `discoveryService.getStateInfo` 经此获取）。

### `MOCK_STATE_INFO`
- 类型：常量
- 传入：无
- 传出：`StateInfoDto[]` 硬编码静态候选数据（16 项：13 州 + 3 联邦直辖区）
- 用处：占位数据源，未来替换为真实第三方 API 响应。坐标为州首府/主要城市静态地理事实（如 Penang → George Town 5.4141, 100.3288）；`imageUrl` 全部为空串（前端渐变占位）。

### `DiscoveryExternalApi`
- 类型：类
- 传入：无（无构造函数参数）
- 传出：客户端实例
- 用处：模块 03 外部 API 客户端总入口类。目前只保留筛选字典获取能力，未来新增外部服务对接时在此类中扩展方法。

#### `fetchFilterOptions()`
- 类型：方法（async）
- 传入：无参数
- 传出：`Promise<FilterOptionsDto>`——筛选维度字典（体验类型 + 马来西亚州/直辖区候选）
- 用处：返回硬编码的 `MOCK_FILTER_OPTIONS`。当前无真实第三方筛选字典 API 可用，属 mock 占位；未来对接真实筛选维度字典 API（体验类型）时仅替换此方法内部实现，方法签名保持不变，上层无需改动。由 Business Logic 层筛选面板/搜索页调用。

#### `fetchStateInfo()`
- 类型：方法（async）
- 传入：无参数
- 传出：`Promise<StateInfoDto[]>`——州/省信息（16 项：13 州 + 3 联邦直辖区，含首府坐标）
- 用处：返回硬编码的 `MOCK_STATE_INFO`。当前无真实第三方州/省信息 API 可用，属 mock 占位；未来对接真实 API（含州级坐标与封面图）时仅替换此方法内部实现，方法签名保持不变，上层无需改动。由 Business Logic 层 `discoveryService.getStateInfo` 调用，供模块 02 创建旅行时选择州/省。

### `discoveryExternalApi`
- 类型：常量
- 传入：无
- 传出：`DiscoveryExternalApi` 单例实例
- 用处：模块导出的共享单例，供上层（BL 层服务）直接引入使用，避免重复实例化。
