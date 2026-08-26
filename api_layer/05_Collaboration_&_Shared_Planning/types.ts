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
}

export type InviteResult = { success: boolean; message?: string; invite?: CollabInvite };

export interface BootstrapResponse {
  success: boolean;
  trip: CollabTrip;
  meUserId: string;
}