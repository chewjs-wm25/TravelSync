"use client";
// 搜索结果页：展示搜索词的真实 Geoapify 搜索结果（地点卡片网格）
// 数据来源：Business Logic Layer（discoveryService.searchPlaceDetails）
// 交互：点击地点卡片 → 跳转地点详情页（携带 placeId + 搜索词）

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { discoveryService } from "../../../business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";
import type { PlaceDetail } from "../../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";
import { MODULE_03_HOME, placeDetailPath } from "../routes";
import { StarIcon } from "../favouriteList";
import { useFavorites, usePlaceImages } from "../hooks";
import { ImageOff } from "lucide-react";

/** 品质徽章等级 → 展示文案（纯 UI 展示映射） */
const BADGE_LABEL: Record<NonNullable<PlaceDetail["qualityBadge"]>, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
};

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const hasQuery = q.trim().length > 0;
  const [places, setPlaces] = useState<PlaceDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { savedItems, toggleItem } = useFavorites();
  /** 已收藏地点 id 集合（合并 isFavourite 展示状态） */
  const favouriteIds = useMemo(
    () => new Set(savedItems.map((item) => item.id)),
    [savedItems]
  );
  /** 地点图片（懒加载：Geoapify Place Details 维基图 → Wikimedia Commons 兜底；无图以 Icon 表示） */
  const images = usePlaceImages(places);

  useEffect(() => {
    if (!hasQuery) return;
    let cancelled = false;
    discoveryService
      .searchPlaceDetails(q)
      .then((result) => {
        if (!cancelled) setPlaces(result);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Search failed. Please check your connection and try again."
          );
          setPlaces([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, hasQuery]);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Search Results
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {q.trim() ? (
              <>
                {isLoading
                  ? `Searching for “${q.trim()}”…`
                  : `${places.length} place${places.length === 1 ? "" : "s"} found for “${q.trim()}”`}
              </>
            ) : (
              "Enter a search term to find places in Malaysia."
            )}
          </p>
        </div>
        <Link
          href={MODULE_03_HOME}
          className="rounded-full bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-500 transition-colors duration-150 hover:bg-gray-200"
        >
          ← Back to Explore
        </Link>
      </div>

      {/* 加载态 */}
      {isLoading && hasQuery && (
        <p className="text-sm text-gray-400">Loading places…</p>
      )}

      {/* 错误态 */}
      {!isLoading && error && (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <p className="text-base text-gray-800">{error}</p>
          <p className="mt-1 text-sm text-gray-500">
            Please try again in a moment.
          </p>
        </div>
      )}

      {/* 空态 / 无查询词提示 */}
      {!isLoading && !error && places.length === 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <p className="text-base text-gray-800">
            {hasQuery
              ? `No results found for “${q.trim()}”`
              : "Enter a search term to find places in Malaysia."}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {hasQuery
              ? "Try a different keyword, e.g. “Batu Caves” or “Penang”."
              : "Use the search bar on the explore page, then press Enter."}
          </p>
        </div>
      )}

      {/* 结果网格（整卡可点击 → 地点详情页） */}
      {!isLoading && !error && places.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {places.map((place) => (
            <Link
              key={place.placeId}
              href={placeDetailPath(place.placeId, q)}
              className="group block overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)]"
            >
              {/* 图片区（真实地点图片；加载中/无图时以 Icon 表示无图） */}
              <div className="relative m-2 h-40 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-primary-500/20 via-secondary-500/20 to-accent-400/30">
              {images[place.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[place.id]}
                  alt={place.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {/* 官方品质评级徽章（仅匹配 Offical Quality Rating 的地点展示） */}
              {place.qualityBadge && (
                <span className="absolute top-3 left-3 rounded-md bg-gray-800/90 px-3 py-1 text-xs font-semibold text-white shadow-md">
                  {BADGE_LABEL[place.qualityBadge]}
                </span>
              )}
                {/* 收藏按钮（星星图标）：阻止冒泡避免触发卡片跳转 */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleItem(place);
                  }}
                  aria-label={
                    favouriteIds.has(place.id)
                      ? `Remove ${place.name} from favourites`
                      : `Add ${place.name} to favourites`
                  }
                  className={`absolute top-3 right-3 rounded-full p-2 shadow-sm backdrop-blur-sm transition-colors duration-150 ${
                    favouriteIds.has(place.id)
                      ? "bg-primary-500 text-white"
                      : "bg-white/90 text-gray-500 hover:bg-white hover:text-primary-500"
                  }`}
                >
                  <StarIcon
                    filled={favouriteIds.has(place.id)}
                    className="h-5 w-5"
                  />
                </button>
                {!images[place.id] && (
                  <ImageOff
                    className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-gray-400"
                    aria-label="No image available"
                  />
                )}
              </div>

              <div className="p-6 pt-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  {place.name}
                </h3>
                <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                  {place.addressLine1 || place.addressLine2 || place.formatted}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {place.experienceType && (
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                      {place.experienceType}
                    </span>
                  )}
                  {place.category && (
                    <span className="rounded-md bg-primary-500/10 px-2 py-1 text-xs font-medium text-primary-500">
                      {place.category}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** 页面入口：useSearchParams 需要 Suspense 边界（Next.js 静态渲染要求） */
export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>
      <SearchResults />
    </Suspense>
  );
}
