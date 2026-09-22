# layout.tsx（Module 03 布局）

> - 所属模块：03 Destination Discovery & Inspiration
> - 所属 Layer：Presentation Layer
> - 源文件：`app/03_Destination_Discovery_&_Inspiration/layout.tsx`
> - 类型：客户端布局组件（`"use client"`，模块路由段共享壳）

## 责任

`layout.tsx` 是模块 03 路由段（`/03_Destination_Discovery_&_Inspiration/**`）的**布局壳**：在渲染子页面内容的同时，挂载**全局收藏夹浮层**（`FavouriteList`：右下角悬浮按钮 + 右侧抽屉），使主页 / 搜索结果页（`search/`）/ 地点详情页（`place/[placeId]`）/ 合辑详情页（`collections/[collectionId]`）**任一页面都可随时打开收藏夹**。

布局持有抽屉开关状态 `isDrawerOpen`（`useState`）并通过受控 props 注入 `FavouriteList`——由于 Next.js 布局在路由切换时保持挂载，抽屉可在跨页面导航期间保持打开状态（从抽屉点条目跳详情页时组件会主动关闭抽屉，见 favouriteList.md）。

## 与收藏刷新的关系

收藏数据一致性由 Presentation hooks 层保证：任何页面上的收藏写操作（Recommended Places / 搜索结果卡片 / 详情页收藏按钮 / 收藏夹内移除）成功后，`useFavorites` 广播 `module03:favourites-changed` 事件；本布局内 `FavouriteList` 的 `useFavorites` 实例监听事件后自动重新拉取 D1 数据。因此**从任意页面添加/移除收藏后，收藏夹列表与悬浮按钮计数即时刷新**，无需手动刷新或重进页面（详见 hooks.md `useFavorites`）。

## 渲染结构

```
DestinationDiscoveryLayout（layout.tsx，路由段共享）
  ├─ {children}                         ← 子页面内容（主页 / search / place / collections）
  └─ <FavouriteList                     ← 全局收藏夹浮层（悬浮按钮 + 抽屉 + 背景遮罩）
       isDrawerOpen={isDrawerOpen}
       setIsDrawerOpen={setIsDrawerOpen}
     />
```

## 状态清单

| 状态 | 说明 |
| --- | --- |
| `isDrawerOpen` | 收藏夹抽屉开关（布局级共享；路由切换时保持，可跨页面打开/关闭） |

## 边界与说明

| 场景 | 行为 |
| --- | --- |
| 路由段范围 | 仅作用于 `/03_Destination_Discovery_&_Inspiration/**`（含 API 路由目录不影响——Route Handler 不经布局渲染）；根布局与其它模块页面不受影响 |
| 抽屉跨页面保持 | 布局挂载期间（模块内导航）抽屉状态保持；跳转地点详情页前由组件主动关闭（见 favouriteList.md） |
| 后台数据同步 | 任一页面收藏变更后，浮层列表/计数经事件广播自动刷新（不依赖页面重挂载） |
| 收藏加载失败 | hooks 保持空列表，浮层显示空态文案（页面不崩） |

## 依赖

| 依赖文件 | 用途 |
| --- | --- |
| `./favouriteList` | 全局收藏夹浮层组件（抽屉开关受控于本布局） |
| 外部库：`react`（`useState`） | 抽屉开关状态 |
