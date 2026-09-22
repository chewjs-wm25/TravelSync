# 模块 03：目的地探索与灵感推荐 (Destination Discovery & Inspiration)

## 1. 智能地点搜索与多维筛选 (Smart POI Search & Filtering)
- **关键词搜索与自动联想**：支持输入关键词搜索马来西亚地点（Geoapify 地理编码，服务端代理强制限定马来西亚 `countrycode:my`，前端不可绕过）；搜索框提供真实 Geoapify 自动联想建议（输入 ≥2 字符触发，防抖 300ms）。
- **多维筛选**：搜索结果支持按**体验类型**（Museums & Culture、Food & Dining、Nature & Adventure、Attractions & Landmarks、Shopping、Cities & Towns、Discover Malaysia 共 7 类）与**马来西亚州/联邦直辖区**（13 州 + 3 联邦直辖区）下拉筛选；筛选条件序列化到 URL（`searchPagePath`），可分享/回退。注：官方品质评级（Recommended Places）为**独立展示区**，不属于筛选维度。
- **室内外场景分类**：提供 Indoor / Outdoor / All 场景标签页，按室内场馆或室外场景划分，方便用户根据出行偏好筛选（场景由地点分类关键词推断）。
- **州/省信息提供**：向行程规划（模块 02）输出马来西亚 13 州 + 3 联邦直辖区信息（`StateInfo`：标识 / 显示名 / 首府坐标 / 封面图），供创建旅行时选择州/省。

## 2. 灵感集锦与节日活动推荐 (Themed Collections & Event Discovery)
- **主题合辑推荐**：系统自动从 Wikivoyage 马来西亚分类树发现主题合辑（区域 / 州分类 + 行程专题），聚合为灵感合辑卡片（封面 / 导语 / 成员数 / Wikivoyage Star 徽章），支持"Generate more"分批加载（sessionStorage 记忆已展示批次，累计上限 9 个后切换为 Wikivoyage 外链）。合辑详情页展示成员列表（导语 / 缩略图 / Star 徽章 / 外链）与附近灵感推荐（geosearch，马来西亚限定）。
- **节日活动流**：展示马来西亚官方节日、文化活动与赛事的活动流（数据由官方活动数据同步至 Cloudflare D1），活动卡展示分类标签、日期区间、举办地点与官方外链（横向滚动浏览）。

## 3. 深度地点决策卡片 (POI Decision View)
- **地点详情展示**：地点详情页展示地址（Address / Area）、城市、州、国家、坐标、室内外场景，以及**基于分类推断的估计值**——建议停留时长（如 "2-3 hrs (estimated)"）与门票信息（占位值，标注 "(estimated)"）；营业状态为占位值（免费地理数据无营业时间数据）。注：最佳游玩时段与设施/无障碍详情当前无数据源，未提供。
- **官方品质徽章**：展示官方机构授予的评级认证徽章（白金 Platinum / 金 Gold / 银 Silver），帮助用户快速识别高质量旅游产品。Recommended Places 官方品质评级区**独立展示**（与搜索栏解绑，数据来自 D1 同步的官方评级，卡片含公司名 / 地址 / 电话 / 评级有效期 / 品质徽章 / 图片与 Google Maps 外链）。
- **统一地点图片链路**：所有地点图片走统一的 Wikimedia（Wikivoyage → Wikipedia → Commons Geosearch）→ Mapillary 查询链，带开源协议署名展示（作者 + 许可声明，`PlaceImageAttribution`）与多级缓存（内存 / sessionStorage / Cloudflare KV），降低免费 API 额度消耗；无图地点显示占位图标。

## 4. 收藏管理 (Favorites Management)
- **收藏夹管理**：支持将心仪的地点一键收藏（每个用户一个收藏夹，需登录，未登录写操作提示登录），收藏夹支持按体验类型筛选、移除收藏与跳转地点详情；收藏状态在各地点卡片（搜索结果 / Recommended Places / 详情页）同步展示。
- **加入行程联动**：支持将收藏地点一键加入行程（模块 02，经 `RoutePlannerBridge` 跨模块桥接调用真实导入接口），实现"发现 → 收藏 → 规划"闭环。
