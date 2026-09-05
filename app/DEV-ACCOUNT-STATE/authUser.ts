"use client";
// store/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 全站唯一登录状态源（Zustand + localStorage 持久化）。
 * 会话凭证由服务端 HttpOnly cookie（travelsync_session）管理，前端不持有 token。
 *
 * 数据来源（均收敛到 syncUser）：
 *  - Module 01 登录成功后调用 syncUser(user)
 *  - refreshSession() 在页面加载时经 GET account-actions 从 cookie 会话恢复
 *  - 登出走 logout()（POST 服务端清 cookie + 本地清空）
 */
interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

/** 服务端 PublicUser 投影 → 前端 User */
function mapPublicUser(u: {
  id: string;
  username: string;
  fullName: string;
  profilePicture: string | null;
  role?: string;
}): User {
  return {
    id: u.id,
    name: u.fullName || u.username,
    avatarUrl: u.profilePicture ?? undefined,
    role: u.role ?? undefined,
  };
}

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  /** @deprecated 保留向后兼容（Module 03 sessionAuth 读取），cookie-based 认证不再使用 */
  token: string | null;
  /** 由 Module 01（或其他模块）在登录/会话恢复时写入 */
  syncUser: (user: User | null) => void;
  /** 从服务端 cookie 会话恢复登录状态（页面挂载时调用一次） */
  refreshSession: () => Promise<void>;
  /** 登出：清服务端 cookie + 本地状态 */
  logout: () => Promise<void>;
}

const ACCOUNT_API = "/01_User_&_Account_Management/account-actions";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      token: null,

      syncUser: (user) =>
        set({ isLoggedIn: Boolean(user), user }),

      refreshSession: async () => {
        try {
          const res = await fetch(ACCOUNT_API);
          if (!res.ok) {
            set({ isLoggedIn: false, user: null });
            return;
          }
          const data = (await res.json()) as { user: Parameters<typeof mapPublicUser>[0] };
          if (!data.user) {
            set({ isLoggedIn: false, user: null });
            return;
          }
          set({ isLoggedIn: true, user: mapPublicUser(data.user) });
        } catch {
          /* 网络失败时保留本地持久化状态 */
        }
      },

      logout: async () => {
        await fetch(`${ACCOUNT_API}?action=logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }).catch(() => undefined);
        set({ isLoggedIn: false, user: null });
      },
    }),
    {
      name: "auth-storage",
    }
  )
);

export function mapAccountUser(u: Parameters<typeof mapPublicUser>[0]): User {
  return mapPublicUser(u);
}

export type AuthUser = User;
