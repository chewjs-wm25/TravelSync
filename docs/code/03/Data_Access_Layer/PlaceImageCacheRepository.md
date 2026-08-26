# PlaceImageCacheRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/PlaceImageCacheRepository.ts`
> - 类型：仓储接口 + 仓储实现（Cloudflare KV · 单文件同时含接口与服务端实现）

## 责任

本文件是模块 03 地点图片缓存的仓储定义与 **Cloudflare KV 直接实现**，运行于**服务端**（Worker / Route API）。职责单一：提供以 place id 为键的地点图片缓存读写接口；不包含业务判断（缓存策略由 Business Logic Layer 编排）。

**键设计**：`module03:place-image:v5:{placeId}` —— 图片与 place id 一一关联，键前缀隔离键空间；`v5` 前缀使 v4 及更早缓存整体失效（旧值格式无署名信息，且旧查询链的「确定无图」结果会阻挡新增的 Wikivoyage 环节）。图片链路（v5）新增 Wikivoyage 首环节并携带作者/许可署名信息，必须升键重新查询。

**值语义（v5，来源引用格式）**：缓存值为 `PlaceImageCacheEntry` 的 JSON 序列化字符串：

- `{"source":"wikimedia","url":"...","attribution":{...}}` —— Wikipedia/Wikivoyage/Commons 永久 URL，可直接使用；attribution 为作者/许可信息（CC BY-SA 等开源协议署名展示所需，永久有效）；
- `{"source":"mapillary","imageId":"...","attribution":{...}}` —— Mapillary 图片 id（thumb URL 有时效，每次查询需用 id 换取新 URL，**不得缓存 URL**）；attribution 为固定署名（Mapillary contributors）；
- 空字符串 `""` 表示「已确定无图」（等价于 `{"source":"none"}`）；
- `get` 返回 `null` 表示未缓存（键不存在），与「确定无图」（`""` / none）严格区分。

**序列化兼容**：`parsePlaceImageEntry` 对非 JSON 的纯 URL 字符串仍视为 wikimedia 来源（防御性兼容；v5 键前缀下正常不会出现旧格式数据，attribution 缺失时上层按无署名信息处理）。

本文件还定义了**仓储所需的最小 KV 结构类型 `PlaceImageKvBinding`**（get/put/list/delete），不绑定 `@cloudflare/workers-types` 的具体类型：`@opennextjs/cloudflare` 的 `CloudflareEnv` 类型与 workers-types 的 `KVNamespace` 结构不完全兼容，用结构类型（structural typing）同时兼容两者。

实现分工：`CloudflareKvPlaceImageCacheRepository`（本文件）直连 KV binding（`env.PLACE_IMAGE_CACHE`），由 Route API（`app/03_Destination_Discovery_&_Inspiration/api/place-image`）实例化；浏览器端经 `RemotePlaceImageCacheRepository`（同目录另一文件）→ Route API 完成读写。

## 依赖

本文件为纯类型/常量/实现声明，**没有任何 import**（不依赖模块 03 内部文件，也不依赖外部库——KV binding 通过结构类型注入）。

## 导出与函数明细

### `PLACE_IMAGE_CACHE_KEY_PREFIX`

- 类型：常量
- 传入：无
- 传出：字符串 `"module03:place-image:v5:"`。
- 用处：KV 键前缀，隔离键空间；`clearAll()` 以此前缀限定删除范围。

### `placeImageCacheKey(placeId: string): string`

- 类型：函数
- 传入：`placeId` —— 地点标识。
- 传出：`\`${PLACE_IMAGE_CACHE_KEY_PREFIX}${placeId.trim()}\``（内部先 `trim`）。
- 用处：由 place id 生成 KV 键；trim 保证前后空白不影响键命中。

### `PlaceImageCacheSource`

- 类型：类型别名
- 传入：无
- 传出：`"wikimedia" | "mapillary" | "none"`。
- 用处：图片来源枚举。wikimedia = URL 永久可直接用；mapillary = URL 有时效，存 id 换新 URL；none = 确定无图。

### `PlaceImageAttribution`

- 类型：接口
- 传入：无
- 传出：图片署名信息（开源协议展示合规，如 CC BY-SA 4.0 的署名要求：保留原作者 + 许可声明），字段与 Wikimedia extmetadata / Mapillary 固定署名对应，缺失字段为 `undefined`：
  - `artist?: string` —— 原作者（纯文本，如 "Chainwit."）；
  - `licenseName?: string` —— 许可短名（如 "CC BY-SA 4.0"）；
  - `licenseUrl?: string` —— 许可链接；
  - `credit?: string` —— 归属文本（Commons Credit 字段清洗后的纯文本）。
- 用处：缓存条目中承载署名信息，供前端按开源协议要求展示。

### `PlaceImageCacheEntry`

