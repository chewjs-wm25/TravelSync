# GeoapifyGeocodingApi.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/GeoapifyGeocodingApi.ts`
> - 对接的外部服务：Geoapify Geocoding API（自动联想 autocomplete / 正向搜索 forward geocoding）

## 责任

本文件是模块 03 的 Geoapify 地理编码外部 API 客户端，职责单一：仅负责与 Geoapify Geocoding API 交流（自动联想 `autocomplete` 与正向搜索 `search` 两类端点），不包含业务规则、不触碰本地持久化、不编排跨模块流程。用于搜索框输入联想下拉（自动联想）与搜索栏提交后的真实 POI 搜索（正向搜索）。

关键设计（安全与免费额度）：
- **API key 不暴露前端**：本客户端不直连 Geoapify，而是只与本地代理端点 `/api/discovery/geocode` 通信，由服务端持有 `GEOAPIFY_API_KEY`（非 `NEXT_PUBLIC`）并转发到 Geoapify；
- **马来西亚范围强制由服务端代理完成**：代理端点携带 `filter=countrycode:my`（见 `app/api/discovery/geocode/route.ts`），本客户端无需携带国家过滤参数；
- **免费额度**：使用 Geoapify 免费套餐（3000 credits/天，1 次请求 = 1 credit），请求最小化（默认 limit 6/5）。

错误处理：网络错误、HTTP 非 2xx（含 500 密钥未配置 / 502 上游故障）、Geoapify 业务错误（`error` 字段）均抛出 `Error`，属瞬时失败，由上层决定不缓存搜索结果。

## 依赖

无模块 03 内部文件依赖（不 import 本模块任何文件；本地代理端点在 Route API 层，属注释引用不构成 import）。

| 外部库 | 用途 |
| --- | --- |
| 无 | 仅使用浏览器/Node 内置 `fetch` 与 `URLSearchParams` |

## 导出与函数明细

### `GeoapifyPlaceDto`
- 类型：类型（interface）
- 传入：无（纯数据结构声明）
- 传出：Geoapify 地点精简形态
- 用处：描述 Geoapify Geocoding API `feature.properties` 的精简结构，字段包括：`placeId`（place_id）、`name`、`formatted`（完整格式化地址）、`addressLine1/addressLine2`、`city`、`state`、`country`、`countryCode`、`resultType`（city/amenity/tourism/street 等）、`category`（如 "tourism.attraction"、"amenity.restaurant"）、`confidence`（0~1 匹配置信度，由 `rank.confidence` 解析，用于推断品质徽章占位）、`lat`、`lon`。由 BL 层转换为 POI 项时消费。

### `GeoapifyGeoJsonResponse`
- 类型：类型（interface，非导出）
- 传入：无
- 传出：Geoapify GeoJSON 响应结构
- 用处：仅声明本客户端用到的字段——`features[].properties` 中 `place_id`、`name`、`formatted`、`address_line1/2`、`city`、`state`、`country`、`country_code`、`result_type`、`category`、`rank.confidence`、`lat`、`lon`，以及顶层 `error`/`message` 业务错误字段。

### `GeoapifyGeocodingApi`
- 类型：类
- 传入：无
- 传出：客户端实例
- 用处：Geoapify 地理编码客户端。持有本地代理端点 `proxyEndpoint = "/api/discovery/geocode"`（服务端持有密钥并转发）。

#### `autocompletePlaces(text: string, limit = 6)`
- 类型：方法（async）
- 传入：`text`——用户输入的部分文字（地址/地点）；`limit`——返回候选数上限，默认 6
- 传出：`Promise<GeoapifyPlaceDto[]>`——候选地点数组
- 用处：自动联想（地址/地点自动补全），输入部分文字即返回候选地点，用于搜索框输入联想下拉。内部调用 `request("autocomplete", text, limit)`，经本地代理端点转发到 Geoapify autocomplete 端点。

#### `searchPlaces(text: string, limit = 5)`
- 类型：方法（async）
- 传入：`text`——完整查询文本；`limit`——返回结果数上限，默认 5
- 传出：`Promise<GeoapifyPlaceDto[]>`——匹配地点数组
- 用处：正向搜索（forward geocoding），按完整查询文本搜索地点，用于搜索栏提交后的真实 POI 搜索。内部调用 `request("search", text, limit)`。

#### `request(endpoint, text, limit)`（私有）
- 类型：方法（async，私有）
- 传入：`endpoint: "autocomplete" | "search"`——Geoapify 端点类型；`text`——查询文本；`limit`——结果数
- 传出：`Promise<GeoapifyPlaceDto[]>`——解析后的地点数组
- 用处：统一请求封装。构造查询串 `type={endpoint}&text={text}&limit={limit}` 请求本地代理端点；网络错误抛 `Geoapify {endpoint} request failed (network error)`；HTTP 非 2xx（含 500 密钥未配置 / 502 上游故障）抛瞬时错误由上层决定不缓存；解析 JSON 后若含 `error` 字段抛业务错误；最后对 `features` 做三项处理：
  1. 过滤掉缺失 `place_id` 或 `lat`/`lon` 非数值的 feature；
  2. `name` 缺失时回退 `formatted`，再缺失用 `"Unnamed place"`；
  3. 映射为 `GeoapifyPlaceDto`（snake_case → camelCase）。
