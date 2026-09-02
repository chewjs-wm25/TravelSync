# 模块 03 安全审计报告

> 审计范围：仅限模块 03  
> 相关目录：
> - `api_layer/03_Destination_Discovery_&_Inspiration`
> - `business_logic_layer/03_Destination_Discovery_&_Inspiration`
> - `data_access_layer/03_Destination_Discovery_&_Inspiration`
> - `app/03_Destination_Discovery_&_Inspiration`
> - `app/api/discovery`（模块 03 对应的服务端 Route API）

---

## 后续状态更新（审计后，当前实现）

> 本报告正文为**审计时点**的快照记录（其中 Route API 路径均为迁移前的 `app/api/discovery/*` 形态）。以下为审计后到当前实现的修复/演进状态，正文描述如与下列状态冲突，以本段为准。

- **路径迁移**：模块 03 的 Route API 已从 `app/api/discovery/*` 迁移至 `app/03_Destination_Discovery_&_Inspiration/api/*`（events / official-quality-ratings / place-image / favourites / geocode / mapillary），路径遵循 guideline §5。
- **收藏（favorites）——已修复**：userId 一律由服务端会话（`Authorization: Bearer <token>`，`getAuthSession`）解析，接口签名已完全移除 userId 参数（含 `FavoritesRepository` 接口与 `RemoteFavoritesRepository` 实现）；GET 未登录返回 `[]`，POST / DELETE 未登录返回 401。
- **图片缓存（place-image）——已修复**：PUT 要求登录会话（`requireUser`，401）；DELETE 要求管理员会话（`requireAdmin`，401/403）；PUT 的 wikimedia `url` 额外校验 http/https 协议（防存储型 XSS 的纵深防御）。
- **事件/评级同步（events / official-quality-ratings）——按 DEV 工具链路权衡**：POST（批量 upsert）/ DELETE（清空）为 DEV 同步/清空入口，原 `requireAdmin` 限制已移除、服务端不再校验会话（仅保留 `items` 非空校验）；`RemoteEventRepository` / `RemoteQualityRatingRepository` 写方法仍携带会话凭证头仅为兼容保留，不影响匿名调用。安全权衡说明：该两写入口为 DEV 工具链路（`EventSyncService` / `QualityRatingSyncService`），部署环境需注意其公网可调用性。
- **存储型 XSS——已修复**：新增 `app/03_Destination_Discovery_&_Inspiration/safeUrl.ts`（`safeHttpUrl` 协议白名单），所有渲染外部 URL（活动外链、收藏缩略图、合辑封面/外链、成员卡、附近卡、详情大图、结果卡图片）的 `<a href>` / `<img src>` 均经其过滤。

---

## 1. API Keys 安全性

**结论：未发现 API Key 泄露。**

- Geoapify API Key、Mapillary Access Token 均未使用 `NEXT_PUBLIC_` 前缀，也未硬编码在前端代码中。
- 密钥只在服务端路由中读取：
  - `app/api/discovery/geocode/route.ts` → `geoapifyApiKey()`，读取 `process.env.GEOAPIFY_API_KEY`
  - `app/api/discovery/place-details/route.ts` → `geoapifyApiKey()`，读取 `process.env.GEOAPIFY_API_KEY`
  - `app/api/discovery/mapillary/route.ts` → `mapillaryAccessToken()`，读取 `process.env.MAPILLARY_ACCESS_TOKEN`
- 前端 API 客户端只请求本地代理端点，不接触真实密钥：
  - `api_layer/03_Destination_Discovery_&_Inspiration/GeoapifyGeocodingApi.ts`
  - `api_layer/03_Destination_Discovery_&_Inspiration/PlaceDetailsApi.ts`
  - `api_layer/03_Destination_Discovery_&_Inspiration/MapillaryApi.ts`
- 客户端构建产物 `.next/static` 中未检索到密钥值。
- Nominatim、Wikidata、Wikimedia、Wikivoyage 使用公开免费 API，无需密钥。

---

## 2. SQL 注入

**结论：未发现明显 SQL 注入漏洞。**

