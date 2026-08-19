# 03_Geoapify 地点数据说明

> 用途：说明模块 03 从 **Geoapify Geocoding API**（免费套餐，无需信用卡）获取的地点包含哪些信息，
> 供后续开发"展示地点相关功能"（搜索结果卡片、地点详情、地图标注等）时参考。

## 1. 数据源与端点

| 端点 | URL | 用途 | 项目对应实现 |
| --- | --- | --- | --- |
| 自动联想 (Autocomplete) | `GET https://api.geoapify.com/v1/geocode/autocomplete` | 输入部分文字即返回候选地点（搜索框联想下拉） | `GeoapifyGeocodingApi.autocompletePlaces()` |
| 正向搜索 (Forward Search) | `GET https://api.geoapify.com/v1/geocode/search` | 按完整查询文本搜索地点（搜索结果页 / 详情页） | `GeoapifyGeocodingApi.searchPlaces()` |

**必填参数**：`text`（查询文本）、`apiKey`（来自 `.env` 的 `NEXT_PUBLIC_GEOAPIFY_API_KEY`）

**项目强制参数**（旅游规划范围仅限马来西亚）：

```
filter=countrycode:my   # 硬性过滤，只返回马来西亚结果
lang=en                 # 返回英文名称/地址
limit=N                 # 结果数量上限（联想 6，搜索 10）
```

**配额**：免费套餐 3000 credits/天，1 次请求 = 1 credit，约 5 req/s。

## 2. 响应结构（GeoJSON）

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "...地点字段..." },
      "geometry": { "type": "Point", "coordinates": [lon, lat] }
    }
  ]
}
```

> 注意：`geometry.coordinates` 顺序为 **`[经度, 纬度]`**；`properties.lat/lon` 为单独的经纬度字段（便于直接使用）。

## 3. 地点字段清单

以下字段来自 `features[].properties`，项目已在 `GeoapifyPlaceDto` 中解析并映射到领域模型：

| 字段 | 类型 | 说明 | 项目中的使用 |
| --- | --- | --- | --- |
| `place_id` | string | 地点唯一标识（详情页/收藏的唯一键） | `id`（前缀 `geo-`）、`placeId` |
| `name` | string | 地点名称（如 "Petronas Towers"） | 卡片/详情标题 |
| `formatted` | string | 完整格式化地址（如 "Batu Caves, Selangor, Malaysia"） | 详情页主地址、联想建议副文本 |
| `address_line1` | string | 地址第一行（街道级） | 卡片地址、详情字段 |
| `address_line2` | string | 地址第二行（区域/城市级） | 卡片地址、详情字段 |
| `country` / `country_code` | string | 国家名 / ISO 国家码（本项目恒为 Malaysia / my） | 详情字段 |
| `state` / `state_code` | string | 州 / 州代码（如 Selangor） | 详情字段 |
| `city` | string | 城市 | 详情字段 |
| `county` / `district` / `suburb` | string | 县 / 区 / 街区（部分结果有） | 未使用（可扩展） |
| `postcode` | string | 邮政编码（部分结果有） | 未使用（可扩展） |
| `street` / `housenumber` | string | 街道 / 门牌号（建筑级结果才有） | 未使用（可扩展） |
| `lat` / `lon` | number | 坐标（注意与 `geometry.coordinates` 的 [lon,lat] 区别） | 详情页坐标展示、未来地图标注 |
| `result_type` | string | 结果类型：`city` / `state` / `district` / `amenity` / `tourism` / `street` / `building` 等 | 详情页标签 |
| `category` | string | 地点分类（如 `tourism.attraction`、`amenity.restaurant`、`populated_place`） | 详情页标签、场景/体验类型推断 |
| `rank.confidence` | number | 匹配置信度 0~1 | 品质徽章推断（占位） |
| `rank.match_type` | string | 匹配类型（`full_match` 等） | 未使用（可扩展） |
| `timezone.name` | string | 时区（如 `Asia/Kuala_Lumpur`） | 未使用（可扩展：营业时间/最佳时段展示） |
| `plus_code` / `plus_code_short` | string | Open Location Code | 未使用（可扩展） |
| `population` | number | 人口（**仅城市类结果**） | 未使用（可扩展） |
| `bbox` | number[] | 边界框 `[lon1,lat1,lon2,lat2]` | 未使用（可扩展：地图聚焦范围） |

### 字段缺失说明（官方文档）

> *"Depending on the type of returned location some fields may be missing"*

字段是否出现**取决于结果类型**：建筑级结果有 `street/housenumber`，城市级结果有 `population`，
`postcode/county/district/suburb/timezone` 等部分结果才有。**渲染时必须对可选字段做空值兜底**（项目已用 `?.` 与 `||` 处理）。

## 4. 项目中的字段映射与推断（重要）

Geoapify 是**免费地理编码服务**，不提供以下旅游展示字段，项目当前以**推断/占位值**填充（见 `DiscoveryService.toPoiItem`）：

| PoiItem 字段 | 来源 | 说明 |
| --- | --- | --- |
| `qualityBadge` | 推断 | 由 `rank.confidence` 映射（≥0.9 platinum / ≥0.75 gold / 其余 silver），**非官方评级** |
| `scene` (indoor/outdoor) | 推断 | 由 `category`/`result_type` 关键词判断，默认 outdoor |
| `experienceType` | 推断 | 由 `category` 映射（Museums & Culture / Food & Dining / …） |
| `suggestedDuration` / `ticketPrice` / `isOpenNow` / `facilities` | 占位 | 免费数据无这些字段（`facilities` 恒为空数组，`ticketPrice` 为 "—"，`isOpenNow` 恒 true），UI 已标注 estimated |
| `imageUrl` | 恒空 | **Geoapify 不返回图片**，卡片/详情页使用品牌色渐变占位图 |

**后续开发提示**：若需真实图片/营业时间/门票/设施数据，可考虑接入其他免费数据源（如
data.gov.my 官方数据、Wikimedia Commons 图片），在 `api_layer` 以新 DTO 扩展，BL 层合并映射即可。

## 5. 领域模型（模块 03 当前形态）

```
GeoapifyPlaceDto (api_layer)  →  PlaceDetail / PoiItem (business_logic_layer)
  placeId, name, formatted,
  addressLine1/2, city, state,
  country, countryCode,
  category, resultType,
  confidence, lat, lon
```

- 主页推荐/搜索用 `PoiItem`（展示卡片所需的最小字段 + 推断值）
- 搜索页/详情页用 `PlaceDetail`（`PoiItem` + 完整地理字段）
- 联想建议用 `SuggestionItem`（placeId / name / formatted / lat / lon）

> 新增"显示地点"功能时：优先使用 `PlaceDetail`（字段最全）；需要新字段时先确认 Geoapify 是否返回
> （对照第 3 节清单），再在 `GeoapifyPlaceDto` 中补充解析，避免在 BL/UI 层臆造。
