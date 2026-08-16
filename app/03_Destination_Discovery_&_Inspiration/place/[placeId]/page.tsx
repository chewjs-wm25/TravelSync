"use client";
// 地点详情页：按 placeId 重查 Geoapify（携带搜索词 q）展示地点完整详情
// 数据来源：Business Logic Layer（discoveryService.getPlaceDetail）
// 交互：返回搜索结果页 / 返回探索主页

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { discoveryService } from "../../../../business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";
import type { PlaceDetail } from "../../../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";
import { MODULE_03_HOME, SEARCH_PAGE, searchPagePath } from "../../routes";
import { StarIcon } from "../../favouriteList";
import { useFavorites, usePlaceImages } from "../../hooks";
import { ImageOff } from "lucide-react";

/** 品质徽章等级 → 展示文案（纯 UI 展示映射） */
const BADGE_LABEL: Record<NonNullable<PlaceDetail["qualityBadge"]>, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
};

function PlaceDetailView() {
  const params = useParams<{ placeId: string }>();
  const searchParams = useSearchParams();
  const placeId = params.placeId ?? "";
  const q = searchParams.get("q") ?? "";
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { savedItems, toggleItem } = useFavorites();
  /** 已收藏地点 id 集合（合并 isFavourite 展示状态） */
  const favouriteIds = useMemo(
    () => new Set(savedItems.map((item) => item.id)),
    [savedItems]
  );
  /** 地点大图（懒加载：Geoapify Place Details 维基图 → Wikimedia Commons 兜底；无图以 Icon 表示） */
  const images = usePlaceImages(place ? [place] : []);

  useEffect(() => {
    let cancelled = false;
    discoveryService
      .getPlaceDetail(placeId, q)
      .then((result) => {
        if (!cancelled) setPlace(result);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load place details. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [placeId, q]);

  return (
    <div className="space-y-6">
      {/* 返回导航 */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={q.trim() ? searchPagePath(q) : SEARCH_PAGE}
          className="rounded-full bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-500 transition-colors duration-150 hover:bg-gray-200"
        >
          ← Back to Search Results
        </Link>
        <Link
          href={MODULE_03_HOME}
          className="rounded-full bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-500 transition-colors duration-150 hover:bg-gray-200"
        >
          ← Back to Explore
        </Link>
      </div>

      {/* 加载态 */}
      {isLoading && <p className="text-sm text-gray-400">Loading place…</p>}

      {/* 错误态 */}
      {!isLoading && error && (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <p className="text-base text-gray-800">{error}</p>
        </div>
      )}

      {/* 未找到 */}
      {!isLoading && !error && !place && (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <p className="text-base text-gray-800">
            This place could not be found.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            It may have been removed or the link may be outdated.
          </p>
        </div>
      )}

      {/* 详情卡片 */}
      {!isLoading && !error && place && (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col md:flex-row">
            {/* 图片区（真实地点图片；加载中/无图时以 Icon 表示无图） */}
            <div className="relative m-2 min-h-56 rounded-2xl border border-gray-200 bg-gradient-to-br from-primary-500/20 via-secondary-500/20 to-accent-400/30 md:w-2/5">
              {/* 官方品质评级徽章（仅匹配 Offical Quality Rating 的地点展示） */}
              {place.qualityBadge && (
                <span className="absolute top-3 left-3 rounded-md bg-gray-800/90 px-3 py-1 text-xs font-semibold text-white shadow-md">
                  {BADGE_LABEL[place.qualityBadge]}
                </span>
              )}
              {/* 收藏按钮（星星图标） */}
              <button
                onClick={() => toggleItem(place)}
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
              {images[place.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[place.id]}
                  alt={place.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {!images[place.id] && (
                <ImageOff
                  className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-gray-400"
                  aria-label="No image available"
                />
              )}
            </div>

            {/* 详情信息 */}
            <div className="flex-1 p-6 md:p-8">
              <h1 className="text-4xl font-bold text-gray-800">{place.name}</h1>
              <p className="mt-2 text-base text-gray-500">{place.formatted}</p>

              {/* 分类标签 */}
              <div className="mt-4 flex flex-wrap gap-2">
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
                {place.resultType && (
                  <span className="rounded-md bg-secondary-500/10 px-2 py-1 text-xs font-medium text-secondary-500">
                    {place.resultType}
                  </span>
                )}
              </div>

              {/* 详情信息卡片 */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {place.addressLine1 && (
                  <DetailField label="Address" value={place.addressLine1} />
                )}
                {place.addressLine2 && (
                  <DetailField label="Area" value={place.addressLine2} />
                )}
                {place.city && <DetailField label="City" value={place.city} />}
                {place.state && (
                  <DetailField label="State" value={place.state} />
                )}
                {place.country && (
                  <DetailField label="Country" value={place.country} />
                )}
                <DetailField
                  label="Coordinates"
                  value={`${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}`}
                />
                <DetailField
                  label="Scene"
                  value={place.scene === "indoor" ? "Indoor" : "Outdoor"}
                />
                <DetailField
                  label="Suggested Duration"
                  value={`${place.suggestedDuration} (estimated)`}
                />
                <DetailField
                  label="Ticket Price"
                  value={`${place.ticketPrice} (estimated)`}
                />
                <DetailField
                  label="Opening Status"
                  value={place.isOpenNow ? "Open Now" : "Closed"}
                />
              </div>

              <p className="mt-6 text-xs text-gray-400">
                Details sourced from Geoapify Geocoding API. Duration, ticket
                price and opening status are estimates.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 详情字段行（纯 UI 展示组件） */
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-100 p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

/** 页面入口：useSearchParams 需要 Suspense 边界（Next.js 静态渲染要求） */
export default function PlaceDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>
      <PlaceDetailView />
    </Suspense>
  );
}
