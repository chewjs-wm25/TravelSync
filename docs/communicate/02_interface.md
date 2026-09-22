# 模块 02 — 行程规划与行程明细管理 极简对接文档

## 1. 模块职责简述
行程规划与行程明细管理（Trip Planning & Itinerary Management）负责管理旅行（Trip）、行程（Itinerary，一天内计划）以及行程明细（Itinerary Item，具体地点 + 起止时间）。它允许用户通过选择目的地和地点、将地点安排进行程并为行程明细规划时间，从而创建和组织旅行。该模块是行程数据的**所有者**：向模块 04 提供行程停靠点以换取交通时间，向模块 05 提供旅行/明细数据以支持协作编辑，并接收模块 03 的地点导入。

## 2. 依赖项 (需要其他模块/环境支持)
- **依赖接口/组件：**
  - **模块 01 用户与账户管理**：经 `useAuthStore`（全站登录态 Store）读取当前登录用户 `user.id` 作为行程归属的 `userId`；登出/未登录时创建旅行需先引导登录。
  - **模块 03 目的地探索与灵感**：
    - 创建旅行时请求州/省信息 → `StateInfo`（stateId / name / lat / lon / imageUrl）。
    - 向行程添加地点时请求地点信息 → `PlaceInfo`（placeId / name / lat / lon / imageUrl）。
    - 接收模块 03 的"加入行程"调用（`importPlaces`，见 §3 暴露项）。
  - **模块 04 交通物流与地图路线规划**：请求行程停靠点之间的批量交通时间 → `getTravelTimeMatrix(stops, context)`（返回 `TravelTimeMatrixResult`），并将行程地点按 `Stop`（id / name / lat / lon）格式提供给模块 04。
- **环境与 Context 依赖：**
  - Cloudflare D1（`TEST_DB`）：存储旅行、行程及行程明细（表 `trip`、`itinerary_item`、`item_category`）。
  - 顶层会话 Store：`useAuthStore`（模块 01 提供，localStorage 持久化），非 React Provider。

## 3. 暴露项 (提供给其他模块使用)
- **导出的组件/函数/API：**

  **→ 提供给模块 04（交通时间计算）**
  - `getTripRouteData(tripId): TripRouteData` —— 组装某次旅行全部行程的停靠点数据（含 `ItineraryRouteData` / `RoutePlace`）；`RoutePlace` 与模块 04 的 `Stop` 同构（`id` = 行程明细 ID，`lat`/`lon` 扁平坐标），可直接作为 `importItineraryStops` / `getTravelTimeMatrix` 的入参。
  - 向模块 04 提供的旅行信息：旅行 ID、旅行名称、行程 ID、行程日期、地点 ID（明细 ID）、地点名称、地点位置（lat/lon）。

  **→ 提供给模块 05（协作与共享规划）**
  - `getCollaborationTripData(tripId): CollaborationTripData` —— 组装协作所需的旅行 + 行程 + 明细数据（`CollaborationTripData` / `CollaborationItinerary` / `CollaborationItem`）。
  - 向模块 05 提供的旅行信息：旅行 ID、用户 ID、旅行名称、旅行日期（startDate/endDate）、行程信息、行程明细信息（itemId / placeId / name / day / note / lat / lon）。
  - `ItineraryRepo.findByTrip(tripId)` / `ItemRepo.insertItem(item)` / `ItemRepo.updateItem(item)` / `ItemRepo.deleteItem(itemId)` —— 行程与明细的仓储能力，供模块 05 的协作 CRUD 使用（数据归属本模块，字段以 `CollaborationItem` 为准）。

  **→ 提供给模块 03（地点导入）**
  - `importPlaces(itineraryId: string, items: ImportPlaceInput[]): Promise<ImportPlacesResult>` —— 将模块 03 选中的地点批量加入指定行程日期，生成行程明细（BL 层函数）。
  - API Route：`POST /02_Trip_Planning_&_Itinerary_Management/api/itineraries/{itineraryId}/items/import` —— 同上能力的 HTTP 通道（模块 03 的 `RoutePlannerBridge.pushItem` 未来替换为调用此端点）。

- **回调与触发事件：**
  - `onItineraryChanged(tripId: string)` —— 行程/明细发生增删改后触发（模块 05 轮询 / 模块 04 重算交通时间的触发信号）。
  - 无对外回调参数；跨模块数据获取均为同步函数或 Promise 返回值。

## 4. 核心 TypeScript 类型

```ts
/** 提供给模块 04 用于计算交通时间的旅行信息 */
export interface TripRouteData {
  tripId: string;
  tripName: string;
  itineraries: ItineraryRouteData[];
}

export interface ItineraryRouteData {
  itineraryId: string;
  date: string;
  places: RoutePlace[];
}

/**
 * 行程停靠点 —— 与模块 04 的 Stop 同构（单一坐标标准 lat/lon，见 guideline §5）。
 * id 为行程明细 ID（itemId），供模块 04 的 TravelTime.fromId/toId 回映射。
 */
export interface RoutePlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

/** 提供给模块 05 用于协作的旅行信息 */
export interface CollaborationTripData {
  tripId: string;
  userId: string;
  tripName: string;
  startDate?: string | null;
  endDate?: string | null;
  itineraries: CollaborationItinerary[];
}

export interface CollaborationItinerary {
  itineraryId: string;
  date: string;
  title: string;
  items: CollaborationItem[];
}

/** 行程明细（数据所有者为本模块；模块 05 的 ItineraryItem 与本结构字段对齐） */
export interface CollaborationItem {
  itemId: string;
  placeId?: string | null;
  name: string;
  day?: number;             // 第几天（可选；可由所属 CollaborationItinerary.date 派生）
  note?: string;            // 备注（模块 05 协作编辑）
  lat?: number | null;      // 扁平坐标标准（guideline §5）
  lon?: number | null;
}

/** 从模块 01 请求的用户信息（经 useAuthStore.user.id 获取） */
export interface UserInfo {
  userId: string;
}

/** 从模块 03 请求的州/省信息（字段与模块 03 输出对齐） */
export interface StateInfo {
  stateId: string;
  name: string;
  lat: number;
  lon: number;
  imageUrl: string;
}

/** 从模块 03 请求的地点信息（字段与模块 03 的 PoiItem/PlaceDetail 核心字段对齐） */
export interface PlaceInfo {
  placeId: string;
  name: string;
  lat: number;
  lon: number;
  imageUrl: string;
}

/** 接收模块 03 地点导入的输入条目 */
export interface ImportPlaceInput {
  placeId?: string | null;
  name: string;
  lat?: number | null;
  lon?: number | null;
}

export interface ImportPlacesResult {
  success: boolean;
  importedCount: number;
}

/**
 * 从模块 04 请求的交通时间信息 —— 与模块 04 的 `getTravelTimeMatrix` 返回类型一致，
 * 单一来源为模块 04 接口文档 §4（本模块不另立结构）：
 *
 *   interface TravelTimeMatrixResult {
 *     tripId?: string;           // context 回显
 *     itineraryId?: string;      // context 回显
 *     travelTimes: TravelTime[]; // { fromId, toId, timeMinutes }，fromId/toId = RoutePlace.id
 *   }
 */
```
