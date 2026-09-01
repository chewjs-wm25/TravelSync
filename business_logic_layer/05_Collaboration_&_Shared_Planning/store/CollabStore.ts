import { create } from "zustand";
import { collabApi } from "@/api_layer/05_Collaboration_&_Shared_Planning/collab";
import { buildFallbackTrip } from "./fallbackTrip";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";
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
import type { TripShareSummary } from "../server/TripShareService";

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
  TripShareSummary,
};

const POLL_INTERVAL_MS = 1000;

/** 从 module 01 登录状态获取当前用户 ID，未登录时返回空串 */
function getAuthUserId(): string {
  const auth = useAuthStore.getState();
  return auth.user?.id ?? "";
}

interface ControlCenterState {
  owned: TripShareSummary[];
  joined: TripShareSummary[];
}

interface CollabState {
  currentUserId: string;
  activeTripId: string;
  trips: CollabTrip[];
  loading: boolean;
  error: string | null;

  // Control Center
  controlCenter: ControlCenterState | null;
  controlLoading: boolean;
  controlError: string | null;

  load: (tripId?: string) => Promise<void>;
  loadControlCenter: () => Promise<void>;
  setCurrentUser: (id: string) => void;
  setActiveTrip: (id: string) => void;
  toggleShare: (tripId: string, isShared: boolean) => Promise<{ success: boolean; message?: string }>;

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
  toggleLike: (tripId?: string) => Promise<void>;
  importTripPlan: (payload: import("@/api_layer/05_Collaboration_&_Shared_Planning/types").ImportTripPayload) => Promise<import("@/api_layer/05_Collaboration_&_Shared_Planning/types").ImportTripResult>;
}

/**
 * 模块 05 客户端状态（Business Logic Layer）：数据源为 D1（经 collabApi），
 * store 仅作内存缓存与业务编排。
 *
 * 同步策略：乐观更新 + 轮询。
 * - 写操作后立即本地更新 UI（乐观更新）
 * - 后台每 1 秒轮询 bootstrap 获取最新状态（带 activeTripId）
 */
