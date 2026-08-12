"use client";

import React, { useState } from "react";

// Component（纯展示，数据经 Presentation hooks 从 Business Logic Layer 获取）
import SearchAndFilter from "./searchAndFilter";
import CuratedInspirations from "./curatedInspirations";
import UpcomingFestivalsEvent from "./upcomingFestivalsEvent";
import FavouriteList from "./favouriteList";

// Presentation hooks
import { useFavorites, useSearchAndFilter } from "./hooks";

// 领域类型
import type {
  PoiItem,
  SavedItem,
} from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

export default function TravelInspirationPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    suggestions,
    isSuggesting,
    selectSuggestion,
    selectedExperienceType,
    setSelectedExperienceType,
    isMuslimFriendly,
    setIsMuslimFriendly,
    filterOptions,
    pois,
    isLoading,
    toggleFavourite,
  } = useSearchAndFilter();
  const {
    typeOptions,
    activeType,
    setActiveType,
    refresh: refreshFavorites,
    addToTrip,
  } = useFavorites();

  /** 加入行程反馈（toast）：进行中的地点 id + 结果提示 */
  const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
  const [tripToast, setTripToast] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  /** 收藏/取消收藏：保存到当前用户的收藏夹，并同步收藏状态与列表 */
  const handleToggleFavourite = async (poi: (typeof pois)[number]) => {
    await toggleFavourite(poi);
    await refreshFavorites();
  };

  /**
   * 将地点加入行程（模块 02，当前经 RoutePlannerBridge stub 桥接）：
   * PoiItem → SavedItem（行程条目不归属收藏夹）。
   */
  const handleAddToTrip = async (poi: PoiItem) => {
    const item: SavedItem = {
      id: poi.id,
      placeId: poi.id.startsWith("geo-") ? poi.id.slice("geo-".length) : poi.id,
      name: poi.name,
      thumbnailUrl: poi.imageUrl,
      experienceType: poi.experienceType,
    };
    setAddingToTripId(poi.id);
    try {
      const result = await addToTrip(item);
      setTripToast({
        status: result.success ? "success" : "error",
        message: result.success
          ? `✓ ${poi.name} added to your trip`
          : `Failed to add ${poi.name} to trip`,
      });
    } catch {
      setTripToast({
        status: "error",
        message: `Failed to add ${poi.name} to trip`,
      });
    } finally {
      setAddingToTripId(null);
      setTimeout(() => setTripToast(null), 3000);
    }
  };

  return (
    <main className="relative min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-24 md:space-y-6">
        {/* =========================================
            1. 搜索与筛选区域 (Bento 卡片)
            ========================================= */}
        <SearchAndFilter
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          suggestions={suggestions}
          isSuggesting={isSuggesting}
          onSelectSuggestion={selectSuggestion}
          selectedExperienceType={selectedExperienceType}
          setSelectedExperienceType={setSelectedExperienceType}
          isMuslimFriendly={isMuslimFriendly}
          setIsMuslimFriendly={setIsMuslimFriendly}
          filterOptions={filterOptions}
        />

        {/* =========================================
            2. 专题合集与活动区域
            ========================================= */}
        <CuratedInspirations />

        {/* =========================================
            3. 兴趣点（POI）决策视图 (Bento 网格)
            ========================================= */}
        {searchQuery.trim() ? (
          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-2xl font-semibold text-gray-800">
                Search Results
              </h2>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
              <p className="text-base text-gray-800">
                Press{" "}
                <kbd className="rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-gray-500">
                  Enter
                </kbd>{" "}
                to view search results for “{searchQuery.trim()}”
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Results open on the dedicated search page.
              </p>
            </div>
          </section>
        ) : (
          <UpcomingFestivalsEvent
            pois={pois}
            isLoading={isLoading}
            onToggleFavourite={handleToggleFavourite}
            onAddToTrip={handleAddToTrip}
            addingToTripId={addingToTripId}
          />
        )}
      </div>

      {/* =========================================
          4. 愿望清单与收藏夹区域
          ========================================= */}
      <FavouriteList
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        typeOptions={typeOptions}
        activeType={activeType}
        setActiveType={setActiveType}
      />

      {/* 加入行程反馈 toast（POI 卡片触发） */}
      {tripToast && (
        <div
          className={`fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg ${
            tripToast.status === "success" ? "bg-[#10b981]" : "bg-[#ef4444]"
          }`}
        >
          {tripToast.message}
        </div>
      )}
    </main>
  );
}
