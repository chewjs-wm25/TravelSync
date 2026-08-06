"use client";

import React, { useState } from "react";

// Component
import SearchAndFilter, { activeType } from "./searchAndFilter";
import CuratedInspirations from "./curatedInspirations";
import UpcomingFestivalsEvent from "./upcomingFestivalsEvent";
import FavouriteList from "./favouriteList";

export default function TravelInspirationPage() {
  const [activeTab, setActiveTab] = useState<activeType>("all");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <main className="relative min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-24 md:space-y-6">
        {/* =========================================
            1. 搜索与筛选区域 (Bento 卡片)
            ========================================= */}
        <SearchAndFilter activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* =========================================
            2. 专题合集与活动区域
            ========================================= */}
        <CuratedInspirations />

        {/* =========================================
            3. 兴趣点（POI）决策视图 (Bento 网格)
            ========================================= */}
        <UpcomingFestivalsEvent />
      </div>

      {/* =========================================
          4. 愿望清单与收藏夹区域
          ========================================= */}
      <FavouriteList
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
      />
    </main>
  );
}
