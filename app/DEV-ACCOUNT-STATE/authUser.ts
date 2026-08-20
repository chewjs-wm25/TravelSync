// store/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchUserAccount } from "./userAccountStub";

interface User {
  id: string;
  name: string;
  avatarUrl?: string; // 已移除 title
  role?: string;
}

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  /** 会话凭证（服务端 DEV 登录 API 签发，授权接口凭此识别当前用户） */
  token: string | null;
  /** 登录：经 userAccountStub 从 01 模块（DEV 替身）获取账号数据 */
  login: () => Promise<void>;
  /** 退出登录函数 */
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  // 使用 persist 中间件持久化存储到 localStorage
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      token: null,

      // 模拟登录：账号数据来自 userAccountStub（模拟 01 模块数据源），
      // 不再硬编码账号信息（已移除 title）
      login: async () => {
        const { user, token } = await fetchUserAccount();
        set({
          isLoggedIn: true,
          user,
          token,
        });
      },

      // 退出登录，重置状态（销毁会话凭证）
      logout: () => {
        set({
          isLoggedIn: false,
          user: null,
          token: null,
        });
      },
    }),
    {
      name: "auth-storage", // localStorage 存储的 key 名称
    }
  )
);
