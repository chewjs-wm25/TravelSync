# MalaysiaBounds.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：API Layer
> - 源文件：`api_layer/03_Destination_Discovery_&_Inspiration/MalaysiaBounds.ts`
> - 对接的外部服务：无（纯本地常量与判定工具，不发起任何网络请求）

## 责任

本文件是模块 03 的**马来西亚地理范围共享常量**，职责单一：提供马来西亚大致边界框（bbox）常量与判定函数，供模块 03 所有需要"范围限制在马来西亚"的外部 API 客户端复用（**单一事实来源**）：
- `WikimediaGeosearchApi`（前端直连，入口坐标与逐文件坐标校验）；
- `WikipediaImageApi`（前端直连）；
- `MapillaryApi`（浏览器端预校验）；
- Mapillary 代理 Route API（服务端强校验，属注释引用）。

范围说明：马来西亚实际边界约为 lat 0.85°–7.36°（半岛 + 东马）、lon 99.64°–119.27°；本 bbox 取**略外扩的矩形**（lon 99.5–119.5、lat 0.8–7.8），覆盖全境且不含邻国（新加坡、泰国南部、印尼加里曼丹边缘等），用于"图片必须位于马来西亚"的硬性过滤。

重要注意：bbox 是矩形近似。对 geosearch 等圆形搜索，除入口坐标校验外，上层还需对结果**逐条校验**（见 `WikimediaGeosearchApi.pickImage`），防止边境附近半径越界（如柔佛南部 5km 半径可触及新加坡）。

## 依赖

无模块 03 内部文件依赖，也不依赖任何外部库。

## 在模块 03 中的使用场景

| 使用方 | 使用环节 | 判定用途 |
| --- | --- | --- |
| `WikimediaGeosearchApi` | `findImageByCoords` 入口 + `pickImage` 逐文件 | 入口坐标不在 bbox 内直接返回 null；结果文件坐标逐条校验（防边境越界） |
| `WikipediaImageApi` | 搜索关键词构造 | 关键词强制含 "Malaysia"（间接实现范围限制） |
| `MapillaryApi` | `findImageId` 入口 | 坐标不在 bbox 内直接返回 null，不发起请求 |
| `WikivoyageApi` | `searchNearbyDestinations` 入口 + 结果逐条 | 入口不在 bbox 内不请求；geosearch 结果逐条校验（柔佛南部可触及新加坡） |
| Mapillary 代理 Route API | 服务端强校验 | bbox 完全落在马来西亚内，否则 400 拒绝（注释引用，非本文件 import） |

## 导出与函数明细

### `MALAYSIA_BBOX`
- 类型：常量（`as const`）
- 传入：无
- 传出：`{ minLon: 99.5; maxLon: 119.5; minLat: 0.8; maxLat: 7.8 }`
- 用处：马来西亚大致边界框（WGS84，略外扩覆盖全境，不含邻国）。四个字段：`minLon`（最小经度 99.5）、`maxLon`（最大经度 119.5）、`minLat`（最小纬度 0.8）、`maxLat`（最大纬度 7.8）。供 `isInMalaysiaBounds` 及模块内各客户端（如 Mapillary 客户端/代理端点）直接引用。

### `isInMalaysiaBounds(lat: number, lon: number)`
- 类型：函数
- 传入：`lat`——纬度；`lon`——经度
- 传出：`boolean`——坐标是否位于马来西亚边界框内
- 用处：判定坐标是否位于马来西亚边界框内。返回语义：坐标必须为有限数值（`Number.isFinite` 校验，非法坐标返回 `false`）且同时满足 `lat ∈ [0.8, 7.8]`、`lon ∈ [99.5, 119.5]`（落在 `MALAYSIA_BBOX` 内）。被 `WikimediaGeosearchApi`、`MapillaryApi`、`WikivoyageApi` 等客户端用于入口坐标校验与结果逐条校验。

## 判定示例（供测试参考）

| 坐标 | 判定结果 | 说明 |
| --- | --- | --- |
| (3.1390, 101.6869) —— Kuala Lumpur | true | 马来西亚首都，位于 bbox 内 |
| (5.4141, 100.3288) —— George Town, Penang | true | 槟城首府，位于 bbox 内 |
| (1.3521, 103.8198) —— 新加坡 | false | 纬度/经度均超出 bbox（邻国排除） |
| (8.0, 100.0) —— 泰国南部 | false | 纬度超出 maxLat=7.8 |
| (NaN, 101.0) | false | 非法数值（`Number.isFinite` 校验失败） |

注意：bbox 是矩形近似，仅用于"图片/地点必须位于马来西亚"的硬性过滤；实际边界（半岛 + 东马）约为 lat 0.85°–7.36°、lon 99.64°–119.27°，本 bbox 在其基础上略外扩以覆盖全境。
