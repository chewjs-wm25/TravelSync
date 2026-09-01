/** 领域共享类型：模块 05。作为客户端 ↔ 后端 API 的契约，供 API Layer 与 Business Logic Layer 复用。 */

export type CollabRole = "Owner" | "Editor" | "Viewer";
export type InviteRole = "Editor" | "Viewer";
export type InviteStatus = "pending" | "accepted" | "rejected" | "expired";

export interface CollabMember {
  id: string;
  name: string;
  email: string;
  role: CollabRole;
  avatar: string;
  online: boolean;
}

export interface CollabInvite {
  id: string;
  token: string;
  email: string;
  role: InviteRole;
  status: InviteStatus;
  invitedAt: number;
  expiresAt: number;
  invitedBy: string;
}

export interface ItineraryItem {
  itemId: string;
  placeId?: string | null;
  name: string;
  day: number;
  note?: string;
  lat?: number | null;
  lon?: number | null;
}

export interface CollabComment {
  id: string;
  authorId: string;
  authorName: string;
  avatar: string;
  time: string;
  text: string;
  own: boolean;
}

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  at: number;
}

export interface TripLiker {
  id: string;
  name: string;
  avatar: string;
}

export interface TripLikeInfo {
  count: number;
  likedByMe: boolean;
  likers: TripLiker[];
}

export interface CollabTrip {
  tripId: string;
  tripName: string;
  startDate?: string | null;
  endDate?: string | null;
  region?: string;
  members: CollabMember[];
  invites: CollabInvite[];
  items: ItineraryItem[];
  comments: CollabComment[];
  activity: ActivityEntry[];
  likes?: TripLikeInfo;
}

export type InviteResult = { success: boolean; message?: string; invite?: CollabInvite };

export interface BootstrapResponse {
  success: boolean;
  trip: CollabTrip;
  meUserId: string;
}

/** 导出行程的单项明细 */
export interface ExportedTripItem {
  itemId?: string;
  name: string;
  type?: string;
  destination?: string | null;
  note?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  position?: number;
  lat?: number | null;
  lon?: number | null;
  imageUrl?: string | null;
  referenceId?: string | null;
}

/** 导出行程的单日日程 */
export interface ExportedItineraryDay {
  itineraryId?: string;
  title: string;
  date: string;
  note?: string | null;
  items: ExportedTripItem[];
}

/** 标准 TravelSync 行程导出 JSON 格式 */
export interface ExportedTripPlan {
  version: "1.0";
  app: "TravelSync";
  exportedAt: string;
  trip: {
    tripId?: string;
    tripName: string;
    region?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    tripNote?: string | null;
    imageUrl?: string | null;
    itineraries: ExportedItineraryDay[];
  };
}

/** 导入行程请求体 */
export interface ImportTripPayload {
  tripName: string;
  region?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tripNote?: string | null;
  imageUrl?: string | null;
  isShared?: boolean;
  itineraries: {
    title: string;
    date: string;
    note?: string | null;
    items: ExportedTripItem[];
  }[];
}

/** 导入行程响应体 */
export interface ImportTripResult {
  success: boolean;
  tripId?: string;
  tripName?: string;
  message?: string;
}