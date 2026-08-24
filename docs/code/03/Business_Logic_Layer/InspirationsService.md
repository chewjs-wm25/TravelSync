# InspirationsService.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Business Logic Layer
> - 源文件：`business_logic_layer/03_Destination_Discovery_&_Inspiration/InspirationsService.ts`
> - 类型：业务服务类（单例导出）

## 责任

模块 03 的灵感集锦（Inspirations）业务逻辑，浏览器端执行。职责包括：

- **灵感合辑主题自动发现**：遍历 Wikivoyage 马来西亚分类树（`Category:Malaysia` → 区域分类 → 叶子州分类），加上行程分类（`Category:South_East_Asia_itineraries`，成员经马来西亚 bbox 坐标过滤）与专题文章，动态构建主题池——主题清单全部来自 API 响应，**无硬编码/人工策展主题**；
- **合辑内容聚合**：分类成员 / 专题文章 / 马来西亚行程 → 领域形态 `Collection`（封面、成员数、Star 数统计），详情含成员列表 `CollectionDetail`；
- **附近灵感推荐**：Wikivoyage geosearch 附近目的地（半径 10000m），按距离排序；
- **缓存与降级**：主题池 sessionStorage 缓存（TTL 24h）+ 成员聚合会话内存缓存（`detailCache`）+ 批次游标持久化（Generate more 不重复）；失败不缓存、下次自动重试；请求间隔 250ms 抗匿名限流。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `api_layer/.../WikivoyageApi` | `wikivoyageApi` 客户端 + `wikivoyageArticleUrl` 外链构造 + `WikivoyageApi`/`WikivoyagePageDto` 类型 |
| `api_layer/.../MalaysiaBounds` | `isInMalaysiaBounds`（行程成员坐标过滤） |
| `./types` | `Collection`、`CollectionDetail`、`CollectionPlaceItem`、`NearbyInspiration` |

## 导出与函数明细

### 常量 `MAX_COLLECTIONS_DISPLAYED`
- 类型：常量（`9`）
- 用处：累计展示上限，达到后 "Generate more" 切换为外链按钮（Presentation 层导入使用）。

### 类 `InspirationsService`
- 类型：类（构造函数注入 `api: WikivoyageApi = wikivoyageApi`）
- 用处：灵感合辑业务总入口，Presentation 层 `hooks.ts` 通过 `inspirationsService` 单例调用。

#### `getCollections()`
- 传入：无
- 传出：`Promise<Collection[]>`（默认批：主题池前 3 个主题的合辑摘要）
- 用处：首页默认合辑展示。重置批次游标为 0 后取第一批（`getCollectionBatch(0, 3)`）。

#### `getMoreCollections(count = DEFAULT_BATCH_SIZE)`
- 传入：`count?: number`（请求数量，默认 3）
- 传出：`Promise<Collection[]>`（数量钳制在累计上限 `MAX_COLLECTIONS_DISPLAYED` 与主题池剩余量内；越界返回空数组）
- 用处："Generate more" 下一批合辑。从批次游标继续（游标已跳过失败/空主题，不重复返回已展示合辑）。

#### `getCollectionDetail(collectionId: string)`
- 传入：`collectionId: string`（主题池 id，如 `cat:Category:Penang`）
- 传出：`Promise<CollectionDetail | null>`（`null` = 合辑确实不存在；抛 `Error` = 主题池暂不可用，UI 展示可重试的加载失败）
- 用处：合辑详情页数据源。先查会话内存缓存，未命中则按主题源聚合；主题未命中且池为空时抛错以区分"不存在"与"数据源不可用"。

#### `getNearbyInspirations(lat: number, lon: number)`
- 传入：`lat`、`lon`（中心点经纬度）
- 传出：`Promise<NearbyInspiration[]>`（附近目的地，含距离/图/Star 标注）
- 用处：附近灵感推荐，调用 `api.searchNearbyDestinations`（半径 10000m）并映射领域形态。

### 内部私有方法

| 方法 | 传入 | 传出 | 用处 |
| --- | --- | --- | --- |
| `getCollectionBatch(startIndex, count)` | 起始游标、数量 | `Promise<Collection[]>` | 取主题池一段并聚合为合辑摘要；空主题/失败跳过补足；串行 + 250ms 间隔抗限流；结束后推进并持久化批次游标 |
| `aggregateCollection(theme)` | `CollectionTheme` | `Promise<CollectionDetail>` | 聚合主题成员为合辑详情（分类成员经 `getCategoryPages`，专题/行程经 `getPagesByTitles`）；副标题空时以封面成员导语兜底；写入 `detailCache` |
| `findThemeById(collectionId)` | `string` | `Promise<CollectionTheme \| null>` | 在主题池解析主题，兼容 id 未编码/URL 编码两种形态 |
| `ensureBatchCursorLoaded()` | 无 | `void` | 批次游标懒初始化（从 sessionStorage 恢复，不可用时从 0 开始） |
| `persistBatchCursor(value)` | `number` | `void` | 游标写入 sessionStorage（尽力而为） |
| `getThemePool()` | 无 | `Promise<CollectionTheme[]>` | 主题池获取：内存 → sessionStorage（TTL 24h）→ 动态构建；构建失败返回空池且不缓存；并发去重（`poolInFlight`） |
| `loadPoolFromSession()` | 无 | `Promise<CollectionTheme[]>` | 读取 sessionStorage 主题池（缺失/损坏/过期 reject 触发重建） |
| `persistPool(pool)` | `CollectionTheme[]` | `void` | 主题池写入 sessionStorage（尽力而为） |
| `buildThemePool()` | 无 | `Promise<CollectionTheme[]>` | 动态构建主题池（6 步：根分类成员 → 区域子分类遍历 → 分类主题组装 → 州文章导语副标题 → 行程过滤 → 合成专题/行程主题） |

### 内部类型与工具（模块私有）

| 名称 | 类型 | 用处 |
| --- | --- | --- |
| `CollectionTheme` | 接口 | 主题池条目内部形态（id/title/subtitle/source/categoryTitle?/memberTitles?） |
| `PoolCachePayload` | 接口 | sessionStorage 存储形态（savedAt + themes） |
| `sleep(ms)` | 函数 | 延时工具，分散请求节奏 |
| `tryDecodeURIComponent(value)` | 函数 | 尝试 URL 解码（失败返回原值，幂等安全） |
| `isPageInMalaysia(page)` | 函数 | 判定文章坐标是否位于马来西亚（行程主题成员过滤） |
| `toCollectionPlaceItem(page)` | 函数 | Wikivoyage 文章 DTO → 合辑成员领域形态 |
| `toCollectionSummary(detail)` | 函数 | 合辑详情 → 合辑摘要（剥离 items） |

### 关键常量（模块私有）
- `MALAYSIA_ROOT_CATEGORY = "Category:Malaysia"`、`ITINERARIES_SOURCE_CATEGORY = "Category:South_East_Asia_itineraries"`。
- `POOL_CACHE_KEY = "module03:inspiration-pool:v1"`、`BATCH_CURSOR_KEY = "module03:inspiration-cursor:v1"`。
- `POOL_CACHE_TTL_MS = 24h`、`DEFAULT_BATCH_SIZE = 3`、`STAR_BADGE_KEY = "wikibase-badge-Q17559452"`、`NEARBY_RADIUS_METERS = 10000`、`CATEGORY_MEMBER_LIMIT = 100`、`COLLECTION_THUMB_WIDTH = 960`、`REQUEST_SPACING_MS = 250`。

### 常量导出
- **`inspirationsService`**：`InspirationsService` 单例（Presentation 层 hooks 使用）。
