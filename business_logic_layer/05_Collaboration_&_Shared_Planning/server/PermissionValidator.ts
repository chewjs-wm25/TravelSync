import type { CollabRole } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/RolePermissions";
import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import * as TripRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";

/**
 * 服务端权限校验（单层，模块 05 范围）：
 * 校验某用户在某行程的角色是否具备某权限。
 */
export type Permission =
  | "invite"
  | "cancelInvite"
  | "changeRole"
  | "removeMember"
  | "editItinerary"
  | "comment";

const PERMISSIONS: Record<CollabRole, Permission[]> = {
  Owner: ["invite", "cancelInvite", "changeRole", "removeMember", "editItinerary", "comment"],
  Editor: ["editItinerary", "comment"],
  Viewer: [],
};

export function canRole(role: CollabRole, permission: Permission): boolean {
  return (PERMISSIONS[role] ?? []).includes(permission);
}

/** 抛错式校验：失败抛出带 message 的 Error */
export async function requirePermission(
  tripId: string,
  userId: string,
  permission: Permission
): Promise<void> {
  const members = await CollaboratorRepo.findByTrip(tripId).catch(() => []);
  let me = members.find((m) => m.user_id === userId);

  if (!me) {
    // 检查是否是行程的创建者 (Trip.UserID 或 trips.user_id)
    const trip = await TripRepo.findTripById(tripId).catch(() => null);
    if (trip && trip.UserID === userId) {
      await CollaboratorRepo.ensureOwner(tripId, userId).catch(() => {});
      me = {
        id: "owner-auto",
        trip_id: tripId,
        user_id: userId,
        role: "Owner",
        username: "Owner",
      } as unknown as (typeof members)[0];
    } else {
      try {
        const { getDB } = await import("@/data_access_layer/05_Collaboration_&_Shared_Planning/db");
        const db = await getDB();
        const src = await db
          .prepare("SELECT user_id FROM trips WHERE trip_id = ? LIMIT 1")
          .bind(tripId)
          .first<{ user_id: string }>();
        if (src && src.user_id === userId) {
          await CollaboratorRepo.ensureOwner(tripId, userId).catch(() => {});
          me = {
            id: "owner-auto",
            trip_id: tripId,
            user_id: userId,
            role: "Owner",
            username: "Owner",
          } as unknown as (typeof members)[0];
        }
      } catch {
        // ignore
      }
    }
  }

  if (!me) throw new Error("You are not a member of this trip.");
  if (!canRole(me.role, permission)) {
    throw new Error(`Role ${me.role} does not have permission: ${permission}`);
  }
}

/** 只读查询，返回当前角色（非成员返回 null） */
export async function getRole(
  tripId: string,
  userId: string
): Promise<CollabRole | null> {
  const members = await CollaboratorRepo.findByTrip(tripId).catch(() => []);
  const me = members.find((m) => m.user_id === userId);
  if (me) return me.role as CollabRole;

  // 检查是否是拥有者
  const trip = await TripRepo.findTripById(tripId).catch(() => null);
  if (trip && trip.UserID === userId) return "Owner";
  try {
    const { getDB } = await import("@/data_access_layer/05_Collaboration_&_Shared_Planning/db");
    const db = await getDB();
    const src = await db
      .prepare("SELECT user_id FROM trips WHERE trip_id = ? LIMIT 1")
      .bind(tripId)
      .first<{ user_id: string }>();
    if (src && src.user_id === userId) return "Owner";
  } catch {
    // ignore
  }
  return null;
}