模块 03 的 D1 数据库操作均使用 Cloudflare D1 参数化查询：

- `data_access_layer/03_Destination_Discovery_&_Inspiration/D1FavoritesRepository.ts`
  - `listItems()`：`SELECT ... WHERE user_id = ?` + `.bind()`
  - `addItem()`：`INSERT ... VALUES (?, ?, ...)` + `.bind()`
  - `removeItem()`：`DELETE ... WHERE id = ? AND user_id = ?` + `.bind()`
- `data_access_layer/03_Destination_Discovery_&_Inspiration/D1EventRepository.ts`
  - `upsertAll()`：`INSERT ... VALUES (?, ?, ...)` + `.bind()`
- `data_access_layer/03_Destination_Discovery_&_Inspiration/D1QualityRatingRepository.ts`
  - `upsertAll()`：`INSERT ... VALUES (?, ?, ...)` + `.bind()`

动态 SQL 片段（如列名）来自常量，不是用户输入。

---

## 3. 潜在安全问题

### 3.1 高危：数据库/KV 危险操作未授权，任何前端用户/攻击者可直接调用

以下 Route API 没有身份认证、会话校验、管理员校验或任何授权机制：

| 文件 | 函数 | 风险 |
|---|---|---|
| `app/api/discovery/events/route.ts` | `POST()` | 任意人可批量写入/覆盖 `events` 表数据 |
| `app/api/discovery/events/route.ts` | `DELETE()` | 任意人可清空整个 `events` 表 |
| `app/api/discovery/official-quality-ratings/route.ts` | `POST()` | 任意人可批量写入/覆盖 `official_quality_ratings` 表 |
| `app/api/discovery/official-quality-ratings/route.ts` | `DELETE()` | 任意人可清空整个 `official_quality_ratings` 表 |
| `app/api/discovery/place-image/route.ts` | `PUT()` | 任意人可向 KV 写入任意地点图片缓存 |
| `app/api/discovery/place-image/route.ts` | `DELETE()` | 任意人可清空全部地点图片 KV 缓存 |
| `app/api/discovery/favorites/route.ts` | `GET()` | `userId` 由客户端传入，可读取任意用户收藏 |
| `app/api/discovery/favorites/route.ts` | `POST()` | 可向任意 `userId` 写入收藏 |
| `app/api/discovery/favorites/route.ts` | `DELETE()` | 可删除任意 `userId` 的收藏 |

对应底层危险操作：

| 文件 | 函数 | 风险 |
|---|---|---|
| `data_access_layer/03_Destination_Discovery_&_Inspiration/D1EventRepository.ts` | `clearAll()` | 清空全部活动数据 |
| `data_access_layer/03_Destination_Discovery_&_Inspiration/D1QualityRatingRepository.ts` | `clearAll()` | 清空全部官方评级数据 |
| `data_access_layer/03_Destination_Discovery_&_Inspiration/PlaceImageCacheRepository.ts` | `CloudflareKvPlaceImageCacheRepository.clearAll()` | 清空全部地点图片 KV 缓存 |
| `data_access_layer/03_Destination_Discovery_&_Inspiration/D1FavoritesRepository.ts` | `listItems()` / `addItem()` / `removeItem()` | 可被未授权调用，越权读写任意用户收藏 |

浏览器端 Remote 仓储同样暴露了这些能力：

| 文件 | 函数 | 风险 |
|---|---|---|
| `data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteEventRepository.ts` | `clearAll()` | 前端可触发清空活动数据 |
| `data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteQualityRatingRepository.ts` | `clearAll()` | 前端可触发清空官方评级数据 |
| `data_access_layer/03_Destination_Discovery_&_Inspiration/RemotePlaceImageCacheRepository.ts` | `clearAll()` | 前端可触发清空图片缓存 |
| `data_access_layer/03_Destination_Discovery_&_Inspiration/RemoteFavoritesRepository.ts` | `listItems()` / `addItem()` / `removeItem()` | 前端可指定任意 `userId` 越权操作 |

业务层对应方法：