- 类型：接口
- 传入：无
- 传出：地点图片缓存条目（KV 存 JSON 序列化字符串；「确定无图」存空串兼容旧格式）：
  - `source: PlaceImageCacheSource` —— 图片来源；
  - `url?: string` —— wikimedia 来源的永久图片 URL（`source=wikimedia` 时存在）；
  - `imageId?: string` —— mapillary 来源的图片 id（`source=mapillary` 时存在，每次查询换取有时效的 URL）；
  - `attribution?: PlaceImageAttribution` —— 作者/许可署名信息（none 来源不存在）。
- 用处：`get`/`put` 的传输载体与序列化对象。

### `serializePlaceImageEntry(entry: PlaceImageCacheEntry): string`

- 类型：函数
- 传入：`entry` —— 缓存条目。
- 传出：KV 存储字符串；`entry.source === "none"` 时返回 `""`（兼容旧版 `""` 语义），否则 `JSON.stringify(entry)`。
- 用处：写入 KV 前的序列化入口，保证「确定无图」以空串落盘。

### `parsePlaceImageEntry(raw: string | null): PlaceImageCacheEntry | null`

- 类型：函数
- 传入：`raw` —— KV 存储字符串（`null` 表示键不存在）。
- 传出：缓存条目或 `null`。返回语义：`null` = 未缓存；`{source:"none"}` = 确定无图；其余为具体来源条目。处理流程：
  1. `raw === null` → 返回 `null`（未缓存）；
  2. 空串（trim 后）→ 返回 `{ source: "none" }`（确定无图）；
  3. `JSON.parse` 成功且对象 `source` 属于三种合法值之一 → 原样返回；
  4. 解析失败或 source 非法 → 若为 `http(s)://` 纯 URL（旧格式，Geoapify/Wikimedia 永久 URL）→ 返回 `{ source: "wikimedia", url }`；
  5. 其余 → 返回 `{ source: "none" }`。
- 用处：读取 KV 后的反序列化入口，承担旧格式（纯 URL 字符串）的防御性兼容，并把「未缓存 / 确定无图 / 有图」三种状态严格区分。

### `PlaceImageCacheRepository`

- 类型：接口
- 传入：无（接口本身）
- 传出：三个方法的签名与语义：
  - `get(placeId: string): Promise<PlaceImageCacheEntry | null>` —— 读取缓存条目；返回语义：`null` = 未缓存；`{source:"none"}` = 已缓存「确定无图」；其余为来源引用；
  - `put(placeId: string, entry: PlaceImageCacheEntry): Promise<void>` —— 写入缓存条目；空 placeId 为 no-op；
  - `clearAll(): Promise<number>` —— 清空全部地点图片缓存（仅本键前缀范围），返回清除的条目数。
- 用处：地点图片缓存仓储的统一契约，服务端 KV 实现与浏览器端 Remote 实现共同遵守。

### `PlaceImageKvBinding`

- 类型：接口
- 传入：无
- 传出：仓储所需的最小 KV 结构（get/put/list/delete）：
  - `get(key: string): Promise<string | null>`；
  - `put(key: string, value: string): Promise<void>`；
  - `list(options?: { prefix?: string; cursor?: string }): Promise<{ keys: Array<{ name: string }>; list_complete?: boolean; cursor?: string }>`；
  - `delete(key: string): Promise<void>`。
- 用处：以结构类型（structural typing）同时兼容 `@cloudflare/workers-types` 的 `KVNamespace` 与 `@opennextjs/cloudflare` 的 `CloudflareEnv`，避免类型绑定冲突。

### `CloudflareKvPlaceImageCacheRepository`

- 类型：类（`implements PlaceImageCacheRepository`）
- 传入：构造器 `constructor(private readonly kv: PlaceImageKvBinding)` —— 注入 KV binding。
- 传出：三个接口方法的实现：
  - `get(placeId: string): Promise<PlaceImageCacheEntry | null>` —— `placeId.trim()` 为空时直接返回 `null`（未缓存）；否则 `placeImageCacheKey(placeId)` 生成键 → `kv.get(key)` → `parsePlaceImageEntry(raw)`。
  - `put(placeId: string, entry: PlaceImageCacheEntry): Promise<void>` —— `placeId.trim()` 为空时 no-op 直接返回；否则 `kv.put(key, serializePlaceImageEntry(entry))`。
  - `clearAll(): Promise<number>` —— 仅清理 `PLACE_IMAGE_CACHE_KEY_PREFIX` 前缀范围：`do...while` 循环用 `kv.list({ prefix, cursor })` 逐页取键，逐个 `kv.delete(key.name)` 并计数，直到 `list_complete` 为真（无下一页）；无键时返回 0。
- 用处：服务端地点图片缓存的唯一持久化入口，由 Route API 以 `env.PLACE_IMAGE_CACHE` 实例化。`clearAll` 逐页遍历避免一次拉取全部键。
