# placeImageAttribution.tsx

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/placeImageAttribution.tsx`
> - 类型：客户端组件（`"use client"`，图片署名展示组件）

## 责任

`placeImageAttribution.tsx` 是模块 03 的图片署名展示组件，职责单一：展示地点图片的作者与许可声明（开源协议合规——如 CC BY-SA 4.0 的署名要求：保留原作者 + 许可名称，许可名可点击打开许可链接）。组件本身不发起任何数据请求，仅接收 BL 层 `getPlaceImage` 返回的 `attribution` 数据做纯展示，是所有图片展示场景共用的署名单元。

使用场景（3 处调用方）：
| 调用方 | 展示位置 | 数据来源 |
| --- | --- | --- |
| `officalQualityRate.tsx` | Recommended Places 卡片图片底部 | `usePlaceImages(visiblePois)` 的 `attribution` |
| `search/page.tsx` | 搜索结果卡图片底部 | `usePlaceImages(places)` 的 `attribution` |
| `place/[placeId]/page.tsx` | 地点详情大图底部 | `usePlaceImages([place])` 的 `attribution` |

关键设计：
- **使用方式**：叠加在图片容器底部（`absolute` 定位，调用方保证容器 `position: relative` 且有足够内边距）；
- **空值短路**：`artist` 与 `licenseName` 均无有效值时返回 `null` 不渲染（调用方无需额外判断）；
- **许可链接防冒泡**：许可名若带链接则渲染为 `<a target="_blank">`，点击时 `e.preventDefault()` + `e.stopPropagation()` 后手动 `window.open(licenseUrl, "_blank", "noopener,noreferrer")`——因为卡片本身可能是 `<a>`/`<Link>`（如搜索结果整卡、Recommended Places 整卡），避免误触卡片跳转；
- **可读性**：底部渐变压暗遮罩（`bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent`）+ 白色半透明文字（`text-white/90`、`text-[10px] leading-tight`），两行截断（`line-clamp-2`）；
- 内部对 `artist` / `licenseName` / `licenseUrl` 做 `.trim()` 处理，空串视为无效。

## 与 BL 层 `getPlaceImage` 的协作

署名数据来源于 `discoveryService.getPlaceImage` 的返回结果 `PlaceImageResult`，其结构为 `{ url: string; attribution?: PlaceImageAttribution }`。BL 层图片查询链（Wikivoyage → Wikipedia → Commons Geosearch → Mapillary）在返回图片 URL 的同时附带开源协议署名信息（原作者 + 许可声明，如 `CC BY-SA 4.0`），本组件负责将其可视化。**协议合规链路**：查询链只挑选带可署名许可的图片来源 → 返回 attribution → 本组件渲染 → 任何展示该图片的卡片都必须在图片上叠加本组件。

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| `attribution` 为 `undefined` / 空对象 | 返回 `null`，不渲染署名条 |
| `artist` 与 `licenseName` 均为空串/空白 | 同上（`.trim()` 后判定） |
| `licenseUrl` 缺失 | 许可名渲染为纯文本 `<span>`（不可点击） |
| 许可链接点击 | 阻止冒泡（避免触发外层卡片跳转）+ `window.open` 新标签页 |
| 卡片本身是 `<a>`/`<Link>` | 由调用方保证容器 `position: relative`，署名条 `absolute` 定位不破坏卡片布局 |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types`（仅类型） | 类型 `PlaceImageAttribution`（与组件同名，仅记录 import，未打开源文件） |
| 外部库：无 | — |

## 导出与函数明细

### `PlaceImageAttribution`（默认导出）
- 类型：React 组件
- 传入：props `{ attribution?: PlaceImageAttribution }` —— 图片署名信息对象（可选）：
  - `artist?: string` —— 作者名；
  - `licenseName?: string` —— 许可名称（如 `CC BY-SA 4.0`）；
  - `licenseUrl?: string` —— 许可链接（可点击打开许可原文）。
- 传出：
  - `artist` 与 `licenseName` 均无有效值时返回 `null`（不渲染任何 DOM）；
  - 否则渲染 `absolute` 定位的底部署名条 `<div>`：`© {artist}`（有作者时）→ ` · ` 分隔符（作者与许可名同时存在时）→ 许可名（`licenseUrl` 有则渲染为可点击 `<a>`，否则纯文本 `<span>`）。
- 用处：
  - 各图片展示场景叠加在图片底部，满足 CC BY-SA 等开源协议对「保留原作者 + 许可声明」的要求；
  - 许可链接点击：`e.preventDefault()` + `e.stopPropagation()` 阻止冒泡触发外层卡片（`<a>`/`<Link>`）跳转，再 `window.open(licenseUrl, "_blank", "noopener,noreferrer")` 新标签页打开；
  - 链接样式：`underline decoration-white/50 underline-offset-1 hover:text-white`，在深色渐变底上保持可读。

## 渲染细节

署名条 DOM 结构（`artist` 与 `licenseName` 均存在且 `licenseUrl` 存在时）：
```
<div class="absolute right-0 bottom-0 left-0 bg-gradient-to-t ... px-2 pt-5 pb-1 text-[10px] leading-tight text-white/90">
  <p class="line-clamp-2">
    <span>© {artist}</span>
    <span> · </span>
    <a href={licenseUrl} target="_blank" rel="noopener noreferrer" class="underline ..."> {licenseName} </a>
  </p>
</div>
```
分支说明：
| 条件 | 渲染结果 |
| --- | --- |
| `artist` 空 且 `licenseName` 空 | `null`（整组件不渲染） |
| 仅 `artist` 有值 | `© {artist}` |
| 仅 `licenseName` 有值 | 许可名（有链接则 `<a>`，否则 `<span>`） |
| 两者均有值 | `© {artist} · {许可名}`（`·` 为分隔符） |
