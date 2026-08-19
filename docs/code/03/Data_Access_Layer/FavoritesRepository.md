# FavoritesRepository.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Data Access Layer
> - 源文件：`data_access_layer/03_Destination_Discovery_&_Inspiration/FavoritesRepository.ts`
> - 类型：仓储接口

## 责任

本文件是模块 03 用户收藏夹（Favourite List）的仓储接口定义，同时定义了收藏条目实体类型 `FavoriteItemEntity`。接口职责单一：封装用户收藏数据的持久化读写契约，不包含任何业务判断（业务规则由 Business Logic Layer 负责）。

数据模型要点（代码注释明确约定）：

- **每个用户只有一个收藏夹**：不区分文件夹，条目按 `user_id` 归属；
- **所有方法均需携带 `userId`**：当前由 BL 层硬编码注入（见 `FavoritesService`），即项目现阶段没有真实用户体系，用固定 userId 区分数据归属，为将来接入鉴权预留结构。

### 实现类一览

| 实现类 | 运行环境 | 数据源/方式 | 场景 |
| --- | --- | --- | --- |
| `D1FavoritesRepository` | 服务端（Route API） | 直接操作 Cloudflare D1，SQL 内聚于该类 | 收藏数据持久化 |
| `RemoteFavoritesRepository` | 浏览器端 | 经 Route API（`app/api/discovery/favorites`）转发到服务端实现 | 页面收藏夹读写 |

### 数据流

- 浏览器端 BL → `RemoteFavoritesRepository.{listItems|addItem|removeItem}` → Route API（`app/api/discovery/favorites`）→ `D1FavoritesRepository` 对应方法 → D1 表 `favorite_items`。

调用方（Business Logic Layer）只依赖本接口，切换实现时无需改动。

## 依赖

本文件为纯类型/接口声明，**没有任何 import**（不依赖模块 03 内部文件，也不依赖外部库）。

## 导出与函数明细

### `FavoriteItemEntity`

- 类型：接口
- 传入：无（实体类型）
- 传出：收藏夹条目对象，对应 D1 表 `favorite_items` 的一行，字段如下：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 收藏条目唯一标识（= 地点 POI id，如 `"geo-<placeId>"`），D1 主键 |
| `placeId` | `string` | Geoapify 原始 place_id（用于跳转地点详情页） |
| `name` | `string` | 地点名称 |
| `thumbnailUrl` | `string` | 缩略图 URL |
| `experienceType` | `string` | 体验类型（如 "Museums & Culture"），收藏夹类型过滤器的依据 |

- 用处：收藏条目的传输载体。`id` 由调用方（BL 层）生成，`placeId` 保留外部系统（Geoapify）的原始标识，二者分离以便展示与跳转；`experienceType` 支撑收藏夹按体验类型过滤的展示需求。

### `FavoritesRepository`

- 类型：接口
- 传入：无（接口本身）
- 传出：三个方法的签名与语义：

| 方法 | 签名 | 语义 |
| --- | --- | --- |
| `listItems` | `(userId: string): Promise<FavoriteItemEntity[]>` | 列出某用户收藏夹的全部条目 |
| `addItem` | `(userId: string, item: FavoriteItemEntity): Promise<FavoriteItemEntity>` | 新增一条收藏（`id` 由调用方生成），返回新增的条目 |
| `removeItem` | `(userId: string, id: string): Promise<void>` | 按 `id` 删除某用户的一条收藏 |

- 用处：所有 Favorites 仓储实现的统一契约。接口刻意把 `userId` 作为每个方法的显式参数，保证数据按用户隔离；`removeItem` 同时携带 `userId` 与 `id`，为删除语句提供双重限定（见 `D1FavoritesRepository` 的 `DELETE ... WHERE id = ? AND user_id = ?`），防止越权删除。

## 边界情况与错误处理

- **错误处理职责下放**：接口不处理错误，由实现类决定——`RemoteFavoritesRepository` 对非 2xx 抛 `Error`；`D1FavoritesRepository` 依赖 D1 主键/参数化 SQL 保证数据完整性。
- **重复收藏**：`addItem` 无幂等语义（接口未约定），D1 实现的普通 `INSERT` 在重复 `id` 时抛主键冲突错误，由 BL 层负责去重（如先查询再添加）。
- **删除不存在的条目**：`removeItem` 对不存在的 `id` 静默成功（D1 的 DELETE 影响 0 行），接口语义为幂等删除。
- **空收藏夹**：`listItems` 对无条目的用户返回空数组。
- **userId 缺失/空串**：接口未约定校验，由调用方保证非空；D1 实现中空串 userId 也能查询（返回该「用户」的空列表）。

## 设计要点与注意事项

- **无「新增收藏夹」概念**：接口只有条目级操作（list/add/remove），因为模型约定单用户单收藏夹，无需文件夹管理方法。
- **`id` 与 `placeId` 的关系**：`id` 形如 `"geo-<placeId>"`，本质是 placeId 的派生键；保留两字段使主键稳定且便于直接访问 Geoapify 原始标识。
- **异步契约**：所有方法均为 `Promise` 返回；浏览器端 Remote 实现与接口严格一致（服务端 D1 实现亦然），不存在硬编码实现那样的同步特例。
- **相关文件**：`RemoteFavoritesRepository.ts`、`D1FavoritesRepository.ts`（两个实现类文件）。

## 关联文档

- [`RemoteFavoritesRepository.md`](./RemoteFavoritesRepository.md)：浏览器端经 Route API 的远程实现。
- [`D1FavoritesRepository.md`](./D1FavoritesRepository.md)：服务端 Cloudflare D1 实现。
