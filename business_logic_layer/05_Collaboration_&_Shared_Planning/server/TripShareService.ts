import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import * as TripRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";
import * as ActivityLogRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ActivityLogRepo";
import { getDB } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/db";

// owned 来自 module02 的 trips 表，通过接口聚合 share 状态（方案A：派生）
// 单一真相源：02 的 trips 为 owned 清单；05 的 Trip/Collaborators 为共享状态

export interface TripShareSummary {
  tripId: string;
  tripName: string;
  startDate: string | null;
  endDate: string | null;
  region: string | null;
  ownerId: string;
  memberCount: number; // 含 Owner
  pendingInviteCount: number;
  isShared: boolean; // 派生：memberCount>1 || pending>0 || Owner行存在且显式共享
  myRole: "Owner" | "Editor" | "Viewer" | null;
}

export interface ControlCenterData {
  owned: TripShareSummary[];
  joined: TripShareSummary[];
}

function isSharedFromCounts(memberCount: number, pending: number): boolean {
  return memberCount > 0 || pending > 0;
}

/** 确保 05 的 Trip 镜像存在（针对 02 创建的 trip，首次共享时需镜像） */
async function ensureTripMirrored(tripId: string, ownerId: string): Promise<void> {
  const existing = await TripRepo.findTripById(tripId);
  if (existing) return;
  // 尝试从 02 的 trips 表复制（若存在），否则创建占位
  const db = await getDB();
  try {
    const src = await db.prepare("SELECT * FROM trips WHERE trip_id = ? LIMIT 1").bind(tripId).first<{
      trip_id: string; user_id: string; trip_name: string; start_date: string | null; end_date: string | null; image_url: string | null; trip_note: string | null;
    }>();
    if (src) {
      await TripRepo.insertTrip({
        TripID: src.trip_id,
        TripName: src.trip_name,
        StartDate: src.start_date,
        EndDate: src.end_date,
        Region: null,
        TripNote: src.trip_note ?? null,
        UserID: src.user_id,
      });
      return;
    }
  } catch {
    // trips 表不存在时忽略（全新 DB 仅有 05 Trip）
  }
  // 兜底：创建一个占位 Trip，等待后续同步
  // 若已无源数据则不抛错，交由上层处理
}

export async function getTripShareStatus(tripId: string, _viewerId: string): Promise<{ memberCount: number; pending: number; isShared: boolean; myRole: TripShareSummary["myRole"] }> {
  const [members, invites] = await Promise.all([
    CollaboratorRepo.findByTrip(tripId).catch(() => []),
    InviteRepo.findByTrip(tripId).catch(() => []),
  ]);
  const pending = invites.filter((i) => i.status === "pending").length;
  const memberCount = members.length;
  return {
    memberCount,
    pending,
    isShared: isSharedFromCounts(memberCount, pending),
    myRole: null,
  };
}

/** 聚合 Control Center 数据：owned 来自入参（02 已过滤），joined 来自 Collaborators */
export async function buildControlCenterData(
  ownedRaw: { trip_id: string; trip_name: string; start_date: string | null; end_date: string | null; user_id: string; image_url?: string | null }[],
  viewerId: string
): Promise<ControlCenterData> {
  // 预取所有 owned 的 share 状态（并行）
  const owned: TripShareSummary[] = await Promise.all(
    ownedRaw.map(async (t) => {
      const [members, invites] = await Promise.all([
        CollaboratorRepo.findByTrip(t.trip_id).catch(() => []),
        InviteRepo.findByTrip(t.trip_id).catch(() => []),
      ]);
      const pending = invites.filter((i) => i.status === "pending").length;
      const memberCount = members.length;
      const me = members.find((m) => m.user_id === viewerId);
      let myRole: TripShareSummary["myRole"] = me ? (me.role as TripShareSummary["myRole"]) : null;
      // 拥有者但尚未在 Collaborators 中：视为 Owner
      if (!myRole && t.user_id === viewerId) myRole = "Owner";
      return {
        tripId: t.trip_id,
        tripName: t.trip_name,
        startDate: t.start_date,
        endDate: t.end_date,
        region: null,
        ownerId: t.user_id,
        memberCount,
        pendingInviteCount: pending,
        isShared: isSharedFromCounts(memberCount, pending),
        myRole,
      };
    })
  );

  // joined: 在 Collaborators 中但不在 owned 中的行程（且绝不能是 viewer 本人已删除的 owned 行程）
  const joinedTripIds = await CollaboratorRepo.findTripIdsByUserId(viewerId).catch(() => [] as string[]);
  const ownedIds = new Set(owned.map((o) => o.tripId));
  const joinedOnlyIds = joinedTripIds.filter((id) => !ownedIds.has(id));

  const joined: TripShareSummary[] = (
    await Promise.all(
      joinedOnlyIds.map(async (tripId) => {
        // 优先验证 trips 是否真实存在（已在 findTripById 中校验）
        let row: TripShareSummary | null = null;
        const trip = await TripRepo.findTripById(tripId).catch(() => null);
        if (trip) {
          // 若行程的拥有者是当前 viewer，但不在 owned 列表中，说明该行程已被删除，坚决不放入 joined
          if (trip.UserID === viewerId) return null;

          const [members, invites] = await Promise.all([
            CollaboratorRepo.findByTrip(tripId).catch(() => []),
            InviteRepo.findByTrip(tripId).catch(() => []),
          ]);
          const me = members.find((m) => m.user_id === viewerId);
          row = {
            tripId: trip.TripID,
            tripName: trip.TripName,
            startDate: trip.StartDate,
            endDate: trip.EndDate,
            region: trip.Region,
            ownerId: trip.UserID,
            memberCount: members.length,
            pendingInviteCount: invites.filter((i) => i.status === "pending").length,
            isShared: true, // 能加入即 shared
            myRole: (me?.role as TripShareSummary["myRole"]) ?? "Viewer",
          };
        } else {
          // 回退查 02 trips 镜像（ Trip 尚未镜像的旧数据）
          try {
            const db = await getDB();
            const src = await db
              .prepare("SELECT * FROM trips WHERE trip_id = ? LIMIT 1")
              .bind(tripId)
              .first<{ trip_id: string; user_id: string; trip_name: string; start_date: string | null; end_date: string | null }>();
            if (src && src.user_id !== viewerId) {
              const [members, invites] = await Promise.all([
                CollaboratorRepo.findByTrip(tripId).catch(() => []),
                InviteRepo.findByTrip(tripId).catch(() => []),
              ]);
              const me = members.find((m) => m.user_id === viewerId);
              row = {
                tripId: src.trip_id,
                tripName: src.trip_name,
                startDate: src.start_date,
                endDate: src.end_date,
                region: null,
                ownerId: src.user_id,
                memberCount: members.length,
                pendingInviteCount: invites.filter((i) => i.status === "pending").length,
                isShared: true,
                myRole: (me?.role as TripShareSummary["myRole"]) ?? "Viewer",
              };
            }
          } catch {
            // ignore
          }
        }
        return row;
      })
    )
  ).filter((r): r is TripShareSummary => r !== null && r.ownerId !== viewerId);

  return { owned, joined };
}

