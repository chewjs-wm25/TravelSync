import type {
  CollabComment,
  CollabInvite,
  CollabMember,
  ItineraryItem,
  ActivityEntry,
} from "@/api_layer/05_Collaboration_&_Shared_Planning/types";
import type { CollabRole } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/RolePermissions";
import type { CollaboratorWithAccount } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import type { InviteWithSender } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import type { ItemRow } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
import type { ActivityWithUser } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ActivityLogRepo";

type MemberRow = CollaboratorWithAccount;

type ChatRow = {
  id: number;
  user_id: string;
  username: string;
  profile_picture: string | null;
  text: string;
  created_at: string;
};

const ONLINE_THRESHOLD_MS = 5000;

/** DB 协作者 → UI CollabMember */
export function mapMember(row: MemberRow): CollabMember {
  const lastSeen = row.last_seen ? Date.parse(row.last_seen) : 0;
  const online = lastSeen > 0 && Date.now() - lastSeen < ONLINE_THRESHOLD_MS;
  return {
    id: row.user_id,
    name: row.username,
    email: row.email,
    role: row.role as CollabRole,
    avatar: row.profile_picture ?? "",
    online,
  };
}

/** DB 邀请 → UI CollabInvite（invitedAt/expiresAt 转毫秒时间戳） */
export function mapInvite(row: InviteWithSender): CollabInvite {
  return {
    id: row.invitation_id,
    token: row.Token,
    email: row.receiver_email,
    role: row.role as CollabInvite["role"],
    status: row.status,
    invitedAt: Date.parse(row.sent_at),
    expiresAt: Date.parse(row.expires_at),
    invitedBy: row.sender_name,
  };
}

/** DB 明细 → UI ItineraryItem（day 来自所在 Itinerary，itineraryId 作为 day 组键） */
export function mapItem(row: ItemRow, itineraryDayMap: Record<string, number>): ItineraryItem {
  return {
    id: row.ItemID,
    day: itineraryDayMap[row.ItineraryID] ?? 1,
    title: row.ItemName,
    note: row.ItineraryNote ?? undefined,
  };
}

/** DB 评论 → UI CollabComment */
export function mapChat(row: ChatRow, currentUserId: string): CollabComment {
  return {
    id: String(row.id),
    authorId: row.user_id,
    authorName: row.username,
    avatar: row.profile_picture ?? "",
    time: new Date(row.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    text: row.text,
    own: row.user_id === currentUserId,
  };
}

/** DB 动态 → UI ActivityEntry */
export function mapActivity(row: ActivityWithUser): ActivityEntry {
  return {
    id: String(row.id),
    actor: row.username,
    action: row.action,
    at: Date.parse(row.created_at),
  };
}