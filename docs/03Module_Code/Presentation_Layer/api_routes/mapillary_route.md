# mapillary/route.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/api/discovery/mapillary/route.ts`
> - 类型：服务端 Route API（Next.js App Router Route Handler，Mapillary 代理）

## 责任

`mapillary/route.ts` 是模块 03 的 Mapillary 代理 Route API，职责单一：服务端代理传输层。它实现四个关键点：
1. **白名单校验**请求参数（`action` / `bbox` / `imageId`），拒绝非法输入（防止任意端点注入）；
2. **服务端强制马来西亚范围**——`bbox` 必须完全落在马来西亚边界框内（`MALAYSIA_BBOX`，来自 api_layer `MalaysiaBounds`），前端无法绕过，符合项目「旅游规划仅限马来西亚」约束；
3. **服务端注入 Mapillary access token**（`process.env.MAPILLARY_ACCESS_TOKEN`，非 `NEXT_PUBLIC`，token 不暴露给前端 bundle）；
4. **转发**到 `graph.mapillary.com` 并透传原始 JSON 响应（响应解析由 API Layer 客户端 `MapillaryApi` 完成）。

支持两种动作：
- `action=search&bbox=minLon,minLat,maxLon,maxLat` → 按经纬度范围搜索图片（`fields=id`、`limit=10`，返回 id 列表）；
- `action=image&imageId=...` → 按图片 id 获取图片信息（`fields=thumb_1024_url`，含有时效的 thumb URL）。

本端点作为 `getPlaceImage` 查询链的 Mapillary 兜底层：搜索结果返回图片 id，由 BL 层决定是否换取新 URL（**不得缓存有时效的 URL，仅缓存 imageId**，见 `place-image` 缓存值语义）。数据流：`hooks.usePlaceImages` → BL 层 `discoveryService.getPlaceImage` → 本 Route API（服务端注入 token + 强制马来西亚 bbox）→ `graph.mapillary.com` → 透传 JSON → API Layer 客户端 `MapillaryApi` 解析。

## 请求 / 响应示例

```
GET /api/discovery/mapillary?action=search&bbox=101.5,3.0,101.6,3.1
    → 200 { "data": [ { "id": "123456789" }, ... ] }          // 图片 id 列表（limit=10）

GET /api/discovery/mapillary?action=image&imageId=123456789
    → 200 { "id": "123456789", "thumb_1024_url": "https://...（有时效的 URL）" }
```

## 错误码汇总

| 状态码 | 场景 | 响应体 |
| --- | --- | --- |
| 400 | `action` 不在白名单 | `{ "error": "action must be 'search' or 'image'" }` |
| 400 | `search` 分支 `bbox` 非法（格式/范围/超马来西亚） | `{ "error": "bbox must be 4 numbers: minLon,minLat,maxLon,maxLat (span <= 0.5 deg, fully within Malaysia)" }` |
| 400 | `image` 分支 `imageId` 非法 | `{ "error": "imageId is required and must be alphanumeric" }` |
| 500 | `MAPILLARY_ACCESS_TOKEN` 缺失 | `{ "error": "Missing MAPILLARY_ACCESS_TOKEN. ..." }` |
| 502 | 上游 fetch 网络异常 | `{ "error": "Mapillary request failed (network error): ..." }` |
| 透传 | 上游 4xx/5xx | 原状态码 + 上游原始响应体 |

## 安全与分层要点

