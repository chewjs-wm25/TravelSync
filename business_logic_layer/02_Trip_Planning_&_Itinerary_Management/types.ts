/** Centralized Module 02 types — exported for cross-module consumption */

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
