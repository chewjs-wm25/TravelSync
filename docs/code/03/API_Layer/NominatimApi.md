# NominatimApi.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/NominatimApi.ts`
> - 对接的外部服务：Nominatim（OpenStreetMap）Search API

## 责任

本文件是模块 03 的 Nominatim 地理编码外部 API 客户端，职责单一：仅负责与 Nominatim API 交流，按**公司地址（Company Address）**查询地点的经纬度，并实现"逗号递减"降级重试与请求限速；除查询降级策略外不包含业务规则、不触碰本地持久化、不编排跨模块流程。典型调用场景：将商家/公司地址解析为坐标，供后续 Wikimedia Geosearch 大半径搜索附近图片使用。

关键设计：
- **免费与直连**：Nominatim 公开 API 完全免费、无需 API key，且支持 CORS（跨域），浏览器端可直连，符合"前端能实现的功能绝不交给后端"的项目原则；
- **马来西亚范围固定**：每次查询固定 `countrycodes=my`（项目约束：旅游规划范围仅限马来西亚）；
- **限速内聚**：Nominatim 使用政策要求每秒最多 1 次请求，限速逻辑（`throttle`）内聚在本类，调用方无需关心；
- **"逗号递减"自动降级**：OSM 数据库未必收录地址中的每条小路，因此按逗号从左逐段砍掉再试，直到拿到坐标或只剩最后一段（邮编/州属，`countrycodes=my` 保证存在）为止。例如 `Persiaran Bertam 8, 13200 Kepala Batas, Pulau Pinang` 无收录失败后，降级为 `13200 Kepala Batas, Pulau Pinang` 成功。降级命中的是区域中心坐标，仍足以供大半径图片搜索使用；
- **UA 合规**：请求携带描述性 `User-Agent: TravelSync/1.0 (university assignment)`（浏览器端自动用浏览器 UA 被忽略，Node/非浏览器环境避免 403）。

返回语义（供上层决定是否缓存）：返回 `{ lat, lon }` = 查询到坐标（可能经降级）；返回 `null` = 全部降级尝试均请求成功但确定无结果；抛出 `Error` = 某次请求瞬时失败（网络错误 / HTTP 非 2xx / 响应异常），上层不应将"无坐标"结论落库，应允许下次重试。

## 依赖

无模块 03 内部文件依赖。

| 外部库 | 用途 |
| --- | --- |
| 无 | 仅使用内置 `fetch`、`URL`、`URLSearchParams` |

## 导出与函数明细

### `NominatimResultDto`
- 类型：类型（interface，非导出）
- 传入：无
- 传出：Nominatim search 响应中的单个结果
- 用处：仅声明本客户端用到的字段 `lat?: string`、`lon?: string`（Nominatim JSON 中为字符串）。

### `NominatimApi`
- 类型：类
- 传入：无
- 传出：客户端实例
- 用处：Nominatim 地理编码客户端。持有字段：`searchUrl = "https://nominatim.openstreetmap.org/search"`（搜索端点）、`rateLimitMs = 1000`（限速间隔）、`lastRequestAt = 0`（上次请求时间戳）。

#### `geocodeAddress(address: string)`
- 类型：方法（async，公开）
- 传入：`address`——公司地址字符串（如 "Persiaran Bertam 8, 13200 Kepala Batas, Pulau Pinang"）
- 传出：`Promise<{ lat: number; lon: number } | null>`——坐标对象；全部尝试无匹配返回 `null`；瞬时失败抛出 `Error`
- 用处：对外主入口。按"逗号递减"编排降级循环：`splitSegments` 切段后，从完整地址开始依次查询，某次 `search` 返回坐标立即返回；`search` 抛错（瞬时失败）立即中止上抛；所有段都无结果返回 `null`。

#### `splitSegments(address: string)`（私有）
- 类型：方法（同步，私有）
- 传入：`address`——原始地址字符串
- 传出：`string[]`——清洗后的地址段数组
- 用处：地址清洗与切段：`trim`、合并连续空白（`\s+` → 空格）、合并连续逗号（`,,\s*` → `,`）、去掉首尾逗号；再按逗号切段、逐段 trim、去掉空段。空地址返回 `[]`。

#### `search(query: string)`（私有）
- 类型：方法（async，私有）
- 传入：`query`——单次查询文本（当前降级段）
- 传出：`Promise<{ lat: number; lon: number } | null>`——坐标；请求成功但无匹配返回 `null`；瞬时失败抛出 `Error`
- 用处：单次查询。先 `await this.throttle()` 限速；构造 URL：`q={query}`、`countrycodes=my`（仅限马来西亚）、`format=jsonv2`、`limit=1`；携带自定义 UA 请求。网络错误抛错；HTTP 非 2xx（429 限流 / 4xx / 5xx 均视为瞬时失败）抛错；JSON 解析失败抛 `Nominatim response parse failed`；取首个结果，`lat`/`lon` 缺失或转数值后非有限数均视为无匹配返回 `null`。

#### `throttle()`（私有）
- 类型：方法（async，私有）
- 传入：无
- 传出：`Promise<void>`
- 用处：限速保证相邻两次请求间隔不小于 `rateLimitMs`（1000ms）。在请求发出前更新 `lastRequestAt`（并发调用时第二个调用会等待足够间隔）。

### `nominatimApi`
- 类型：常量
- 传入：无
- 传出：`NominatimApi` 单例实例
- 用处：模块导出的共享单例，供上层（BL 层）直接引入使用。
