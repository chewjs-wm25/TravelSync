"use client";
// Module 03 布局（Destination Discovery & Inspiration 路由段共享壳）：
// 承载跨页面全局可用的收藏夹浮层（右下角悬浮按钮 + 右侧抽屉），使
// 主页 / 搜索结果页 / 地点详情页 / 合辑详情页任一页面都可随时打开收藏夹。
// 收藏数据一致性：收藏写操作经 useFavorites 广播 "module03:favourites-changed"
// 事件，本布局内 FavouriteList 的 useFavorites 实例监听后自动刷新，
// 因此从 Recommended Places / 搜索结果 / 地点详情添加收藏后收藏夹即时更新。

import React, { useState } from "react";
import FavouriteList from "./favouriteList";

export default function DestinationDiscoveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /** 收藏夹抽屉开关（布局级共享：路由切换时抽屉状态保持，可跨页面打开/关闭） */
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      {children}
      <FavouriteList
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
      />
    </>
  );
}
