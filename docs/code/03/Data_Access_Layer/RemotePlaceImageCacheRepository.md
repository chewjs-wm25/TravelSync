# RemotePlaceImageCacheRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/RemotePlaceImageCacheRepository.ts`
> - 类型：仓储实现（浏览器端 · 经 Route API 远程调用）

## 责任

本文件是模块 03 地点图片缓存仓储的「远程」实现，运行于**浏览器端**，通过 HTTP 调用 Route API（`app/api/discovery/place-image`）实现 `PlaceImageCacheRepository` 接口。职责单一：仅做参数序列化与响应解析，**不含任何 KV 读写逻辑**（KV 操作由服务端 `CloudflareKvPlaceImageCacheRepository` 承担）。

依赖方向为：浏览器端 BL → 本类 → Route API → `CloudflareKvPlaceImageCacheRepository` → Cloudflare KV。

### 请求/响应契约

| 方法 | HTTP | 请求 | 成功响应体 | 返回值 |
| --- | --- | --- | --- | --- |
| `get` | GET | 查询串 `?placeId=` | `{ entry?: PlaceImageCacheEntry \| null }` | `data.entry ?? null` |
| `put` | PUT | JSON `{ placeId, entry }` | 无 | `void` |
| `clearAll` | DELETE | 无 | `{ cleared?: number }` | `data.cleared ?? 0` |

请求/响应示例（示意，非代码内固定值）：

```jsonc
// GET /api/discovery/place-image?placeId=geo-123
{ "entry": { "source": "wikimedia", "url": "https://...", "attribution": { "artist": "Chainwit.", "licenseName": "CC BY-SA 4.0" } } }
// PUT /api/discovery/place-image
{ "placeId": "geo-123", "entry": { "source": "none" } }
```

### 值语义（继承自 `PlaceImageCacheRepository.ts`）

- `get` 返回 `null` = **未缓存**（键不存在）；`{source:"none"}` = **已缓存「确定无图」**；其余为具体来源引用（wikimedia URL / mapillary imageId）；
- `put` 写入 `{source:"none"}` 时服务端落盘为空字符串 `""`（兼容旧格式），本类仅透传 `entry` 对象，不做格式判断。

**失败语义**：Route API 不可用（如本地未启动 / 网络错误 / 非 2xx）时抛出 `Error`，由 Business Logic 层决定降级（图片缓存不可用时静默跳过，不阻断查询）——这是图片链路「缓存是加速而非必需」的设计体现。

**版本标注说明**：本文件头注释将值语义标注为「v3（来源引用格式，与 PlaceImageCacheRepository 一致）」，而 `PlaceImageCacheRepository.ts` 中键前缀为 `v5`（`module03:place-image:v5:`）。两处注释版本号不一致属注释遗留差异，实际行为（序列化格式、get 返回语义）以 `PlaceImageCacheRepository.ts` 中的序列化/反序列化函数为准，本类仅透传 `entry` 对象，不做任何格式判断。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./PlaceImageCacheRepository` | 仅导入 `PlaceImageCacheEntry`、`PlaceImageCacheRepository` 类型，用于实现接口签名 |

外部库：无（使用 Web 标准 `fetch`，无额外依赖）。

## 导出与函数明细

### `PLACE_IMAGE_API`（模块内常量）

- 类型：常量（未导出）
- 传入：无
- 传出：字符串 `"/api/discovery/place-image"`。
- 用处：Route API 端点（模块 03 地点图片缓存），三个方法共用；为相对路径，由浏览器端按当前站点 origin 解析。

### `RemotePlaceImageCacheRepository`

- 类型：类（`implements PlaceImageCacheRepository`）
- 传入：无（无构造参数）。
- 传出：三个接口方法的实现：
  - `get(placeId: string): Promise<PlaceImageCacheEntry | null>` —— 先 `placeId.trim()`，空串直接返回 `null`（未缓存，避免无效请求）；否则 `fetch(\`${PLACE_IMAGE_API}?placeId=${encodeURIComponent(trimmed)}\`)`（GET）；非 2xx 抛 `` `Failed to read place image cache (HTTP ${res.status})` ``；响应体解析为 `{ entry?: PlaceImageCacheEntry | null }`，返回 `data.entry ?? null`（保持「null = 未缓存」语义）。
  - `put(placeId: string, entry: PlaceImageCacheEntry): Promise<void>` —— 先 `placeId.trim()`，空串 no-op 直接返回；否则 PUT，请求头 `Content-Type: application/json`，请求体 `JSON.stringify({ placeId: trimmed, entry })`；非 2xx 抛 `` `Failed to write place image cache (HTTP ${res.status})` ``；成功无返回体。
  - `clearAll(): Promise<number>` —— DELETE；非 2xx 抛 `` `Failed to clear place image cache (HTTP ${res.status})` ``；响应体解析为 `{ cleared?: number }`，返回 `data.cleared ?? 0`。
- 用处：浏览器端地点图片缓存的读写入口。`placeId` 经 `encodeURIComponent` 编码并 trim；`get` 的 `?? null` 兜底保证响应缺 `entry` 字段时按「未缓存」处理，与接口语义一致。

### `remotePlaceImageCacheRepository`

- 类型：常量（模块级单例）
- 传入：无
- 传出：`new RemotePlaceImageCacheRepository()` 的实例。
- 用处：导出的默认单例，供调用方（BL 层图片查询服务）直接 import 使用，避免重复实例化。

## 边界情况与错误处理

- **空 placeId 短路**：`get`/`put` 对 trim 后的空串分别返回 `null`/直接返回，不发请求；`clearAll` 无参数不受影响。
- **响应缺 `entry` 字段**：`get` 的响应体缺 `entry` 时按「未缓存」处理（`?? null`），与接口语义一致。
- **网络/服务不可用**：`fetch` 失败或非 2xx 抛 `Error`，由 BL 层决定降级（静默跳过图片缓存，不阻断地点查询）；本类不做重试。
- **`entry` 透传不校验**：`put` 对 `entry` 内容（source 合法性等）不做校验，序列化校验由服务端 KV 实现负责；非法的 entry 会被原样提交并可能由服务端拒绝或原样落库。

## 设计要点与注意事项

- **空 placeId 语义**：`get`/`put` 均在客户端先行 `trim` 并短路（空串 → `null`/no-op），与 `CloudflareKvPlaceImageCacheRepository` 的空串处理保持一致，避免无意义请求打到 Route API。
- **缓存链路容错**：本类抛错后由 BL 层决定是否降级——与活动/评级数据「失败显式感知」的策略不同，图片缓存属于可牺牲的加速层。
- **只透传不校验**：本类对 `entry` 内容不做结构校验（如 source 合法性），校验/序列化统一由服务端 KV 实现与 `PlaceImageCacheRepository.ts` 的序列化函数负责。
