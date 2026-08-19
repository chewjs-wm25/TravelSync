# WikidataApi.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/WikidataApi.ts`
> - 对接的外部服务：Wikidata Action API（wbsearchentities 实体搜索 / wbgetentities 实体详情）

## 责任

本文件是模块 03 的 Wikidata 外部 API 客户端，职责单一：仅负责与 Wikidata Action API 交流（实体搜索 `wbsearchentities` / 实体详情 `wbgetentities`），不包含业务规则、不触碰本地持久化、不编排跨模块流程。

用途：Recommended Places 验证机制的**兜底数据源**——当 Geoapify 对热门目的地种子词返回道路/街区等非具体实体时，用 Wikidata 寻找该地点的命名实体（Q 条目 + 坐标 + 国家），供 Business Logic 层按"马来西亚"过滤 Wikidata 候选实体。

关键设计：
- **免费直连**：Wikidata 公共 API 完全免费、无需 key；`wikidata.org` 支持 CORS（请求携带 `origin=*`），浏览器端直连，无需本地代理（前端实现原则）；
- **限流防护**：瞬时失败（网络错误 / HTTP 429 限流 / 5xx / 非 JSON 响应——限流时 Wikidata 可能返回 200 + 纯文本提示）按指数退避重试，最多 `MAX_WIKIDATA_RETRIES = 3` 次，退避延迟 `1000 * 2^n` ms，避免 Wikidata 限流导致兜底失效；
- **批量详情**：`getPlaceDetails` 一次批量获取多个实体的坐标（P625）与所在国家（P17），`props=claims|labels`、`languages=en`，减少请求次数。

返回语义：`searchPlaces` 返回实体搜索候选（id + label + description）；`getPlaceDetails` 返回实体详情（含坐标与国家）；请求失败抛 `Error`（瞬时状态），上层不得缓存失败结论。

## 依赖

无模块 03 内部文件依赖。

| 外部库 | 用途 |
| --- | --- |
| 无 | 仅使用内置 `fetch`、`URL`、`URLSearchParams` |

## 导出与函数明细

### `WikidataSearchResultDto`
- 类型：类型（interface）
- 传入：无
- 传出：Wikidata 实体搜索候选形态
- 用处：`wbsearchentities` 的精简形态：`id`（如 "Q1865"）、`label`（en label，如 "Kuala Lumpur"）、`description?`（en description，如 "capital city of Malaysia"）。

### `WikidataPlaceDto`
- 类型：类型（interface，继承 `WikidataSearchResultDto`）
- 传入：无
- 传出：Wikidata 实体详情形态
- 用处：`wbgetentities` 的精简形态（搜索字段 + 坐标/国家）：`lat?`/`lon?`（P625 coordinate location，缺失时 undefined）、`countryId?`（P17 country，如 "Q833" = Malaysia）。

### `WbSearchEntitiesResponse` / `WbGetEntitiesResponse`
- 类型：类型（interface，非导出）
- 传入：无
- 传出：Wikidata 响应结构
- 用处：仅声明用到的字段。搜索响应含 `search[]`（id/label/description）与 `error`；详情响应含 `entities`（键为 QID，值含 `labels.en.value`、`claims.P625[].mainsnak.datavalue.value.{latitude,longitude}`、`claims.P17[].mainsnak.datavalue.value.id`）与 `error`。

### `MAX_WIKIDATA_RETRIES`（常量）
- 类型：常量（非导出）
- 传入：无
- 传出：`3`
- 用处：瞬时失败的最大重试次数。

### `RETRY_BASE_DELAY_MS`（常量）
- 类型：常量（非导出）
- 传入：无
- 传出：`1000`
- 用处：重试退避基准延迟（ms），第 n 次重试前等待 `1000 * 2^n`。

### `sleep(ms)`（函数，非导出）
- 类型：函数
- 传入：`ms`——等待毫秒数
- 传出：`Promise<void>`
- 用处：延迟辅助，重试退避用。

### `WikidataApi`
- 类型：类
- 传入：无
- 传出：客户端实例
- 用处：Wikidata 客户端，持有端点 `endpoint = "https://www.wikidata.org/w/api.php"`。

#### `searchPlaces(query: string, limit = 5)`
- 类型：方法（async）
- 传入：`query`——实体名称搜索词；`limit`——返回候选数上限，默认 5
- 传出：`Promise<WikidataSearchResultDto[]>`——实体候选数组
- 用处：按名称搜索 Wikidata 实体。请求参数：`action=wbsearchentities`、`search`、`language=en`、`format=json`、`limit`、`origin=*`（CORS）。解析：过滤掉缺失 `id` 或 `label` 的条目，映射为 `WikidataSearchResultDto`。用于 Geoapify 兜底时定位"该地点"的命名实体。

#### `getPlaceDetails(ids: string[])`
- 类型：方法（async）
- 传入：`ids`——Wikidata 实体 id 数组（如 `["Q1865", ...]`）
- 传出：`Promise<WikidataPlaceDto[]>`——实体详情数组
- 用处：一次批量获取多个实体的坐标与所在国家。空数组直接返回 `[]`。请求参数：`action=wbgetentities`、`ids`（`|` 连接）、`props=claims|labels`、`languages=en`、`format=json`、`origin=*`。解析：遍历 `entities`，从 `claims.P625` 取坐标、`claims.P17` 取国家 id、`labels.en.value` 取 label（缺失时回退实体 id），映射为 `WikidataPlaceDto`。供 Business Logic 按"马来西亚"过滤 Wikidata 候选实体。

#### `request<T>(url, label, attempt = 0)`（私有）
- 类型：方法（async，私有）
- 传入：`url`——完整请求 URL；`label`——请求描述（用于错误信息，如 "Wikidata search"）；`attempt`——当前尝试次数，默认 0
- 传出：`Promise<T>`——解析后的 JSON 数据
- 用处：统一请求封装。网络错误 → 可重试则退避递归重试，否则抛错；HTTP 429 或 5xx → 退避重试（最多 `MAX_WIKIDATA_RETRIES` 次），其余状态码直接抛错；JSON 解析失败（限流时可能返回 200 + 纯文本）→ 退避重试或抛 `invalid JSON response`；响应含 `error` 字段 → 抛业务错误（code + info）。最终返回数据。

### `wikidataApi`
- 类型：常量
- 传入：无
- 传出：`WikidataApi` 单例实例
- 用处：模块导出的共享单例，供上层（BL 层）直接引入使用。
