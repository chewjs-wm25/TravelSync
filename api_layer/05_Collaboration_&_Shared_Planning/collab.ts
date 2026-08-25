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

function headers(userId?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(userId ? { "x-demo-user-id": userId } : {}),
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
  | { type: "item_added"; item: { id: string; day: number; title: string; note?: string } }
  | { type: "item_removed"; itemId: string }
  | { type: "comment_added"; comment: { id: string; authorId: string; authorName: string; avatar: string; time: string; text: string } }
  | { type: "activity"; entry: { id: string; actor: string; action: string; at: number } }
  | { type: "heartbeat"; timestamp: number };

/** SSE 订阅返回的清理函数 */
export type Unsubscribe = () => void;

export const collabApi = {
  /** 一次拉全行程状态（挂载时用） */
  bootstrap(userId?: string): Promise<BootstrapResponse> {
    return request<BootstrapResponse>(`${BASE}/bootstrap`, {
      headers: headers(userId),
    });
  },

  /** 发起邀请 */
  async invite(
    userId: string,
    email: string,
    role: InviteRole
  ): Promise<InviteResult> {
    const data = await request<{ ok: boolean; message?: string; invite?: CollabInvite }>(
      `${BASE}/invites`,
      {
        method: "POST",
        headers: headers(userId),
        body: JSON.stringify({ email, role }),
      }
    );
    return data.ok
      ? { ok: true, invite: data.invite }
      : { ok: false, message: data.message ?? "Could not send invite." };
  },

  /** 取消邀请 */
  cancelInvite(userId: string, inviteId: string): Promise<{ ok: boolean }> {
    return request(`${BASE}/invites/${inviteId}`, {
      method: "DELETE",
      headers: headers(userId),
    });
  },

  /** 接受 / 拒绝邀请 */
  updateInvite(inviteId: string, status: "accepted" | "rejected", userId?: string) {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return request(`${BASE}/invites/${inviteId}/status${qs}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status }),
    });
  },

  /** 模拟 30 天过期 */
  expireInvites(): Promise<{ ok: boolean; expired: number }> {
    return request(`${BASE}/invites/expire`, { method: "POST", headers: headers() });
  },

  /** 改角色 */
  changeRole(userId: string, memberUserId: string, role: "Editor" | "Viewer") {
    return request(`${BASE}/members/${memberUserId}`, {
      method: "PATCH",
      headers: headers(userId),
      body: JSON.stringify({ role }),
    });
  },

  /** 移除成员 */
  removeMember(userId: string, memberUserId: string) {
    return request(`${BASE}/members/${memberUserId}`, {
      method: "DELETE",
      headers: headers(userId),
    });
  },

  /** 退出行程 */
  leaveTrip(userId: string) {
    return request(`${BASE}/members/leave`, { method: "DELETE", headers: headers(userId) });
  },

  /** 新增明细 */
  async addItem(
    userId: string,
    day: number,
    title: string,
    note?: string
  ): Promise<{ ok: boolean; item?: ItineraryItem }> {
    return request(`${BASE}/items`, {
      method: "POST",
      headers: headers(userId),
      body: JSON.stringify({ day, title, note }),
    });
  },

  /** 删除明细 */
  removeItem(userId: string, itemId: string) {
    return request(`${BASE}/items/${itemId}`, {
      method: "DELETE",
      headers: headers(userId),
    });
  },

  /** 发评论 */
  addComment(userId: string, text: string) {
    return request(`${BASE}/messages`, {
      method: "POST",
      headers: headers(userId),
      body: JSON.stringify({ text }),
    });
  },

  /** 拉评论 */
  getComments(userId: string): Promise<{ ok: boolean; comments: CollabComment[] }> {
    return request(`${BASE}/messages`, { headers: headers(userId) });
  },

  /** 订阅 SSE 实时事件 */
  subscribeToEvents(userId: string, onEvent: (event: SSEEvent) => void): Unsubscribe {
    const eventSource = new EventSource(`${BASE}/events?userId=${encodeURIComponent(userId)}`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as SSEEvent;
        onEvent(event);
      } catch {
        // 忽略解析错误
      }
    };

    eventSource.onerror = () => {
      // 浏览器会自动重连
      console.log("[SSE] Connection error, will retry...");
    };

    // 返回清理函数
    return () => {
      eventSource.close();
    };
  },
};