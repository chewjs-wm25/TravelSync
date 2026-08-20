# QualityRatingSyncService.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Business Logic Layer
> - 源文件：`business_logic_layer/03_Destination_Discovery_&_Inspiration/QualityRatingSyncService.ts`
> - 类型：业务服务类（单例导出）

## 责任

模块 03 官方品质评级（Offical Quality Rating）**同步**业务逻辑（DEV 工具链路）。职责（单一）：

- 编排"官方评级 hardcode JSON → Nominatim 地理编码 → 写入 Cloudflare D1"全流程；
- 逐条以公司地址（Company Address）调用 Nominatim API 查询经纬度（限马来西亚，免费无需 key；客户端内置"逗号递减"降级与限速），与 JSON 原字段（公司名/地址/电话/评级有效期/品质等级）一并写入 D1；placeId/分类等其余补全字段保持 null；
- **容错策略**：单条查询失败（无匹配或瞬时错误）不阻塞录入，该条 lat/lon 保持 null 照常入库，由统计字段反馈，并收集失败明细（companyName/companyAddress/reason）供 UI 在终端打印"哪个地点无法获取到地点信息"；
- **幂等策略**：D1 表以 json_id 为主键，upsert 天然幂等；
- **防重策略**：模块级 `running` 标志拒绝并发调用（单例服务级保险；跨刷新/跨标签页的防重由 Presentation 层 localStorage 运行标记负责）；
- **进度回调**：可选 `onProgress(done, total)` 供 UI 实时展示进度（支撑超时警告体验）。

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `api_layer/.../NominatimApi` | `nominatimApi.geocodeAddress`（按公司地址查询经纬度） |
| `data_access_layer/.../HardcodedQualityRatingRepository` | 读取 officalQualityRating_hardcode.json 全量条目 |
| `data_access_layer/.../RemoteQualityRatingRepository` | 浏览器端远程 D1 仓储（upsertAll / clearAll） |
| `data_access_layer/.../OfficialQualityRatingRepository` | `OfficialQualityRatingEntity` 类型 |

## 导出与函数明细

### 接口 `QualityRatingSyncFailure`
- 类型：接口
- 字段：`jsonId: string`（JSON 条目 id）、`companyName: string`、`companyAddress: string`（用于 Nominatim 查询的原始地址）、`reason: string`（失败原因："no-match" 或瞬时错误消息）
- 用处：单条同步失败明细，供 UI 在终端打印/展示"哪个地点无法获取到地点信息"。

### 接口 `QualityRatingSyncResult`
- 类型：接口
- 字段：`total`（JSON 总条数）、`synced`（实际写入 D1 条数）、`newlyGeocoded`（经 Nominatim 成功补全经纬度条数）、`failed`（无坐标条数，lat/lon 保持 null 照常入库）、`failures: QualityRatingSyncFailure[]`（失败明细）
- 用处：同步结果统计，供 UI 反馈展示。

### 类型 `QualityRatingSyncProgressCallback`
- 类型：函数类型（`(done: number, total: number) => void`）
- 用处：同步进度回调（每处理完一条调用一次）。

### 类 `QualityRatingSyncService`
- 类型：类（模块级 `running` 防重标志）
- 用处：官方评级同步业务入口，DEV 页面通过 `qualityRatingSyncService` 单例调用。

#### `syncQualityRatings(onProgress?: QualityRatingSyncProgressCallback)`
- 传入：`onProgress?`（进度回调，每处理完一条调用一次）
- 传出：`Promise<QualityRatingSyncResult>`
- 用处：执行一次全量同步：①读取 hardcode JSON 全量条目；②逐条调用 Nominatim 按公司地址查询经纬度（"逗号递减"降级与限速，成功填充 lat/lon，失败保持 null 不阻塞，失败明细经 `failures` 返回并在终端逐条 `console.warn` 打印）；③批量 upsert 到 D1（JSON 原字段 + 经纬度）；④返回统计。**并发调用（running 为 true）时直接抛错** "Sync already in progress" 拒绝重复进程。

#### `clearQualityRatings()`
- 传入：无
- 传出：`Promise<number>`（实际删除的 D1 official_quality_ratings 记录条数）
- 用处：清空全部官方评级数据（DEV 工具），失败抛错由调用方反馈。

### 常量导出
- **`qualityRatingSyncService`**：`QualityRatingSyncService` 单例。
