"use client";

import { Compass } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/app/authUser";
import { useEffect, useState } from "react";

export default function Header() {
  const { isLoggedIn, user, login } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b-2 border-gray-200 bg-white px-4 md:px-8">
      {/* 左侧：Logo 与 网站名称（添加 Link 跳转首页） */}
      <Link
        href="/"
        className="flex items-center gap-3 transition-opacity duration-150 hover:opacity-80"
      >
        <div className="bg-primary-500 shadow-base flex h-10 w-10 items-center justify-center rounded-2xl text-white">
          <Compass size={24} strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-800">
          TravelSync
        </h1>
      </Link>

      {/* 右侧：登录/用户信息 动态渲染 */}
      <div>
        {!isMounted ? (
          /* 1. 挂载/水合未完成时：显示与按钮等大的骨架屏占位，防止误显“登录” */
          <div className="h-10 w-20 animate-pulse rounded-xl bg-gray-200" />
        ) : isLoggedIn && user ? (
          /* 2. 已登录状态 */
          <Link
            href="/settings"
            title="Account Settings"
            className="flex cursor-pointer items-center gap-4 transition-opacity duration-150 hover:opacity-80"
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
            </div>
            <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-gray-200">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm font-medium text-gray-800">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </Link>
        ) : (
          /* 3. 确定未登录状态：显示登录按钮 */
          <button
            onClick={login}
            className="bg-primary-500 hover:shadow-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
