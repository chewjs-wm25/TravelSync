// store/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  name: string;
  avatarUrl?: string; // 已移除 title
}

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  /** 硬编码登录函数 */
  login: () => void;
  /** 退出登录函数 */
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  // 使用 persist 中间件持久化存储到 localStorage
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,

      // 模拟登录，写入硬编码的用户信息（已移除 title）
      login: () => {
        set({
          isLoggedIn: true,
          user: {
            name: "Flandre Scarlet", //谁换谁是Gay (Dev Version)
            avatarUrl: "/images.jpg",
          },
        });
      },

      // 退出登录，重置状态
      logout: () => {
        set({
          isLoggedIn: false,
          user: null,
        });
      },
    }),
    {
      name: "auth-storage", // localStorage 存储的 key 名称
    }
  )
);
