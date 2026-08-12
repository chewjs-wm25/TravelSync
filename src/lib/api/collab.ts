import type {
  CollabTrip,
  CollabInvite,
  InviteRole,
  InviteResult,
  CollabComment,
  ItineraryItem,
} from "@/src/store/collab/CollabStore";

const BASE = "/api/collab";

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

export interface BootstrapResponse {
  ok: boolean;
  trip: CollabTrip;
  meUserId: string;
}

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
};