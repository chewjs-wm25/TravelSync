# routes.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/routes.ts`
> - 类型：常量模块（路由路径常量与路径构造函数）

## 责任

`routes.ts` 集中管理模块 03 的全部页面路由常量与路径构造函数，供主页搜索框跳转、搜索结果页、地点详情页、灵感合辑页共用，避免路径散落硬编码。模块内不涉及任何数据获取，是纯字符串与 URL 构造逻辑，无副作用。

关键设计：
- `searchPagePath` 把搜索词与可选筛选参数序列化为 URL query（`q` / `exp` / `scene` / `state`），且筛选参数仅在「实际选中」时写入——`scene` 为 `"all"` 时不写、空字符串不写，保证 URL 简洁、旧链接（仅 `q`）完全兼容；
- `placeDetailPath` 与 `collectionDetailPath` 对外部标识（placeId / collectionId）做 `encodeURIComponent` 编码，保证特殊字符安全；
- `googleMapsUrl` 构造 Google Maps 搜索链接（Recommended Places 卡片点击后新标签页打开，按「地点名 + 地址」搜索）；
- `WIKIVOYAGE_HOME` 作为 Wikivoyage 主站常量，用于合辑数据来源署名与「浏览全部」外链。

## 路由与调用方总览

| 导出 | 形态 | 调用方 |
| --- | --- | --- |
| `MODULE_03_HOME` | 常量 | 主页返回链接（search/place 页）、collections 返回链接 |
| `SEARCH_PAGE` | 常量 | `place/[placeId]/page.tsx`（无搜索词时的返回目标） |
| `searchPagePath` | 函数 | `searchAndFilter.tsx`（跳转）、`search/page.tsx`（URL 同步） |
| `placeDetailPath` | 函数 | `search/page.tsx`（结果卡）、`favouriteList.tsx`（条目跳转） |
| `googleMapsUrl` | 函数 | `officalQualityRate.tsx`（卡片外链） |
| `collectionDetailPath` | 函数 | `curatedInspirations.tsx`（合辑卡片） |
| `WIKIVOYAGE_HOME` | 常量 | `curatedInspirations.tsx`、`collections/[collectionId]/page.tsx`（署名/外链） |

## 关键设计要点

- **URL 简洁性**：`searchPagePath` 只在筛选「实际选中」时写参数（`scene === "all"` 不写、空串不写、`q` 为空不写），历史链接（仅 `q`）完全兼容；
- **编码安全**：`placeDetailPath` / `collectionDetailPath` 对 `placeId` / `collectionId` / `q` 全部 `encodeURIComponent`，特殊字符（空格、`&`、`#`）安全；
- **单一事实源**：所有页面共享这些常量与构造函数，路径变更只需改此一处；
- **分层约束**：本文件只依赖 BL 层的类型定义（`activeType`），不含任何运行时跨层调用。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | 类型 `activeType`（仅记录 import，未打开源文件） |
| 外部库：无 | — |

## 导出与函数明细

### `MODULE_03_HOME`（常量）
- 类型：常量
- 内容：`"/03_Destination_Discovery_&_Inspiration"` —— 模块 03 首页（探索主页）路径。

### `SEARCH_PAGE`（常量）
- 类型：常量
- 内容：`` `${MODULE_03_HOME}/search` ``，即 `/03_Destination_Discovery_&_Inspiration/search` —— 搜索结果页路径（query 参数 `q` 为搜索词）。

### `SearchUrlFilters`（接口）
- 类型：常量（TypeScript 接口）
- 内容：`{ experienceType?: string; scene?: activeType; state?: string }` —— 搜索结果页 URL 上可携带的筛选参数，与 `SearchAndFilter` 筛选面板一一对应（体验类型 / 场景 / 州属）。

### `searchPagePath`
- 类型：函数
- 传入：`q: string`（搜索词）；`filters?: SearchUrlFilters`（可选筛选参数：`experienceType` / `scene` / `state`）
- 传出：`string` —— 搜索结果页完整路径；无任何参数时返回 `SEARCH_PAGE` 本身。
- 用处：用 `URLSearchParams` 拼装 query：
  - `q` 先 `trim`，非空才 `params.set("q", trimmed)`；
  - `filters.experienceType` 非空才写 `exp`；
  - `filters.scene` 存在且不等于 `"all"` 才写 `scene`；
  - `filters.state` 非空才写 `state`；
  - 最终 `query = params.toString()`，非空则返回 `` `${SEARCH_PAGE}?${query}` ``，否则返回 `SEARCH_PAGE`。
  - 调用方：`SearchAndFilter.goToSearchPage`（跳搜索结果页）与 `search/page.tsx`（筛选状态同步 URL）。

### `placeDetailPath`
- 类型：函数
- 传入：`placeId: string`（Geoapify place_id）；`q: string`（原始搜索词，详情页据此重查 API）
- 传出：`string` —— `` `${MODULE_03_HOME}/place/${encodeURIComponent(placeId)}?q=${encodeURIComponent(q)}` ``。
- 用处：构造地点详情页路径，两个参数均做 URL 编码。调用方：搜索结果卡（`search/page.tsx`）与收藏夹条目（`favouriteList.tsx`）。

### `googleMapsUrl`
- 类型：函数
- 传入：`query: string` —— 搜索文本（如 `"地点名 地址"`）
- 传出：`string` —— `https://www.google.com/maps/search/?api=1&query=<encodeURIComponent(query)>`。
- 用处：Recommended Places 卡片点击后在新标签页打开 Google Maps 搜索该地点的链接（调用方：`officalQualityRate.tsx`）。

### `collectionDetailPath`
- 类型：函数
- 传入：`collectionId: string` —— 合辑主题源标识
- 传出：`string` —— `` `${MODULE_03_HOME}/collections/${encodeURIComponent(collectionId)}` ``。
- 用处：构造灵感合辑详情页路径（调用方：`curatedInspirations.tsx` 合辑卡片）。

### `WIKIVOYAGE_HOME`（常量）
- 类型：常量
- 内容：`"https://en.wikivoyage.org/"` —— Wikivoyage 主站（合辑数据来源署名 / 「浏览全部」外链目标）。
