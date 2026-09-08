"use client";

import React, { useMemo, useRef, useState } from "react";

// Component（纯展示，数据经 Presentation hooks 从 Business Logic Layer 获取）
import SearchAndFilter from "./searchAndFilter";
import CuratedInspirations from "./curatedInspirations";
import UpcomingFestivalsEvent from "./officalQualityRate";
import AddToTripPicker, {
  type AddToTripCandidate,
} from "./AddToTripPicker";

// Presentation hooks
import { useFavorites, useSearchAndFilter } from "./hooks";

// 领域类型
import type { PoiItem } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

export default function TravelInspirationPage() {
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
    selectedState,
    setSelectedState,
    filterOptions,
    pois,
    isLoading,
    error: placesError,
    retry: retryPlaces,
  } = useSearchAndFilter();
  const { toggleItem, savedItems } = useFavorites();
  /** 已收藏地点 id 集合（Recommended Places 卡片星标状态；toggleItem 后随 savedItems 即时更新） */
  const favouriteIds = useMemo(
    () => new Set(savedItems.map((item) => item.id)),
    [savedItems]
  );

  /** 加入行程反馈（toast）：进行中的地点 id + 结果提示 */
  const [addToTripCandidate, setAddToTripCandidate] =
    useState<AddToTripCandidate | null>(null);
  const [tripToast, setTripToast] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const tripToastTimer = useRef<number | null>(null);

  /** 展示加入行程结果 toast（自动 3s 消失；连续触发时重置计时） */
  const showTripToast = (
    status: "success" | "error",
    message: string
  ) => {
    if (tripToastTimer.current !== null) {
      window.clearTimeout(tripToastTimer.current);
    }
    setTripToast({ status, message });
    tripToastTimer.current = window.setTimeout(
      () => setTripToast(null),
      3000
    );
  };

  /**
   * 将地点加入行程（模块 02）：打开 AddToTripPicker 弹窗，由用户选择
   * 目标旅行与行程日期后经 BL 真实导入（坐标缺失自动解析补齐）。
   * PoiItem → 加入行程候选（行程条目不归属收藏夹）。
   */
  const handleAddToTrip = (poi: PoiItem) => {
    setAddToTripCandidate({
      id: poi.id,
      placeId:
        poi.placeId ??
        (poi.id.startsWith("geo-") ? poi.id.slice("geo-".length) : poi.id),
      name: poi.name,
      thumbnailUrl: poi.imageUrl,
      experienceType: poi.experienceType,
      lat: poi.lat ?? null,
      lon: poi.lon ?? null,
    });
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
          selectedState={selectedState}
          setSelectedState={setSelectedState}
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
            error={placesError}
            onRetry={retryPlaces}
            onAddToTrip={handleAddToTrip}
            favouriteIds={favouriteIds}
            onToggleFavourite={toggleItem}
          />
        )}
      </div>

      {/* 收藏夹浮层（悬浮按钮 + 抽屉）由 Module 03 布局 layout.tsx 全局提供，
          任意页面可打开；本页不再单独挂载 */}
      {/* 加入行程目标选择弹窗：选择旅行 → 行程日期 → 真实导入模块 02 */}
      <AddToTripPicker
        item={addToTripCandidate}
        onClose={() => setAddToTripCandidate(null)}
        onAdded={(info) =>
          showTripToast(
            "success",
            `✓ ${info.placeName} added to ${[info.tripName, info.dayTitle]
              .filter(Boolean)
              .join(" · ")}`
          )
        }
      />
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
