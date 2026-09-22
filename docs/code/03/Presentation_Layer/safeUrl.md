# safeUrl.ts

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/safeUrl.ts`
> - 类型：纯工具函数（无 React 依赖，无网络请求）

## 责任

`safeUrl.ts` 是模块 03 的**外部 URL 协议白名单**工具，职责单一：渲染到 `<a href>` / `<img src>` 的外部 URL 仅允许 `http:` / `https:` 协议，过滤 `javascript:`、`data:` 等异常协议——防存储型 XSS 与内容注入（安全审计修复产物，见 `docs/fix/module03-security-audit.md` §3.2）。

用法：凡渲染来自外部数据源（Geoapify / Wikimedia / Wikivoyage / Mapillary / 用户收藏 / D1 同步数据）的 URL 前，一律经 `safeHttpUrl` 过滤；非法 URL 返回空串（渲染为空链接 / 空图，不执行任何脚本）。

**调用方（7 处）**：
- `search/page.tsx`——搜索结果卡图片 `src`；
- `place/[placeId]/page.tsx`——详情大图 `src`；
- `collections/[collectionId]/page.tsx`——Hero 封面、成员卡缩略图与 "Read guide" 外链、附近卡缩略图与外链（共 5 处）；
- `curatedInspirations.tsx`——合辑封面 `src` 与活动卡外链 `href`；
- `favouriteList.tsx`——统一链路图片与旧 `thumbnailUrl` 兜底（`safeHttpUrl(images[item.id]?.url) || safeHttpUrl(item.thumbnailUrl)`）；
- `officalQualityRate.tsx`——卡片图片 `src`。

## 依赖

无（纯正则 + 字符串处理，无任何 import）。

## 导出与函数明细

### `safeHttpUrl`

- 类型：函数
- 传入：`url: string | null | undefined` —— 待渲染的外部 URL（允许空值）。
- 传出：`string` —— 通过协议白名单校验的**原样 URL**（`trim` 后）；以下情况一律返回空字符串 `""`：
  - 非 string（`null` / `undefined`）；
  - trim 后为空串；
  - 不匹配 `HTTP_URL_PATTERN`（`/^https?:\/\/\S+$/i`）——即相对路径、`javascript:`、`data:`、`file:` 等异常协议或含空白字符的 URL。
- 用处：渲染外部链接 / 图片前的统一过滤入口，调用方将返回值直接用于 `href` / `src`。

### `HTTP_URL_PATTERN`（文件内常量）

- 类型：常量（正则，未导出）
- 内容：`/^https?:\/\/\S+$/i` —— http/https 绝对 URL（不含空白）。
- 用处：`safeHttpUrl` 的协议白名单判定基准（与 `place-image/route.ts` 中 `HTTP_URL_PATTERN` 同构，后者为服务端写入缓存的纵深防御校验）。

## 边界与降级

| 场景 | 行为 |
| --- | --- |
| 非法协议（`javascript:` / `data:` / `file:`） | 返回空串，渲染为空链接 / 空图，不执行脚本 |
| 相对路径（如 `/images/a.jpg`） | 返回空串（外部数据源不应产生相对路径；内部资源不经此函数） |
| 空值 / 非 string | 返回空串 |
| URL 含空白（如 `https://x.com/a b.jpg`） | 返回空串（`\S+` 不匹配） |
| 合法 http/https | 原样返回（trim 后） |

## 关联文档

- [`module03-security-audit.md`](../fix/module03-security-audit.md)：§3.2 存储型 XSS 风险的审计与修复建议。
- [`place_image_route.md`](./api_routes/place_image_route.md)：服务端 `place-image` Route API 的 `isValidEntry` 同样校验 wikimedia url 为 http/https（纵深防御）。
