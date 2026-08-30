import type {
  CollabInvite,
  InviteRole,
  InviteResult,
  CollabComment,
  ItineraryItem,
  BootstrapResponse,
  CollabRole,
} from "./types";

const BASE = "/05_Collaboration_&_Shared_Planning/api/collab";

function headers(userId?: string, tripId?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(userId ? { "x-demo-user-id": userId } : {}),
    ...(tripId ? { "x-trip-id": tripId } : {}),
  };
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json()) as T;
  return data;
}

/** SSE 事件类型 */
export type SSEEvent =
  | { type: "connected"; userId: string; tripId: string; timestamp: number }
  | { type: "member_joined"; member: { id: string; name: string; email: string; role: string; avatar: string } }
  | { type: "member_left"; userId: string }
  | { type: "member_removed"; userId: string }
  | { type: "role_changed"; userId: string; role: string }
  | { type: "invite_created"; invite: { id: string; email: string; role: string; status: string; invitedBy: string } }
  | { type: "invite_cancelled"; inviteId: string }
  | { type: "item_added"; item: { itemId: string; day: number; name: string; note?: string } }
  | { type: "item_removed"; itemId: string }
  | { type: "comment_added"; comment: { id: string; authorId: string; authorName: string; avatar: string; time: string; text: string } }
  | { type: "activity"; entry: { id: string; actor: string; action: string; at: number } }
  | { type: "heartbeat"; timestamp: number };

/** SSE 订阅返回的清理函数 */
export type Unsubscribe = () => void;

export const collabApi = {
  /** 一次拉全行程状态（挂载时用，支持多 Tab 的 tripId） */
  bootstrap(userId?: string, tripId?: string): Promise<BootstrapResponse> {
    const qs = tripId ? `?tripId=${encodeURIComponent(tripId)}` : "";
    return request<BootstrapResponse>(`${BASE}/bootstrap${qs}`, {
      headers: headers(userId, tripId),
    });
  },

  /** Control Center：我的 Plan + 我加入的 Share Plan */
  listControlCenter(userId: string): Promise<{ success: boolean; owned: import("@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/TripShareService").TripShareSummary[]; joined: import("@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/TripShareService").TripShareSummary[] }> {
    return request(`${BASE}/trips`, { headers: headers(userId) });
  },

  /** 切换共享（Owner 专用，private 立即踢出） */
  toggleShare(userId: string, tripId: string, isShared: boolean): Promise<{ success: boolean; isShared: boolean; removedMembers?: number; expiredInvites?: number; message?: string }> {
    return request(`${BASE}/trips/${encodeURIComponent(tripId)}/share`, {
      method: "PATCH",
      headers: headers(userId, tripId),
      body: JSON.stringify({ isShared }),
    });
  },

  /** 发起邀请 */
  async invite(
    userId: string,
    email: string,
    role: InviteRole,
    tripId?: string
  ): Promise<InviteResult> {
    const data = await request<{ success: boolean; message?: string; invite?: CollabInvite }>(
      `${BASE}/invites`,
      {
        method: "POST",
        headers: headers(userId, tripId),
        body: JSON.stringify({ email, role, tripId }),
      }
    );
    return data.success
      ? { success: true, invite: data.invite }
      : { success: false, message: data.message ?? "Could not send invite." };
  },

  /** 取消邀请 */
  cancelInvite(userId: string, inviteId: string, tripId?: string): Promise<{ success: boolean }> {
    const qs = tripId ? `?tripId=${encodeURIComponent(tripId)}` : "";
    return request(`${BASE}/invites/${encodeURIComponent(inviteId)}${qs}`, {
      method: "DELETE",
      headers: headers(userId, tripId),
    });
  },

  /** 接受 / 拒绝邀请 */
  updateInvite(inviteId: string, status: "accepted" | "rejected", userId?: string, tripId?: string) {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (tripId) params.set("tripId", tripId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`${BASE}/invites/${encodeURIComponent(inviteId)}/status${qs}`, {
      method: "PATCH",
      headers: headers(userId, tripId),
      body: JSON.stringify({ status, userId }),
    });
  },

  /** 模拟 30 天过期 */
  expireInvites(): Promise<{ success: boolean; expired: number }> {
    return request(`${BASE}/invites/expire`, { method: "POST", headers: headers() });
  },

  /** 改角色 */
  changeRole(userId: string, memberUserId: string, role: "Editor" | "Viewer", tripId?: string) {
    const qs = tripId ? `?tripId=${encodeURIComponent(tripId)}` : "";
    return request(`${BASE}/members/${encodeURIComponent(memberUserId)}${qs}`, {
      method: "PATCH",
      headers: headers(userId, tripId),
      body: JSON.stringify({ role, tripId }),
    });
  },

  /** 移除成员 */
  removeMember(userId: string, memberUserId: string, tripId?: string) {
    const qs = tripId ? `?tripId=${encodeURIComponent(tripId)}` : "";
    return request(`${BASE}/members/${encodeURIComponent(memberUserId)}${qs}`, {
      method: "DELETE",
      headers: headers(userId, tripId),
    });
  },

  /** 退出行程 */
  leaveTrip(userId: string, tripId?: string) {
    const qs = tripId ? `?tripId=${encodeURIComponent(tripId)}` : "";
    return request(`${BASE}/members/leave${qs}`, { method: "DELETE", headers: headers(userId, tripId) });
  },

  /** 新增明细 */
  async addItem(
    userId: string,
    day: number,
    title: string,
    note?: string,
    tripId?: string
  ): Promise<{ success: boolean; item?: ItineraryItem }> {
    return request(`${BASE}/items`, {
      method: "POST",
      headers: headers(userId, tripId),
      body: JSON.stringify({ day, title, note, tripId }),
    });
  },

  /** 删除明细 */
  removeItem(userId: string, itemId: string, tripId?: string) {
    const qs = tripId ? `?tripId=${encodeURIComponent(tripId)}` : "";
    return request(`${BASE}/items/${encodeURIComponent(itemId)}${qs}`, {
      method: "DELETE",
      headers: headers(userId, tripId),
    });
  },

  /** 发评论 */
  addComment(userId: string, text: string, tripId?: string) {
    return request(`${BASE}/messages`, {
      method: "POST",
      headers: headers(userId, tripId),
      body: JSON.stringify({ text, tripId }),
    });
  },

  /** 拉评论 */
  getComments(userId: string, tripId?: string): Promise<{ success: boolean; comments: CollabComment[] }> {
    const qs = tripId ? `?tripId=${encodeURIComponent(tripId)}` : "";
    return request(`${BASE}/messages${qs}`, { headers: headers(userId, tripId) });
  },

  /** 订阅 SSE 实时事件 */
  subscribeToEvents(userId: string, onEvent: (event: SSEEvent) => void, tripId?: string): Unsubscribe {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (tripId) params.set("tripId", tripId);
    const eventSource = new EventSource(`${BASE}/events?${params.toString()}`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as SSEEvent;
        onEvent(event);
      } catch {
        // 忽略解析错误
      }
    };

    eventSource.onerror = () => {
      // EventSource 内部会自动重连
    };

    return () => {
      eventSource.close();
    };
  },
};