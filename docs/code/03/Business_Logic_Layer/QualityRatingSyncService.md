# QualityRatingSyncService.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Business Logic Layer
> - 源文件：`business_logic_layer/03_Destination_Discovery_&_Inspiration/QualityRatingSyncService.ts`
> - 类型：业务服务类（单例导出，浏览器端）

## 责任

模块 03 官方品质评级（Offical Quality Rating）**同步**业务逻辑的浏览器端入口（DEV 工具链路）。职责（单一）：

- **`syncQualityRatings`（全量）两阶段编排**：
  ① 委托 `RemoteQualityRatingRepository.syncFromWeb()` 触发服务端 Route API `/official-quality-ratings/sync`——服务端在 Cloudflare Worker 内完成"MOTAC 官网 admin-ajax 爬取（API Layer `MotacMyTqaApi`）→ 映射为实体（jsonId = 公司名+地址哈希）→ D1 幂等 upsert → 跳过率 ≤25% 时镜像清理旧行"（浏览器无法直连官网：跨域被 CORS 拦截，爬虫只能在服务端执行，编排见 `server/QualityRatingWebSyncService`）；
  ② 读取 D1 当前名单，对 `lat/lon` 缺失的行逐条调用 `NominatimApi` 地理编码补全（限马来西亚，免费无需 key；内置"逗号递减"降级与 1 请求/秒限速）并批量 upsert 回 D1；单条失败（无匹配或瞬时错误）不阻塞，lat/lon 保持 null 照常入库，失败明细经 `failures` 返回并在终端逐条打印；
- **`syncQualityRatingsSample(count)`（快速测试模式）**：仅导入官网前 `count` 条（服务端 `limit` 模式：单请求、**永不镜像清理**），不做地理编码——秒级验证"爬虫解析 → D1 入库"链路，避免测试占用大量时间；
- **幂等策略**：D1 表以 json_id（公司名+地址哈希）为主键，upsert 天然幂等；服务端每日 cron 与按钮全量共用同一端点；
- **防重策略**：模块级 `running` 标志拒绝并发调用（单例服务级保险；跨刷新/跨标签页的防重由 Presentation 层 localStorage 运行标记负责）；
- **进度回调**：可选 `onProgress(done, total)` 供 UI 实时展示阶段②（地理编码）进度（支撑超时警告体验；阶段①为单次请求无逐条进度）。

数据源说明：原 hardcode JSON（`officalQualityRating_hardcode.json` / `HardcodedQualityRatingRepository`）已退出同步链路，文件按仓库约定保留但不被引用（镜像 `EventSyncService` 先例）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `api_layer/.../NominatimApi` | `nominatimApi.geocodeAddress`（阶段②按公司地址查询经纬度） |
| `data_access_layer/.../RemoteQualityRatingRepository` | 浏览器端远程 D1 仓储（`syncFromWeb` 服务端同步触发 / `listAll` / `upsertAll` / `clearAll`） |
| `data_access_layer/.../OfficialQualityRatingRepository` | `OfficialQualityRatingEntity` 类型 |
| `business_logic_layer/.../server/QualityRatingWebSyncService`（服务端） | 阶段①服务端编排（本文件不直接依赖，经 Route API 间接调用） |

## 导出与函数明细

### 接口 `QualityRatingSyncFailure`
- 类型：接口
- 字段：`jsonId: string`（D1 主键）、`companyName: string`、`companyAddress: string`（用于 Nominatim 查询的原始地址）、`reason: string`（失败原因："no-match" 或瞬时错误消息）
- 用处：单条地理编码失败明细，供 UI 在终端打印/展示"哪个地点无法获取到地点信息"。

### 接口 `QualityRatingSyncResult`
- 类型：接口
- 字段：`total`（官网抓取卡片总数）、`synced`（服务端实际写入 D1 条数）、`newlyGeocoded`（地理编码阶段成功补全条数）、`failed`（地理编码失败条数）、`failures: QualityRatingSyncFailure[]`（失败明细）、`pruned?: number`（服务端镜像清理行数，快速测试恒 0）、`skipped?: number`（服务端解析失败跳过卡片数）
- 用处：同步结果统计，供 UI 反馈展示。

### 类型 `QualityRatingSyncProgressCallback`
- 类型：函数类型（`(done: number, total: number) => void`）
- 用处：同步进度回调（阶段②每处理完一条调用一次）。

### 类 `QualityRatingSyncService`
- 类型：类（模块级 `running` 防重标志）
- 用处：官方评级同步业务入口，DEV 页面通过 `qualityRatingSyncService` 单例调用。

#### `syncQualityRatings(onProgress?: QualityRatingSyncProgressCallback)`
- 传入：`onProgress?`（进度回调，阶段②每处理完一条调用一次）
- 传出：`Promise<QualityRatingSyncResult>`
- 用处：执行一次全量同步：①服务端爬取 MOTAC 官网 → upsert →（跳过率 ≤25% 时）镜像清理 D1；②对 D1 中经纬度缺失的行逐条调用 Nominatim 按公司地址补全（"逗号递减"降级与限速，成功填充 lat/lon，失败保持 null 不阻塞，失败明细经 `failures` 返回并在终端逐条 `console.warn` 打印），批量 upsert 回 D1。**并发调用（running 为 true）时直接抛错** "Sync already in progress" 拒绝重复进程。

#### `syncQualityRatingsSample(count = 3)`
- 传入：`count`（默认 3）
- 传出：`Promise<QualityRatingSyncResult>`（`newlyGeocoded=0`、`failures=[]`、`pruned=0`）
- 用处：快速测试：仅导入官网前 `count` 条（服务端 `limit` 模式，永不清理、无地理编码），秒级验证爬虫/入库链路。并发防重同上。

#### `clearQualityRatings()`
- 传入：无
- 传出：`Promise<number>`（实际删除的 D1 official_quality_ratings 记录条数）
- 用处：清空全部官方评级数据（DEV 工具），失败抛错由调用方反馈。

### 常量导出
- **`qualityRatingSyncService`**：`QualityRatingSyncService` 单例。
