"use client";

import { Compass } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";
import { useEffect, useState } from "react";

export default function Header() {
  const { isLoggedIn, user, logout, refreshSession } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // 从服务端 cookie 会话恢复登录状态（未登录则清空本地残留）
    void refreshSession();
  }, [refreshSession]);

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b-2 border-gray-200 bg-white px-4 md:px-8">
      <Link
        href="/"
        onClick={() => {
          if (window.location.pathname === "/") return;
          const current = window.location.pathname;
          setTimeout(() => {
            if (window.location.pathname === current) {
              window.location.href = "/";
            }
          }, 150);
        }}
        className="flex items-center gap-3 transition-opacity duration-150 hover:opacity-80"
      >
        <div className="bg-primary-500 shadow-base flex h-10 w-10 items-center justify-center rounded-2xl text-white">
          <Compass size={24} strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-800">
          TravelSync
        </h1>
      </Link>

      <div>
        {!isMounted ? (
          <div className="h-10 w-20 animate-pulse rounded-xl bg-gray-200" />
        ) : isLoggedIn && user ? (
          <div className="flex items-center gap-4">
            <Link
              href="/01_User_&_Account_Management"
              onClick={() => {
                if (window.location.pathname.startsWith("/01_User_&_Account_Management")) return;
                const current = window.location.pathname;
                setTimeout(() => {
                  if (window.location.pathname === current) {
                    window.location.href = "/01_User_&_Account_Management";
                  }
                }, 150);
              }}
              title="Account Settings"
              className="flex cursor-pointer items-center gap-3 transition-opacity duration-150 hover:opacity-80"
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                <p className="text-[10px] text-gray-400">{user.role ?? "user"}</p>
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
                  <div className="flex h-full w-full items-center justify-center bg-primary-500 text-sm font-medium text-white">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </Link>
            <button
              onClick={() => void logout()}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            href="/01_User_&_Account_Management"
            onClick={() => {
              if (window.location.pathname.startsWith("/01_User_&_Account_Management")) return;
              const current = window.location.pathname;
              setTimeout(() => {
                if (window.location.pathname === current) {
                  window.location.href = "/01_User_&_Account_Management";
                }
              }, 150);
            }}
            className="bg-primary-500 hover:shadow-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