| 文件 | 函数 | 风险 |
|---|---|---|
| `business_logic_layer/03_Destination_Discovery_&_Inspiration/EventSyncService.ts` | `clearEvents()` | 清空活动数据的业务入口 |
| `business_logic_layer/03_Destination_Discovery_&_Inspiration/QualityRatingSyncService.ts` | `clearQualityRatings()` | 清空官方评级数据的业务入口 |
| `business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService.ts` | `clearImageCaches()` | 清空地点图片缓存的业务入口 |

**影响：**
- 攻击者可直接向 `/api/discovery/events` 发送 `DELETE`，清空全部活动数据。
- 攻击者可直接向 `/api/discovery/official-quality-ratings` 发送 `DELETE`，清空全部官方评级数据。
- 攻击者可直接向 `/api/discovery/place-image` 发送 `DELETE`，清空全部地点图片缓存。
- 攻击者可通过 `/api/discovery/favorites?userId=<受害者ID>&id=<条目ID>` 删除他人收藏。
- 攻击者可通过未授权 `POST` 向数据库写入恶意数据。

---

### 3.2 中高危：存储型 XSS 风险

由于 `/api/discovery/events` 的 `POST()` 未授权，攻击者可以向 `events` 表写入任意 `url` 字段。前端渲染时未校验 URL 协议：

| 文件 | 位置 | 风险 |
|---|---|---|
| `app/03_Destination_Discovery_&_Inspiration/curatedInspirations.tsx` | 第 196 行 `<a href={event.url} ...>` | 恶意 `url` 可被当作 `javascript:` 等协议执行，造成存储型 XSS |

同样存在 URL 协议白名单缺失的位置：

| 文件 | 位置 | 风险 |
|---|---|---|
| `app/03_Destination_Discovery_&_Inspiration/favouriteList.tsx` | 第 184 行 `src={item.thumbnailUrl}` | 收藏缩略图 URL 可被未授权写入恶意地址 |
| `app/03_Destination_Discovery_&_Inspiration/collections/[collectionId]/page.tsx` | 第 120、163、264 行 `src={...}` | 图片 URL 未校验协议 |
| `app/03_Destination_Discovery_&_Inspiration/collections/[collectionId]/page.tsx` | 第 221、255 行 `href={...wikivoyageUrl}` | 外链 URL 未校验协议 |
| `app/03_Destination_Discovery_&_Inspiration/place/[placeId]/page.tsx` | 第 135 行 `src={images[place.id].url}` | 图片缓存 URL 可被未授权写入 |

**影响：**
- 恶意写入的 `url` 被渲染为 `<a href>` 时，可能造成存储型 XSS。
- 恶意 `img src` 直接执行脚本的风险较低，但可能被用于外部追踪、加载恶意内容或污染缓存。

---

## 4. 修复建议

1. **所有写/删操作必须经过服务端授权**
   - `app/api/discovery/events/route.ts`
   - `app/api/discovery/official-quality-ratings/route.ts`
   - `app/api/discovery/place-image/route.ts`
   - `app/api/discovery/favorites/route.ts`

   应至少：
   - 校验登录会话；
   - 校验操作者身份/角色；
   - DEV 专用接口在生产环境禁用，或仅允许管理员/内部调用。

2. **收藏接口不要信任前端传入的 `userId`**
   - 应从服务端会话中获取当前用户 ID，而不是从请求参数/body 中读取。
   - 否则即使加了登录，攻击者仍可通过伪造 `userId` 越权操作。

3. **对外链 URL 做协议白名单**
   - 所有渲染到 `href` 的外部 URL 只允许 `http:` / `https:`。
   - 所有 `img src` 也应校验为 `http:` / `https:`，避免 `data:`、`javascript:` 等异常协议。

4. **为 DEV 数据同步/清空功能增加独立保护**
   - `EventSyncService.clearEvents()`
   - `QualityRatingSyncService.clearQualityRatings()`
   - `DiscoveryService.clearImageCaches()`

   对应 Route API 不应在未认证状态下可被公网调用。
