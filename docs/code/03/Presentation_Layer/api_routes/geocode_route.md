# geocode/route.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/api/geocode/route.ts`
> - 类型：服务端 Route API（Next.js App Router Route Handler，Geoapify Geocoding 代理）

## 责任

`geocode/route.ts` 是模块 03 的 Geoapify Geocoding 代理 Route API，职责单一：服务端代理传输层。它实现四个关键点：
1. **白名单校验**请求参数（`type` / `text` / `limit`），拒绝非法输入（防止任意端点注入）；
2. **服务端注入 Geoapify API key**（`process.env.GEOAPIFY_API_KEY`，非 `NEXT_PUBLIC`，密钥不再暴露给前端 bundle）；
3. **服务端强制马来西亚限制**（`filter=countrycode:my`，前端无法绕过，符合项目「旅游规划仅限马来西亚」约束）；
4. **转发**到 `api.geoapify.com` 并透传原始 GeoJSON 响应（保持薄传输，响应解析仍由 API Layer 客户端 `GeoapifyGeocodingApi` 完成）。

认证说明：API key 从服务端环境变量读取（本地 `.env` / Cloudflare vars 或 secrets），前端只与本端点通信，不再直连 Geoapify。支持 `type=autocomplete`（输入联想，`hooks.useSearchAndFilter` 经 BL 层 `getSuggestions` 调用）与 `type=search`（地点搜索，BL 层 `searchPlaceDetails` / `getPlaceDetail` 调用）两种 Geoapify 端点。

数据流：前端组件 → Presentation hooks → BL 层服务 → 本 Route API（服务端注入密钥 + 强制马来西亚）→ `api.geoapify.com` → 透传 GeoJSON → API Layer 客户端 `GeoapifyGeocodingApi` 解析 DTO → BL 层 → hooks → 组件。

## 请求 / 响应示例

```
GET /api/discovery/geocode?type=autocomplete&text=Batu&limit=5
    → 200 GeoJSON（Geoapify 原始响应透传，含 features[]；前端由 GeoapifyGeocodingApi 解析 DTO）

GET /api/discovery/geocode?type=search&text=Batu Caves
    → 200 GeoJSON（服务端强制追加 filter=countrycode:my&lang=en&limit=5）
```

## 错误码汇总

| 状态码 | 场景 | 响应体 |
| --- | --- | --- |
| 400 | `type` 不在白名单 | `{ "error": "type must be 'autocomplete' or 'search'" }` |
| 400 | `text` 为空或超长（>200） | `{ "error": "text is required and must be <= 200 chars" }` |
| 400 | `limit` 非 1~20 整数 | `{ "error": "limit must be an integer between 1 and 20" }` |
| 500 | `GEOAPIFY_API_KEY` 缺失 | `{ "error": "Missing GEOAPIFY_API_KEY. ..." }` |
| 502 | 上游 fetch 网络异常 | `{ "error": "Geoapify {type} request failed (network error): ..." }` |
| 透传 | 上游 4xx/5xx | 原状态码 + 上游原始响应体 |

## 安全与分层要点

- **密钥不落前端**：`GEOAPIFY_API_KEY` 仅服务端 `process.env` 读取（非 `NEXT_PUBLIC`），前端 bundle 不包含密钥；
- **马来西亚强制**：`filter=countrycode:my` 由服务端拼装，前端无法绕过（符合项目「旅游规划仅限马来西亚」约束）；
- **参数白名单**：`type` 枚举白名单防止任意端点注入；`text` 长度上限与 `limit` 范围防滥用；
- **透传薄传输**：响应原样透传，DTO 解析由 API Layer 客户端 `GeoapifyGeocodingApi` 完成（响应解析责任在 API Layer，不在本端点）；
- **错误分层**：参数错误 400、配置错误 500、网络错误 502、上游错误透传，语义清晰。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| 模块 03 内部文件：无（纯 Node 环境变量 + fetch） | — |
| 外部库：无 | — |

## 导出与函数明细

### `GEOAPIFY_GEOCODE_BASE_URL`（文件内常量）
- 类型：常量
- 内容：`"https://api.geoapify.com/v1/geocode"` —— Geoapify Geocoding API 端点（`autocomplete` / `search` 均挂在其下）。

### `ALLOWED_TYPES`（文件内常量）
- 类型：常量（`Set<string>`）
- 内容：`new Set(["autocomplete", "search"])` —— 允许的查询类型白名单。

### `TEXT_MAX_LENGTH`（文件内常量）
- 类型：常量
- 内容：`200` —— `text` 长度上限（防滥用）。

### `LIMIT_MIN` / `LIMIT_MAX`（文件内常量）
- 类型：常量
- 内容：`1` / `20` —— `limit` 允许范围（缺省默认 5）。

### `geoapifyApiKey`
- 类型：函数
- 传入：无
- 传出：`string` —— `process.env.GEOAPIFY_API_KEY`；缺失时 `throw new Error("Missing GEOAPIFY_API_KEY. Add it to .env (server-side, not NEXT_PUBLIC_*) to enable Geoapify proxy.")`。
- 用处：服务端安全读取密钥；handler 中对其 catch 并返回 500（密钥缺失属服务端配置错误，不透传细节给前端）。

### `GET`
- 类型：函数（Route API handler）
- HTTP 方法：`GET /api/discovery/geocode?type=autocomplete|search&text=...&limit=...`
- 请求参数（query）与白名单校验：
  - `type`：`trim` 后须在 `ALLOWED_TYPES` 内，否则 400 `{ error: "type must be 'autocomplete' or 'search'" }`；
  - `text`：`trim` 后非空且 `<= 200` 字符，否则 400 `{ error: "text is required and must be <= 200 chars" }`；
  - `limit`：可选，缺省 5；提供时须为 `1~20` 的整数（`Number.isInteger` + 范围判断），否则 400 `{ error: "limit must be an integer between 1 and 20" }`。
- 服务端注入：`apiKey = geoapifyApiKey()`（缺失 catch 后返回 500 + 错误消息）；**先校验参数再读密钥**，保证非法参数恒返回 400。
- 转发的外部端点：`${GEOAPIFY_GEOCODE_BASE_URL}/${type}`，固定参数：`text`、`filter=countrycode:my`（强制马来西亚，前端不可绕过）、`lang=en`、`limit`、`apiKey`。
- 响应体：透传上游——`new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } })`，body 为上游原始 GeoJSON 文本（前端客户端负责 DTO 解析）。
- 错误处理：`fetch` 网络异常返回 502 `{ error: "Geoapify {type} request failed (network error): ..." }`；密钥缺失返回 500；参数非法返回 400（各自独立错误消息）。上游的 4xx/5xx 状态码原样透传（如 Geoapify 的 401/429），响应体为上游原始文本。
