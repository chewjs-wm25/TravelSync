# MapillaryApi.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/MapillaryApi.ts`
> - 对接的外部服务：Mapillary Graph API（经本地代理端点 `/api/discovery/mapillary` 转发；图片搜索 GET /images、图片详情 GET /{image_id}）

## 责任

本文件是模块 03 的 Mapillary 外部 API 客户端，职责单一：仅负责与本地代理端点 `/api/discovery/mapillary` 交流（按经纬度搜索图片 id、按 id 获取图片 URL），不包含业务规则、不触碰本地持久化、不编排跨模块流程。Mapillary 提供全球街景图，本客户端将其作为地点图片的**兜底来源**（如地点在 Wikipedia/Wikivoyage/Commons 找不到配图时）。

关键设计（安全、免费额度与范围限制）：
- **token 不暴露前端**：本客户端不直连 Mapillary，只与本地代理端点通信，由服务端持有 `MAPILLARY_ACCESS_TOKEN`（非 `NEXT_PUBLIC`）并转发到 `graph.mapillary.com`（见 `app/api/discovery/mapillary/route.ts`）；
- **免费额度**：Mapillary 免费注册获取 access token（免费 API，无需信用卡，符合项目约束）；
- **范围限制在马来西亚（双层）**：客户端（本文件）`findImageId` 入口校验坐标必须位于马来西亚 bbox 内（`isInMalaysiaBounds`），不在 → 直接返回 `null`，不发起请求；服务端代理端点（Route API）强校验 bbox 完全落在马来西亚 bbox 内，否则 400 拒绝——前端无法绕过；
- **紧范围 bbox**：Mapillary v4 免费 API 的图片搜索仅返回 id（无内容分类字段），无法按"地点/景点"语义过滤；以地点周边 ±0.002°（约 ±220m）紧范围 bbox 保证返回图片属于该地点（街景图作为兜底来源）；
- **URL 时效性（重要）**：Mapillary 返回的 `thumb_1024_url` 是带签名的临时 URL，会过期——因此本客户端只返回图片 id（`findImageId`），或按 id 换取当前有效的 URL（`getImageUrl`）；上层持久化缓存必须缓存 id 而非 URL。

返回语义（供上层决定是否缓存）：`findImageId` 返回 `string` = 查询到图片 id，返回 `null` = 请求成功但该范围内确定无图（可安全缓存为无图）；`getImageUrl` 返回 `string` = 当前有效的图片 URL，抛出 `Error` = 请求失败（网络错误 / HTTP 非 2xx / 响应异常），属瞬时状态，上层不得缓存"无图"。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./MalaysiaBounds` | 入口坐标的马来西亚 bbox 判定（`isInMalaysiaBounds`），不在 bbox 内直接返回 null 不发请求 |

| 外部库 | 用途 |
| --- | --- |
| 无 | 仅使用内置 `fetch`、`URLSearchParams` |

## 导出与函数明细

### `MapillaryImageSearchResponse`
- 类型：类型（interface，非导出）
- 传入：无
- 传出：GET /images 搜索响应结构
- 用处：声明 `data?: Array<{ id?: string }>`（图片 id 列表）与 `error?.message` 字段。

### `MapillaryImageDetailResponse`
- 类型：类型（interface，非导出）
- 传入：无
- 传出：GET /{image_id} 图片详情响应结构
- 用处：声明 `id?`、`thumb_1024_url?`（带签名的临时缩略图 URL，会过期，不可持久化缓存）与 `error?.message` 字段。

### `MapillaryApi`
- 类型：类
- 传入：无
- 传出：客户端实例
- 用处：Mapillary 客户端。持有字段：`proxyEndpoint = "/api/discovery/mapillary"`（本地代理端点，服务端持有 token 并转发）。

#### `findImageId(lat: number, lon: number)`
- 类型：方法（async）
- 传入：`lat`/`lon`——搜索中心坐标（经纬度）
- 传出：`Promise<string | null>`——图片 id；确定无图返回 `null`；请求失败抛出 `Error`
- 用处：按经纬度搜索地点附近图片，返回图片 id（不含 URL）。流程：坐标不在马来西亚 bbox 内 → 视为无图，不发起请求返回 `null`；构造以地点为中心 ±0.002°（约 ±220m）的 bbox（`${lon-span},${lat-span},${lon+span},${lat+span}`），经 `request` 请求代理端点（`action=search&bbox=...`）；取 `data.data` 中第一个有 `id` 的图片返回其 id。注：服务端代理端点另有 bbox 完全落在马来西亚内的强校验。

#### `getImageUrl(imageId: string)`
- 类型：方法（async）
- 传入：`imageId`——Mapillary 图片 id
- 传出：`Promise<string>`——当前有效的图片 URL；请求失败抛出 `Error`
- 用处：按图片 id 换取当前有效的图片 URL。imageId trim 后为空抛 `Error("Mapillary image id is required")`；经 `request` 请求代理端点（`action=image&imageId=...`）；响应缺失 `thumb_1024_url` 或非 `http(s)://` 开头抛 `Mapillary image response missing thumb_1024_url`。URL 带签名且有时效，调用方不得持久化缓存（只能缓存 id）。

#### `request<T>(query: URLSearchParams)`（私有）
- 类型：方法（async，私有）
- 传入：`query`——代理端点查询参数（含 action 与业务参数）
- 传出：`Promise<T>`——解析后的 JSON 数据
- 用处：代理请求公共逻辑：网络错误抛 `Mapillary request failed (network error)`；HTTP 非 2xx（含 500 token 未配置 / 502 上游故障，均视为瞬时失败，由上层决定不缓存）抛错；JSON 解析失败抛 `Mapillary response parse failed`；响应含 `error.message` 抛 `Mapillary API error: {message}`。

### `mapillaryApi`
- 类型：常量
- 传入：无
- 传出：`MapillaryApi` 单例实例
- 用处：模块导出的共享单例，供上层（BL 层）直接引入使用。
