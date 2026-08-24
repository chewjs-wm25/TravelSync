-- 中文

> **注意**: 本文档仅用于统一整个系统的接口设计，保持简洁明了

# 模块 04 — Travel Logistics & Map Route Planning 极简对接文档

## 1. 模块职责简述
负责马来西亚范围内的起点到终点路线生成、出行方式与路线策略选择、路线保存/读取/删除、车辆信息管理，以及 Google Maps 和 Waze 导航链接导出。当前主要由前端 Zustand Store 管理状态，供模块 02 行程规划、模块 03 目的地发现和模块 01 账户登录态调用。

## 2. 依赖项 (需要其他模块/环境支持)
- **依赖接口/组件：**
  - **模块 01 用户与账户管理**：登录成功后调用 `setCurrentUser(userId)`，登出时调用 `clearCurrentUser()`；当前用户 ID 会写入新保存的路线。
  - **模块 02 行程与明细管理**：通过 `generateRoute()` 获取路线点与路线概览，并可调用保存、读取、删除和导航导出函数。
  - **模块 03 目的地发现与灵感**：将选中的地点转换为 `Stop`（`id`、`name`、`lat`、`lng`）后传入路线接口。
  - **OSRM**：`api_layer/04_Travel_Logistics_&_Map_Route_Planning/osrmApi.ts`，为驾车和步行路线提供路线几何；公共交通当前复用步行路线形状。
  - **Nominatim**：`api_layer/04_Travel_Logistics_&_Map_Route_Planning/nominatimApi.ts`，仅由 Module 04 页面用于地点联想搜索，不属于 `moduleAPI.ts` 的直接调用接口。
  - **导航链接工具**：`api_layer/04_Travel_Logistics_&_Map_Route_Planning/navigationApi.ts`，生成 Google Maps 与 Waze URL。
  - **状态 Store**：`business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore.ts`，承载路线、车辆、当前用户和保存路线状态。
- **环境与 Context 依赖：**
  - 无特殊环境变量或顶层 Provider 依赖。
  - `moduleAPI.ts` 是前端进程内调用接口，不是 Route API；路线请求依赖浏览器或运行环境可用的 `fetch`。
  - 当前保存路线和车辆由 Zustand Store 管理；`data_access_layer/04_Travel_Logistics_&_Map_Route_Planning/database.ts` 为后续数据库接入预留，当前不作为实际持久化调用入口。

## 3. 暴露项 (提供给其他模块使用)
- **导出的组件/函数/API：**
  - **公共 API 文件**：`business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/moduleAPI.ts`。
  - `generateRoute(origin, destination, vehicleType?, optimizationMode?): Promise<{ routePoints, summary, success }>` —— 生成路线；默认出行方式为 `car`，默认策略为 `fastest`。
  - `saveRoute(name): SavedRoute | null` —— 保存当前起点、终点和路线；缺少起点或终点时返回 `null`。
  - `getSavedRoutes(userId?): SavedRoute[]` —— 获取保存路线；传入 `userId` 时按用户过滤。
  - `loadSavedRoute(routeId): boolean` —— 加载指定路线到当前路线状态。
  - `deleteSavedRoute(routeId): boolean` —— 删除指定保存路线。
  - `getVehicles(): Vehicle[]`、`getDefaultVehicle(): Vehicle | null` —— 获取车辆列表或默认车辆。
  - `addVehicle(vehicle: Omit<Vehicle, "id" | "isDefault">): Vehicle` —— 新增车辆。
  - `setSelectedVehicle(vehicleId): boolean` —— 设置当前选中的车辆。
  - `setCurrentUser(userId): void`、`clearCurrentUser(): void`、`getCurrentUserId(): string | null` —— 同步账户登录态。
  - `exportToGoogleMaps(origin, destination): string`、`exportToWaze(destination): string` —— 生成第三方导航链接。
  - **类型出口**：`Stop`、`RoutePoint`、`RouteSummary`、`Vehicle`、`SavedRoute`、`VehicleType`、`OptimizationMode`。
- **回调与触发事件：**
  - `moduleAPI.ts` 不接收回调参数，也不广播跨模块事件。
  - `generateRoute()` 返回 Promise，调用方必须等待 Promise 完成后再读取 `routePoints` 和 `summary`。
  - 页面组件如需实时响应状态变化，应直接订阅 `useTripNavigationStore`；模块内的起点、终点、出行方式或优化策略变化会触发路线重新生成。
  - 当前外部路线服务失败时，Store 会退回由起点和终点组成的直接路线；调用方应检查返回值中的 `success` 和 `routePoints`。

## 4. 核心 TypeScript 类型
> 以下类型由 `business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/moduleAPI.ts` 对外 re-export。

```typescript
export type VehicleType = "car" | "walk" | "public transport";
export type OptimizationMode = "fastest" | "shortest" | "cheapest";

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RoutePoint {
  id?: string;
  name?: string;
  lat: number;
  lng: number;
}

export interface RouteSummary {
  distanceKm: number;
  timeMinutes: number;
  fuelLiters: number;
  fuelCost: number;
}

export interface Vehicle {
  id: string;
  name: string;
  fuelConsumption: number;
  fuelType: string;
  isDefault: boolean;
}

export interface SavedRoute {
  id: string;
  name: string;
  userId?: string;
  origin?: Stop;
  destination?: Stop;
  summary: RouteSummary;
  vehicleType: VehicleType;
  optimizationMode: OptimizationMode;
  routePoints: RoutePoint[];
  vehicleId?: string;
  createdAt?: string;
}

export interface GenerateRouteResult {
  routePoints: RoutePoint[];
  summary: RouteSummary;
  success: boolean;
}
```