- **token 不落前端**：`MAPILLARY_ACCESS_TOKEN` 仅服务端 `process.env` 读取（非 `NEXT_PUBLIC`），前端 bundle 不包含 token；
- **马来西亚强制**：`parseBbox` 校验 bbox 完全落在 `MALAYSIA_BBOX` 内（与 api_layer `MalaysiaBounds` 保持一致），前端无法绕过；
- **防滥用**：`BBOX_MAX_SPAN = 0.5°`（约 55km）限制单次搜索范围；`IMAGE_ID_PATTERN` 限制 imageId 字符集与长度；
- **先校验后读 token**：非法参数恒返回 400，避免触发环境变量读取（错误语义稳定）；
- **透传薄传输**：响应原样透传，DTO 解析由 API Layer 客户端 `MapillaryApi` 完成（响应解析责任在 API Layer）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../../../../api_layer/03_Destination_Discovery_&_Inspiration/MalaysiaBounds` | 常量 `MALAYSIA_BBOX`（马来西亚边界框，bbox 白名单校验基准；仅记录 import，未打开源文件） |
| 外部库：无 | — |

## 导出与函数明细

### `MAPILLARY_GRAPH_BASE_URL`（文件内常量）
- 类型：常量
- 内容：`"https://graph.mapillary.com"` —— Mapillary Graph API 端点。

### `ALLOWED_ACTIONS`（文件内常量）
- 类型：常量（`Set<string>`）
- 内容：`new Set(["search", "image"])` —— 允许的动作白名单。

### `IMAGE_ID_PATTERN`（文件内常量）
- 类型：常量（正则）
- 内容：`/^[A-Za-z0-9_-]{1,64}$/` —— Mapillary 图片 id 允许的字符集与长度上限（v4 id 为长数字字符串）。

### `BBOX_MAX_SPAN`（文件内常量）
- 类型：常量
- 内容：`0.5` —— bbox 单边最大跨度（度，约 ±0.5° ≈ 55km，防止超大范围滥用）。

### `mapillaryAccessToken`
- 类型：函数
- 传入：无
- 传出：`string` —— `process.env.MAPILLARY_ACCESS_TOKEN`；缺失时 `throw new Error("Missing MAPILLARY_ACCESS_TOKEN. Add it to .env (server-side, not NEXT_PUBLIC_*) to enable Mapillary proxy.")`。
- 用处：服务端安全读取 token；handler 中对其 catch 并返回 500（配置错误不透传细节给前端）。

### `parseBbox`
- 类型：函数
- 传入：`raw: string` —— bbox 原始字符串
- 传出：`{ minLon, minLat, maxLon, maxLat } | null` —— 校验失败返回 `null`。校验规则：
  - 逗号分隔必须恰 4 段且全部 `Number.isFinite`；
  - 经度在 `[-180, 180]`、纬度在 `[-90, 90]`；
  - `minLon <= maxLon` 且 `minLat <= maxLat`；
  - 单边跨度 `maxLon - minLon` / `maxLat - minLat` 均 `<= BBOX_MAX_SPAN`；
  - **bbox 必须完全落在 `MALAYSIA_BBOX` 内**（`minLon >= MALAYSIA_BBOX.minLon` 等四项比较，服务端强制马来西亚范围，与 api_layer `MalaysiaBounds` 保持一致，前端无法绕过）。
- 用处：`action=search` 时解析并校验 bbox 参数。

### `GET`
- 类型：函数（Route API handler）
- HTTP 方法：`GET /api/discovery/mapillary?action=search&bbox=...` 或 `GET /api/discovery/mapillary?action=image&imageId=...`
- 请求参数（query）与白名单校验：
  - `action`：必填，`trim` 后须在 `ALLOWED_ACTIONS` 内，否则 400 `{ error: "action must be 'search' or 'image'" }`；
  - `search` 分支：`bbox` 须通过 `parseBbox`，否则 400 `{ error: "bbox must be 4 numbers: minLon,minLat,maxLon,maxLat (span <= 0.5 deg, fully within Malaysia)" }`；
  - `image` 分支：`imageId` 须非空且匹配 `IMAGE_ID_PATTERN`，否则 400 `{ error: "imageId is required and must be alphanumeric" }`。
- 服务端注入：`token = mapillaryAccessToken()`（缺失 catch 后返回 500）；**先校验参数再读 token**，保证非法参数恒返回 400。
- 转发的外部端点：
  - search：`${BASE}/images`，参数 `bbox`（格式化回 `minLon,minLat,maxLon,maxLat`）、`fields=id`、`limit=10`；
  - image：`${BASE}/${imageId}`，参数 `fields=thumb_1024_url`；
  - 两者均追加 `access_token=<token>`。
- 响应体：透传上游——`new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } })`，body 为上游原始 JSON 文本（前端客户端负责 DTO 解析）。
- 错误处理：`fetch` 网络异常返回 502 `{ error: "Mapillary request failed (network error): ..." }`；token 缺失返回 500；参数非法返回 400（各自独立错误消息）。上游的 4xx/5xx 状态码原样透传（如 401/429），响应体为上游原始文本。
