"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "./authUser";
import SyncQualityRatingsBTN from "./syncQualityRatings";
import SyncEventsBTN from "./syncEvents";
import ClearImageCachesBTN from "./clearImageCaches";
import ClearRatedEventsBTN from "./clearRatedEvents";

/**
 * Admin Panel 页面（Presentation Layer）
 *
 * 鉴权（客户端守卫，展示层）：
 *   - 挂载时经 refreshSession() 从服务端 cookie 会话刷新登录态（不信任
 *     localStorage 持久化残留），确保 user.role 为服务端最新投影；
 *   - 仅「已登录且 role === admin」渲染管理工具；未登录或普通用户一律
 *     router.replace("/") 导航回 Home Page。
 * 真正的安全边界在服务端 Route API（同步/清空/清缓存端点 requireAdmin，
 * 401/403），本页守卫只负责 UX 导航，工具区不会为非管理员闪现。
 */

export default function AdminPanelPage() {
  const router = useRouter();
  const { isLoggedIn, user, refreshSession } = useAuthStore();
  const [checking, setChecking] = useState(true);

  // 页面挂载时刷新一次会话（Header 亦会调用；幂等、开销小），
  // 确保 role 判断基于服务端返回的最新用户投影。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshSession();
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const isAdmin = user?.role === "admin";

  // 检查完成后：未登录 / 非管理员 → 导航至 Home Page
  useEffect(() => {
    if (!checking && (!isLoggedIn || !isAdmin)) {
      router.replace("/");
    }
  }, [checking, isLoggedIn, isAdmin, router]);

  // 检查中：渲染占位，避免工具区闪现
  if (checking) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-gray-100" />
        <hr className="border-slate-200" />
      </div>
    );
  }

  // 非管理员（正被重定向）不渲染内容
  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Admin Panel</h1>
      <p className="text-sm text-slate-500">
        Administrator-only tools for syncing data and clearing caches. Login and
        session are managed by the Account module.
      </p>
      <hr className="border-slate-200" />
      {/* 官方品质评级同步（MOTAC 官网爬取 → D1） */}
      <SyncQualityRatingsBTN />
      {/* 节日/活动同步（malaysia.travel 官网爬取 → D1） */}
      <SyncEventsBTN />
      {/* 清空全部地点图片缓存（内存 + sessionStorage + Cloudflare KV） */}
      <ClearImageCachesBTN />
      {/* 清空全部 Quality Ratings 与 Events 数据（D1） */}
      <ClearRatedEventsBTN />
    </div>
  );
}