/** 切换共享：isShared=false 时立刻踢出所有非 Owner 并过期 pending 邀请（需求 2） */
export async function setTripShareStatus(
  tripId: string,
  actorId: string,
  isShared: boolean
): Promise<{ isShared: boolean; removedMembers: number; expiredInvites: number }> {
  if (!tripId) throw new Error("tripId required");
  // 鉴权：仅 Owner 可切换（存在性检查：若 Collaborators 无 Owner 行，则以 Trip.UserID / trips.user_id 为 Owner）
  let tripOwner: string | null = null;
  const trip = await TripRepo.findTripById(tripId).catch(() => null);
  if (trip) tripOwner = trip.UserID;
  if (!tripOwner) {
    try {
      const db = await getDB();
      const src = await db.prepare("SELECT user_id FROM trips WHERE trip_id = ? LIMIT 1").bind(tripId).first<{ user_id: string }>();
      if (src) tripOwner = src.user_id;
    } catch {
      // ignore
    }
  }
  if (tripOwner && tripOwner !== actorId) {
    // 再查 Collaborators 的 Owner 行
    const members = await CollaboratorRepo.findByTrip(tripId).catch(() => []);
    const ownerMember = members.find((m) => m.role === "Owner");
    if (ownerMember && ownerMember.user_id !== actorId) throw new Error("Only Owner can change share status");
    if (!ownerMember && tripOwner !== actorId) throw new Error("Only Owner can change share status");
  }
  if (!isShared) {
    // 私有：踢出所有非 Owner
    const removedMembers = await CollaboratorRepo.deleteNonOwners(tripId, tripOwner ?? actorId);
    // 同时从协作表中删除 Owner 行以彻底将该行程标记为私有
    await CollaboratorRepo.deleteCollaborator(tripId, tripOwner ?? actorId);
    // 过期所有 pending 邀请
    const db = await getDB();
    let expiredInvites = 0;
    try {
      const res = await db
        .prepare("UPDATE Collaboration_Invitations SET status='expired' WHERE trip_id=? AND status='pending'")
        .bind(tripId)
        .run();
      expiredInvites = res.meta.changes ?? 0;
    } catch {
      expiredInvites = 0;
    }
    await ActivityLogRepo.insertActivity({ trip_id: tripId, user_id: actorId, action: "disabled sharing - removed all collaborators" }).catch(() => {});
    return { isShared: false, removedMembers, expiredInvites };
  } else {
    // 共享：确保 Trip 镜像 + Owner 行存在（幂等）
    await ensureTripMirrored(tripId, tripOwner ?? actorId);
    await CollaboratorRepo.ensureOwner(tripId, tripOwner ?? actorId);
    await ActivityLogRepo.insertActivity({ trip_id: tripId, user_id: actorId, action: "enabled sharing" }).catch(() => {});
    return { isShared: true, removedMembers: 0, expiredInvites: 0 };
  }
}
