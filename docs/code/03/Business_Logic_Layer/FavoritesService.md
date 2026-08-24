# FavoritesService.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Business Logic Layer
> - 源文件：`business_logic_layer/03_Destination_Discovery_&_Inspiration/FavoritesService.ts`
> - 类型：业务服务类（单例导出）

## 责任

模块 03 收藏夹（Favourite List）业务逻辑，浏览器端执行。职责包括：

- 收藏夹的**查询、增删、收藏状态切换**（toggle）；
- **"将地点加入行程（模块 02）"的跨模块业务编排**——经 `RoutePlannerBridge` stub 完成（跨模块数据交流发生在 Business Logic 而非 API Layer）。

设计要点：每个用户只有一个收藏夹（不区分文件夹）；用户 ID 从账号状态（`authUser` store，会话来源）动态读取（`currentUserId()`，未登录返回 `null`），不再硬编码；未登录时读操作返回空收藏集，写操作抛出"请先登录"错误。服务端 Route API 以会话凭证（HMAC 签名 token，DEV 登录接口签发）解析当前用户 ID，不信任前端传入的 `userId`（安全审计修复，见 `docs/fix/module03-security-audit.md` §3.1）。模块内所有服务共享同一个收藏仓储单例（`sharedFavoritesRepository`，浏览器端远程实现：经 Route API → D1FavoritesRepository → Cloudflare D1），保证 DiscoveryService 与 FavoritesService 读写同一份数据。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `data_access_layer/.../FavoritesRepository` | 收藏仓储接口（类型） |
| `data_access_layer/.../RemoteFavoritesRepository` | 浏览器端远程收藏仓储实现（经 Route API → D1，携带会话凭证） |
| `app/DEV-ACCOUNT-STATE/authUser` | 账号状态 store（读取当前用户 ID，会话来源） |
| `./RoutePlannerBridge` | `RoutePlannerBridge` 类 + `PushToRoutePlannerResult` 类型（加入行程桥接） |
| `./types` | `PoiItem`、`SavedItem` 领域类型 |

## 导出与函数明细

### 函数 `currentUserId()`
- 类型：函数（返回 `string | null`）
- 用处：当前登录用户 ID（会话来源）。从账号状态（`authUser` store）读取 `user.id`；未登录返回 `null`。DiscoveryService 也导入使用（未登录时收藏数据按空集处理）。

### 常量 `sharedFavoritesRepository`
- 类型：常量（`FavoritesRepository` 实例）
- 用处：模块内共享的收藏仓储单例（`new RemoteFavoritesRepository()`），保证模块内所有服务读写同一份数据。

### 类 `FavoritesService`
- 类型：类（构造函数注入 `repo: FavoritesRepository = sharedFavoritesRepository`、`routePlanner: RoutePlannerBridge = new RoutePlannerBridge()`）
- 用处：收藏业务入口，Presentation 层 `hooks.ts` 通过 `favoritesService` 单例调用。

#### `getSavedItems()`
- 传入：无
- 传出：`Promise<SavedItem[]>`（当前用户收藏夹全部条目）
- 用处：收藏夹列表数据源（Favourite List 组件）。

#### `removeSavedItem(id: string)`
- 传入：`id: string`（收藏条目 id，即 POI id）
- 传出：`Promise<void>`
- 用处：删除一条收藏（委托仓储 `removeItem`）。

#### `isPoiFavourite(poiId: string)`
- 传入：`poiId: string`
- 传出：`Promise<boolean>`（是否已收藏）
- 用处：指定 POI 收藏状态查询（toggle 内部使用）。

#### `togglePoiFavourite(poi: PoiItem)`
- 传入：`poi: PoiItem`（要切换收藏状态的地点）
- 传出：`Promise<boolean>`（切换后的收藏状态：true = 已收藏）
- 用处：切换 POI 收藏状态。未收藏 → 加入收藏夹（保存 placeId 与体验类型，供详情跳转与类型过滤；id 为 `geo-` 前缀时剥前缀存 placeId）；已收藏 → 移除。

#### `addToTrip(item: SavedItem)`
- 传入：`item: SavedItem`（要加入行程的收藏条目）
- 传出：`Promise<PushToRoutePlannerResult>`（`{ success, pushedCount, target: "02_Trip_Planning_&_Itinerary_Management" }`）
- 用处：跨模块数据交流（Business Logic 编排，非 API Layer 职责）——将地点加入行程（模块 02）。当前经 `RoutePlannerBridge` stub mock 完成，未来替换为模块 02 真实客户端后签名保持不变。

### 常量导出
- **`favoritesService`**：`FavoritesService` 单例（Presentation 层 hooks 使用）。