export const useCollabStore = create<CollabState>()((set, get) => {
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let isWriting = false;

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      if (isWriting) return;
      void silentRefresh();
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  /** 静默刷新：不显示 loading 状态，不显示错误，带 activeTripId */
  const silentRefresh = async () => {
    try {
      const { currentUserId, activeTripId } = get();
      if (!activeTripId) return;
      const data = await collabApi.bootstrap(currentUserId, activeTripId);
      const trip = data.trip;
      if (!trip) return;

      set((state) => {
        const currentTrip = state.trips[0];
        if (!currentTrip) {
          return { trips: [trip] };
        }

        const memberMap = new Map<string, CollabMember>();
        for (const m of trip.members) memberMap.set(m.id, m);
        for (const m of currentTrip.members) {
          if (!memberMap.has(m.id)) memberMap.set(m.id, m);
        }

        const inviteMap = new Map<string, CollabInvite>();
        for (const i of trip.invites) inviteMap.set(i.id, i);
        for (const i of currentTrip.invites) {
          if (!inviteMap.has(i.id)) inviteMap.set(i.id, i);
        }

        const mergedItems = trip.items;

        const commentMap = new Map<string, CollabComment>();
        for (const c of trip.comments) commentMap.set(c.id, c);
        for (const c of currentTrip.comments) {
          if (c.id.startsWith("temp-")) {
            const hasReal = Array.from(commentMap.values()).some(
              (sc) => sc.text === c.text && sc.authorId === c.authorId,
            );
            if (!hasReal) commentMap.set(c.id, c);
          } else if (!commentMap.has(c.id)) {
            commentMap.set(c.id, c);
          }
        }

        const mergedTrip: CollabTrip = {
          ...trip,
          members: Array.from(memberMap.values()),
          invites: Array.from(inviteMap.values()),
          items: mergedItems,
          comments: Array.from(commentMap.values()),
          activity: trip.activity.length > 0 ? trip.activity : currentTrip.activity,
          likes: trip.likes ?? currentTrip.likes,
        };

        return { trips: [mergedTrip] };
      });
    } catch {
      // 静默失败
    }
  };

  return {
    currentUserId: getAuthUserId(),
    activeTripId: "",
    trips: [],
    loading: true,
    error: null,
    controlCenter: null,
    controlLoading: true,
    controlError: null,

    load: async (tripId?: string) => {
      const effectiveTripId = tripId ?? get().activeTripId ?? "";
      const uid = getAuthUserId();
      // 若既无指定也无 active，则仍走旧逻辑：尝试加载默认（bootstrap 无 tripId 回退到 trip_langkawi）
      set({ loading: true, error: null, currentUserId: uid });
      try {
        const data = await collabApi.bootstrap(uid, effectiveTripId || undefined);
        const trips = [data.trip];
        const nextActive = effectiveTripId || data.trip.tripId;
        set({ trips, activeTripId: nextActive, loading: false });
        startPolling();
      } catch {
        set({
          loading: false,
          trips: [buildFallbackTrip(uid)],
          activeTripId: effectiveTripId || "trip_langkawi",
          error:
            "演示模式：本地数据库无数据，已加载内置演示数据（写入功能不可用）。运行 npm run dev 会自动初始化真实数据库。",
        });
      }
    },

    loadControlCenter: async () => {
      const uid = getAuthUserId();
      if (!uid) {
        set({ controlCenter: { owned: [], joined: [] }, controlLoading: false, controlError: null });
        return;
      }
      set({ controlLoading: true, controlError: null });
      try {
        const data = await collabApi.listControlCenter(uid);
        if ((data as { success: boolean }).success === false) throw new Error((data as { message?: string }).message ?? "Failed");
        set({ controlCenter: { owned: (data as { owned: TripShareSummary[] }).owned ?? [], joined: (data as { joined: TripShareSummary[] }).joined ?? [] }, controlLoading: false });
      } catch (e) {
        set({ controlLoading: false, controlError: e instanceof Error ? e.message : "Failed to load trips", controlCenter: { owned: [], joined: [] } });
      }
    },

    setCurrentUser: (id) => {
      stopPolling();
      set((state) => ({ currentUserId: id, activeTripId: state.activeTripId }));
      const active = get().activeTripId;
      if (active) {
        void get().load(active);
      } else {
        void get().load();
      }
      void get().loadControlCenter();
    },

    setActiveTrip: (id) => {
      stopPolling();
      set({ activeTripId: id });
      void get().load(id);
    },

    toggleShare: async (tripId, isShared) => {
      isWriting = true;
      try {
        const res = await collabApi.toggleShare(get().currentUserId, tripId, isShared);
        if (!res.success) return { success: false, message: res.message ?? "Failed" };
        // 成功后刷新 Control Center（踢出立即反映）
        await get().loadControlCenter();
        return { success: true };
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Failed" };
      } finally {
        isWriting = false;
      }
    },

    inviteCollaborator: async (email, role) => {
      isWriting = true;
      try {
        const tripId = get().activeTripId || get().trips[0]?.tripId;
        const res = await collabApi.invite(get().currentUserId, email, role, tripId);
        if (res.success && res.invite) {
          const { trips } = get();
          if (trips.length > 0) {
            set({
              trips: [{ ...trips[0], invites: [...trips[0].invites, res.invite] }],
            });
          }
          // 邀请后刷新 control center 的 pending 数
          void get().loadControlCenter();
        }
        return res;
      } finally {
        isWriting = false;
      }
    },

    cancelInvite: async (inviteId) => {
      isWriting = true;
      try {
        const tripId = get().activeTripId || get().trips[0]?.tripId;
        await collabApi.cancelInvite(get().currentUserId, inviteId, tripId);
        const { trips } = get();
        if (trips.length > 0) {
          set({
            trips: [
              {
                ...trips[0],
                invites: trips[0].invites.filter((i) => i.id !== inviteId),
              },
            ],
          });
        }
        void get().loadControlCenter();
      } finally {
        isWriting = false;
      }
    },

    acceptInvite: async (inviteId) => {
      isWriting = true;
      try {
        const tripId = get().activeTripId || get().trips[0]?.tripId;
        await collabApi.updateInvite(inviteId, "accepted", get().currentUserId, tripId);
        await silentRefresh();
        void get().loadControlCenter();
      } finally {
        isWriting = false;
      }
    },

    rejectInvite: async (inviteId) => {
      isWriting = true;
      try {
        const tripId = get().activeTripId || get().trips[0]?.tripId;
        await collabApi.updateInvite(inviteId, "rejected", get().currentUserId, tripId);
        const { trips } = get();
        if (trips.length > 0) {
          set({
            trips: [
              {
                ...trips[0],
                invites: trips[0].invites.filter((i) => i.id !== inviteId),
              },
            ],
          });
        }
        void get().loadControlCenter();
      } finally {
        isWriting = false;
      }
    },

    expirePendingInvites: async () => {
      isWriting = true;
      try {
        await collabApi.expireInvites();
        const { trips } = get();
        if (trips.length > 0) {
          set({
            trips: [
              {
                ...trips[0],
                invites: trips[0].invites.filter((i) => i.status !== "pending"),
              },
            ],
          });
        }
        void get().loadControlCenter();
      } finally {
        isWriting = false;
      }
    },

    changeRole: async (memberId, role) => {
      isWriting = true;
      try {
        const tripId = get().activeTripId || get().trips[0]?.tripId;
        await collabApi.changeRole(get().currentUserId, memberId, role, tripId);
        const { trips } = get();
        if (trips.length > 0) {
          set({
            trips: [
              {
                ...trips[0],
                members: trips[0].members.map((m) =>
                  m.id === memberId ? { ...m, role } : m
                ),
              },
            ],
          });
        }
      } finally {
        isWriting = false;
      }
    },

    removeMember: async (memberId) => {
      isWriting = true;
      try {
        const tripId = get().activeTripId || get().trips[0]?.tripId;
        await collabApi.removeMember(get().currentUserId, memberId, tripId);
        const { trips } = get();
        if (trips.length > 0) {
          set({
            trips: [
              {
                ...trips[0],
                members: trips[0].members.filter((m) => m.id !== memberId),
              },
            ],
          });
        }
        void get().loadControlCenter();
      } finally {
        isWriting = false;
      }
    },

    leaveTrip: async () => {
      isWriting = true;
      try {
        const tripId = get().activeTripId || get().trips[0]?.tripId;
        await collabApi.leaveTrip(get().currentUserId, tripId);
        stopPolling();
        await get().load();
        void get().loadControlCenter();
      } finally {
        isWriting = false;
      }
    },

    addItem: async (day, title, note) => {
      isWriting = true;
      try {
        const tripId = get().activeTripId || get().trips[0]?.tripId;
        const res = await collabApi.addItem(get().currentUserId, day, title, note, tripId);
        if (res.success && res.item) {
          const { trips } = get();
          if (trips.length > 0) {
            set({
              trips: [
                {
                  ...trips[0],
                  items: [...trips[0].items, res.item],
                },
              ],
            });
          }
        }
      } finally {
        isWriting = false;
      }
    },

    removeItem: async (itemId) => {
      isWriting = true;
      try {
        const tripId = get().activeTripId || get().trips[0]?.tripId;
        await collabApi.removeItem(get().currentUserId, itemId, tripId);
        const { trips } = get();
        if (trips.length > 0) {
          set({
            trips: [
              {
                ...trips[0],
                items: trips[0].items.filter((i) => i.itemId !== itemId),
              },
            ],
          });
        }
      } finally {
        isWriting = false;
      }
    },

    addComment: async (text) => {
      isWriting = true;
      try {
        const tripId = get().activeTripId || get().trips[0]?.tripId;
        await collabApi.addComment(get().currentUserId, text, tripId);
        const { trips, currentUserId } = get();
        if (trips.length > 0) {
          const tempComment: CollabComment = {
            id: `temp-${Date.now()}`,
            authorId: currentUserId,
            authorName: "You",
            avatar: "",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            text,
            own: true,
          };
          set({
            trips: [
              {
                ...trips[0],
                comments: [...trips[0].comments, tempComment],
              },
            ],
          });
        }
      } finally {
        isWriting = false;
      }
    },

    toggleLike: async (tripId?: string) => {
      const targetTrip = tripId || get().activeTripId || get().trips[0]?.tripId;
      if (!targetTrip) return;
      const uid = get().currentUserId;

      // 乐观更新
      set((state) => {
        const trip = state.trips.find((t) => t.tripId === targetTrip) ?? state.trips[0];
        if (!trip) return state;
        const currentLikes = trip.likes ?? { count: 0, likedByMe: false, likers: [] };
        const nextLiked = !currentLikes.likedByMe;
        const nextCount = nextLiked ? currentLikes.count + 1 : Math.max(0, currentLikes.count - 1);
        const nextLikers = nextLiked
          ? [{ id: uid, name: "You", avatar: "" }, ...currentLikes.likers]
          : currentLikes.likers.filter((l) => l.id !== uid);

        const updatedTrip: CollabTrip = {
          ...trip,
          likes: {
            count: nextCount,
            likedByMe: nextLiked,
            likers: nextLikers,
          },
        };
        return {
          trips: state.trips.map((t) => (t.tripId === targetTrip ? updatedTrip : t)),
        };
      });

      try {
        const res = await collabApi.toggleLike(targetTrip, uid);
        if (res.success) {
          set((state) => {
            const trip = state.trips.find((t) => t.tripId === targetTrip) ?? state.trips[0];
            if (!trip) return state;
            const updatedTrip: CollabTrip = {
              ...trip,
              likes: {
                count: res.count,
                likedByMe: res.liked,
                likers: res.likers,
              },
            };
            return {
              trips: state.trips.map((t) => (t.tripId === targetTrip ? updatedTrip : t)),
            };
          });
        }
      } catch {
        // Rollback handled by polling
      }
    },

    importTripPlan: async (payload) => {
      isWriting = true;
      try {
        const uid = get().currentUserId || getAuthUserId();
        const res = await collabApi.importTrip(uid, payload);
        if (res.success) {
          await get().loadControlCenter();
        }
        return res;
      } catch (e) {
        return {
          success: false,
          message: e instanceof Error ? e.message : "Failed to import trip plan",
        };
      } finally {
        isWriting = false;
      }
    },
  };
});

/**
 * 订阅 module 01 登录状态：身份变化时同步 currentUserId 并重新拉取数据。
 */
useAuthStore.subscribe((auth) => {
  const nextId = auth.user?.id ?? "";
  const { currentUserId, setCurrentUser } = useCollabStore.getState();
  if (nextId !== currentUserId) {
    setCurrentUser(nextId);
  }
});
