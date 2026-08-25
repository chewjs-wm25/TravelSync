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

const POLL_INTERVAL_MS = 1000;

/** 从 module 01 登录状态获取当前用户 ID，未登录时返回空串 */
function getAuthUserId(): string {
  const auth = useAuthStore.getState();
  return auth.user?.id ?? "";
}

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
 * store 仅作内存缓存与业务编排。
 *
 * 同步策略：乐观更新 + 轮询。
 * - 写操作后立即本地更新 UI（乐观更新）
 * - 后台每 3 秒轮询 bootstrap 获取最新状态
 */
export const useCollabStore = create<CollabState>()((set, get) => {
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let isWriting = false;

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      // 写操作进行中时跳过轮询，避免覆盖乐观更新
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

  /** 静默刷新：不显示 loading 状态，不显示错误 */
  const silentRefresh = async () => {
    try {
      const data = await collabApi.bootstrap(get().currentUserId);
      const trip = data.trip;
      if (!trip) return;

      // 智能合并：保留乐观更新产生的临时数据
      set((state) => {
        const currentTrip = state.trips[0];
        if (!currentTrip) {
          return { trips: [trip] };
        }

        // 合并成员列表（去重）
        const memberMap = new Map<string, CollabMember>();
        for (const m of trip.members) memberMap.set(m.id, m);
        for (const m of currentTrip.members) {
          if (!memberMap.has(m.id)) memberMap.set(m.id, m);
        }

        // 合并邀请列表（去重）
        const inviteMap = new Map<string, CollabInvite>();
        for (const i of trip.invites) inviteMap.set(i.id, i);
        for (const i of currentTrip.invites) {
          if (!inviteMap.has(i.id)) inviteMap.set(i.id, i);
        }

        // 合并行程明细（去重，保留服务端数据为主）
        const itemMap = new Map<string, ItineraryItem>();
        for (const i of trip.items) itemMap.set(i.id, i);
        // 只保留服务端存在的项（删除的项会被移除）
        const mergedItems = trip.items;

        // 合并评论（去重，保留服务端数据为主）
        const commentMap = new Map<string, CollabComment>();
        for (const c of trip.comments) commentMap.set(c.id, c);
        // 仅添加尚未同步到服务端的临时评论（跳过已有真实版本的）
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
        };

        return { trips: [mergedTrip] };
      });
    } catch {
      // 静默失败，下次轮询再试
    }
  };

  return {
    currentUserId: getAuthUserId(),
    activeTripId: "trip_langkawi",
    trips: [],
    loading: true,
    error: null,

    load: async () => {
      set({ loading: true, error: null });
      try {
        const data = await collabApi.bootstrap(get().currentUserId);
        const trips = [data.trip];
        const activeTripId = trips.some((t) => t.id === get().activeTripId)
          ? get().activeTripId
          : (trips[0]?.id ?? "");
        set({ trips, activeTripId, loading: false });
        startPolling();
      } catch {
        set({
          loading: false,
          trips: [buildFallbackTrip(get().currentUserId)],
          activeTripId: "trip_langkawi",
          error:
            "演示模式：本地数据库无数据，已加载内置演示数据（写入功能不可用）。运行 npm run dev 会自动初始化真实数据库。",
        });
      }
    },

    setCurrentUser: (id) => {
      stopPolling();
      set({ currentUserId: id });
      void get().load();
    },

    setActiveTrip: (id) => set({ activeTripId: id }),

    inviteCollaborator: async (email, role) => {
      isWriting = true;
      try {
        const res = await collabApi.invite(get().currentUserId, email, role);
        // 乐观更新：立即添加邀请到本地
        if (res.ok && res.invite) {
          const { trips } = get();
          if (trips.length > 0) {
            set({
              trips: [{ ...trips[0], invites: [...trips[0].invites, res.invite] }],
            });
          }
        }
        return res;
      } finally {
        isWriting = false;
      }
    },

    cancelInvite: async (inviteId) => {
      isWriting = true;
      try {
        await collabApi.cancelInvite(get().currentUserId, inviteId);
        // 乐观更新：立即从本地移除
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
      } finally {
        isWriting = false;
      }
    },

    acceptInvite: async (inviteId) => {
      isWriting = true;
      try {
        await collabApi.updateInvite(inviteId, "accepted", get().currentUserId);
        // 轮询会拉取最新数据
        await silentRefresh();
      } finally {
        isWriting = false;
      }
    },

    rejectInvite: async (inviteId) => {
      isWriting = true;
      try {
        await collabApi.updateInvite(inviteId, "rejected", get().currentUserId);
        // 乐观更新：立即从本地移除
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
      } finally {
        isWriting = false;
      }
    },

    expirePendingInvites: async () => {
      isWriting = true;
      try {
        await collabApi.expireInvites();
        // 乐观更新：移除所有 pending 邀请
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
      } finally {
        isWriting = false;
      }
    },

    changeRole: async (memberId, role) => {
      isWriting = true;
      try {
        await collabApi.changeRole(get().currentUserId, memberId, role);
        // 乐观更新：立即修改本地角色
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
        await collabApi.removeMember(get().currentUserId, memberId);
        // 乐观更新：立即从本地移除
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
      } finally {
        isWriting = false;
      }
    },

    leaveTrip: async () => {
      isWriting = true;
      try {
        await collabApi.leaveTrip(get().currentUserId);
        stopPolling();
        await get().load();
      } finally {
        isWriting = false;
      }
    },

    addItem: async (day, title, note) => {
      isWriting = true;
      try {
        const res = await collabApi.addItem(get().currentUserId, day, title, note);
        if (res.ok && res.item) {
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
        await collabApi.removeItem(get().currentUserId, itemId);
        // 乐观更新：立即从本地移除
        const { trips } = get();
        if (trips.length > 0) {
          set({
            trips: [
              {
                ...trips[0],
                items: trips[0].items.filter((i) => i.id !== itemId),
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
        await collabApi.addComment(get().currentUserId, text);
        // 乐观更新：立即添加评论
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
  };
});

/**
 * 订阅 module 01 登录状态：身份变化（登录 / 登出 / 切换账号 / 持久化恢复）
 * 时同步 currentUserId 并重新拉取数据。
 */
useAuthStore.subscribe((auth) => {
  const nextId = auth.user?.id ?? "";
  const { currentUserId, setCurrentUser } = useCollabStore.getState();
  if (nextId !== currentUserId) {
    setCurrentUser(nextId);
  }
});
