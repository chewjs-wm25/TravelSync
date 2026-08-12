import type { CollabRole } from "@/src/lib/client/collab/RolePermissions";
import * as CollaboratorRepo from "@/src/lib/db/repositories/collab/CollaboratorRepo";

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
  const members = await CollaboratorRepo.findByTrip(tripId);
  const me = members.find((m) => m.user_id === userId);
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
  const members = await CollaboratorRepo.findByTrip(tripId);
  return members.find((m) => m.user_id === userId)?.role ?? null;
}