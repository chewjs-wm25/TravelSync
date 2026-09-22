> **注意**: 文档使用单一语言填写(基于用户所使用的语言)

-- 中文

> **注意**: 本文档仅用于统一整个系统的接口设计，保持简洁明了
# [模块名称] 极简对接文档

## 1. 模块职责简述
> 简要说明该模块的业务功能与负责的 UI/逻辑范围（1-2句）。

## 2. 依赖项 (需要其他模块/环境支持)
- **依赖接口/组件：** 列出该模块调用的其他模块函数、组件或 API 路由。
- **环境与 Context 依赖：** 说明是否依赖特定的环境变量（如 `.env`）或顶层 Provider（如 AuthContext）。

## 3. 暴露项 (提供给其他模块使用)
- **导出的组件/函数/API：** 列出供外部调用的组件名称、工具函数或开放的 API Route。
- **回调与触发事件：** 列出该模块传递给外部的回调函数及其触发时机（如 `onSuccess: (data) => void`）。

## 4. 核心 TypeScript 类型
- **数据结构定义：** 贴出该模块对外交互使用的核心 `interface` 或 `type` 定义。

## 5. 系统级统一约定（所有模块必须遵守）
> 以下约定用于消除跨模块接口设计不一致；任何模块的新增接口都必须遵循，既有接口如与本约定冲突应在本轮统一工作中对齐。

- **地理坐标**：统一使用扁平字段 `lat: number`（纬度）与 `lon: number`（经度）。禁止 `lng` 缩写，禁止嵌套对象（如 `{ latitude, longitude }`）。
  - 依据：模块 03 的 `lat`/`lon` 与第三方地图 API（Nominatim、Geoapify、Wikivoyage 等）响应字段名一致，受外部约束不可更改，故作为全系统坐标标准；模块 04 的 `lng` 与模块 02 的嵌套写法均向其对齐。
- **标识符命名**：地点 ID 统一 `placeId`；行程 ID 统一 `tripId`；行程明细 ID 统一 `itemId`；跨模块传递路线停靠点统一使用模块 04 的 `Stop`（`id` / `name` / `lat` / `lon`）。
- **Route API 路径**：统一为 `/0N_<Module_Name>/api/<resource>`（如 `/03_Destination_Discovery_&_Inspiration/api/favourites`）。禁止不带模块前缀的裸路径（如 `/api/collab/...`），模块内资源再按 REST 语义追加子路径。
- **结果标志**：函数 / API 返回的成功标志统一为 `success: boolean`（成功为 `true`），失败信息使用 `message?: string`。禁止 `ok` 等其他命名。
- **依赖方向**：依赖项中只写"本模块调用其他模块"的内容；本模块被其他模块调用的能力一律写入 §3 暴露项，避免出现"依赖自己的函数"这类方向颠倒的描述。

-- English

> **Note**: This document is intended solely for unifying the interface design of the entire system. Please keep it concise and clear.

# [Module Name] Lightweight Integration Guide

## 1. Module Overview
> Briefly describe the business functionality and UI/logic scope of this module (1–2 sentences).

## 2. Dependencies (Required from Other Modules/Environment)
- **Dependent Interfaces/Components:** List functions, components, or API routes called from other modules.
- **Environment & Context Dependencies:** Specify any required environment variables (e.g., `.env`) or top-level Providers (e.g., AuthContext).

## 3. Exports (Provided to Other Modules)
- **Exported Components/Functions/APIs:** List components, utility functions, or API routes provided for external use.
- **Callbacks & Events:** List callback functions passed to external modules and their trigger conditions (e.g., `onSuccess: (data) => void`).

## 4. Core TypeScript Types
- **Data Structure Definitions:** Paste the core `interface` or `type` definitions used for external interaction.

## 5. System-wide Conventions (Mandatory for Every Module)
> The following conventions eliminate cross-module interface inconsistencies; every new interface must follow them, and existing conflicting interfaces must be aligned during this unification round.

- **Geo-coordinates**: Always use flat fields `lat: number` (latitude) and `lon: number` (longitude). Do not use `lng`, and do not use nested objects such as `{ latitude, longitude }`.
  - Rationale: Module 03's `lat`/`lon` matches the response field names of third-party map APIs (Nominatim, Geoapify, Wikivoyage, etc.) and is externally constrained, so it is the system-wide coordinate standard; Module 04's `lng` and Module 02's nested form align to it.
- **Identifier naming**: Place ID is always `placeId`; trip ID is always `tripId`; itinerary item ID is always `itemId`; cross-module route waypoints use Module 04's `Stop` (`id` / `name` / `lat` / `lon`).
- **Route API paths**: Always `/0N_<Module_Name>/api/<resource>` (e.g. `/03_Destination_Discovery_&_Inspiration/api/favourites`). Bare paths without a module prefix (e.g. `/api/collab/...`) are forbidden.
- **Result flag**: The success flag of functions/APIs is uniformly `success: boolean` (`true` on success); failure messages use `message?: string`. Do not use `ok` or other names.
- **Dependency direction**: In §2 Dependencies, list only what this module calls from other modules; capabilities that other modules call from this module must be listed in §3 Exports, avoiding reversed descriptions (e.g. "depends on its own functions").