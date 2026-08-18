import { create } from "zustand";
import { collabApi } from "@/api_layer/05_Collaboration_&_Shared_Planning/collab";
import type {
  CollabRole,
  InviteRole,
  InviteStatus,
  CollabMember,
  CollabInvite,
  ItineraryItem,
  CollabComment,
  ActivityEntry,
  CollabTrip,
  InviteResult,
} from "@/api_layer/05_Collaboration_&_Shared_Planning/types";

export type {
  CollabRole,
  InviteRole,
  InviteStatus,
  CollabMember,
  CollabInvite,
  ItineraryItem,
  CollabComment,
  ActivityEntry,
  CollabTrip,
  InviteResult,
};

interface CollabState {
  currentUserId: string;
  activeTripId: string;
  trips: CollabTrip[];
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  setCurrentUser: (id: string) => void;
  setActiveTrip: (id: string) => void;

  inviteCollaborator: (email: string, role: InviteRole) => Promise<InviteResult>;
  cancelInvite: (inviteId: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  rejectInvite: (inviteId: string) => Promise<void>;
  expirePendingInvites: () => Promise<void>;

  changeRole: (memberId: string, role: Exclude<CollabRole, "Owner">) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  leaveTrip: () => Promise<void>;

  addItem: (day: number, title: string, note?: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  addComment: (text: string) => Promise<void>;
}

/**
 * 模块 05 客户端状态（Business Logic Layer）：数据源为 D1（经 collabApi），
 * store 仅作内存缓存与业务编排。demo 会话：currentUserId 决定"当前用户"，
 * 通过 x-demo-user-id 头传给后端。
 */
export const useCollabStore = create<CollabState>()((set, get) => ({
  currentUserId: "m_marcus",
  activeTripId: "trip_langkawi",
  trips: [],
  loading: true,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const data = await collabApi.bootstrap(get().currentUserId);
      const trips = [data.trip];
      // 若 activeTripId 在已加载行程中不存在，退回第一个行程，避免 UI 拿不到行程。
      const activeTripId = trips.some((t) => t.id === get().activeTripId)
        ? get().activeTripId
        : (trips[0]?.id ?? "");
      set({ trips, activeTripId, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load collaboration data.",
      });
    }
  },

  setCurrentUser: (id) => {
    set({ currentUserId: id });
    void get().load();
  },

  setActiveTrip: (id) => set({ activeTripId: id }),

  inviteCollaborator: async (email, role) => {
    const res = await collabApi.invite(get().currentUserId, email, role);
    if (res.ok && res.invite) {
      await get().load();
      return { ok: true, invite: res.invite };
    }
    return res;
  },

  cancelInvite: async (inviteId) => {
    await collabApi.cancelInvite(get().currentUserId, inviteId);
    await get().load();
  },

  acceptInvite: async (inviteId) => {
    await collabApi.updateInvite(inviteId, "accepted", get().currentUserId);
    await get().load();
  },

  rejectInvite: async (inviteId) => {
    await collabApi.updateInvite(inviteId, "rejected", get().currentUserId);
    await get().load();
  },

  expirePendingInvites: async () => {
    await collabApi.expireInvites();
    await get().load();
  },

  changeRole: async (memberId, role) => {
    await collabApi.changeRole(get().currentUserId, memberId, role);
    await get().load();
  },

  removeMember: async (memberId) => {
    await collabApi.removeMember(get().currentUserId, memberId);
    await get().load();
  },

  leaveTrip: async () => {
    await collabApi.leaveTrip(get().currentUserId);
    await get().load();
  },

  addItem: async (day, title, note) => {
    await collabApi.addItem(get().currentUserId, day, title, note);
    await get().load();
  },

  removeItem: async (itemId) => {
    await collabApi.removeItem(get().currentUserId, itemId);
    await get().load();
  },

  addComment: async (text) => {
    await collabApi.addComment(get().currentUserId, text);
    await get().load();
  },
}));