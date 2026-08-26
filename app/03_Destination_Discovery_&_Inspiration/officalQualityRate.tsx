"use client";
//3. 兴趣点（POI）决策视图 (Bento 网格)——Recommended Places
// 数据来源：Business Logic Layer（officalQualityRating_hardcode.json 同步的
//           官方品质评级数据，经 Presentation hooks 获取）
// 交互：分页展示；点击卡片 → 新标签页打开 Google Maps（按公司名+地址搜索）；
//       图片经统一图片链路获取（Wikivoyage 条目配图 → Wikipedia 条目配图 →
//       Wikimedia Commons Geosearch 按经纬度 → Mapillary 兜底，马来西亚限定，
//       见 getPlaceImage）；图片底部展示作者与许可署名（开源协议合规）

import React, { useEffect, useState } from "react";
import type { PoiItem } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";
import { googleMapsUrl } from "./routes";
import { usePlaceImages } from "./hooks";
import { StarIcon } from "./favouriteList";
import PlaceImageAttribution from "./placeImageAttribution";
import { safeHttpUrl } from "./safeUrl";
import { ImageOff } from "lucide-react";

/** 每页展示的地点数（4 列网格 × 2 行） */
const PAGE_SIZE = 8;

interface OfficalQualityRateProps {
  pois: PoiItem[];
  isLoading?: boolean;
  /** 将地点加入行程（模块 02，经 RoutePlannerBridge 真实导入接口）；传入后卡片显示 Add to Trip 按钮 */
  onAddToTrip?: (poi: PoiItem) => void;
  /** 正在加入行程的地点 id（按钮 loading 态） */
  addingToTripId?: string | null;
  /** 已收藏地点 id 集合（驱动星标实心/空心；未传入则收藏按钮不渲染） */
  favouriteIds?: Set<string>;
  /** 切换地点收藏状态（收藏/取消收藏）；与 favouriteIds 一同传入后卡片显示星标收藏按钮 */
  onToggleFavourite?: (poi: PoiItem) => void;
}

/** 品质徽章等级 → 展示文案（纯 UI 展示映射） */
const BADGE_LABEL: Record<NonNullable<PoiItem["qualityBadge"]>, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
};

export default function officalQualityRate({
  pois,
  isLoading,
  onAddToTrip,
  addingToTripId,
  favouriteIds,
  onToggleFavourite,
}: OfficalQualityRateProps) {
  /** 当前页码（分页为纯前端 UI 行为，状态内聚于组件） */
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(pois.length / PAGE_SIZE));
  /** 数据/筛选变化时回到第一页 */
  useEffect(() => {
    setPage(1);
  }, [pois]);
  const safePage = Math.min(page, totalPages);
  const visiblePois = pois.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  /** 当前页地点图片（懒加载：统一图片链路——Wikivoyage → Wikipedia 条目配图 → Commons Geosearch 按经纬度 → Mapillary 兜底；翻页/重复浏览走缓存） */
  const images = usePlaceImages(visiblePois);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">
          Recommended Places
        </h2>
        {totalPages > 1 && (
          <span className="text-sm text-gray-500">
            Page {safePage} / {totalPages}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
        {isLoading && (
          <p className="col-span-full text-sm text-gray-400">
            Loading places...
          </p>
        )}
        {!isLoading && pois.length === 0 && (
          <p className="col-span-full text-sm text-gray-500">
            No officially rated places available yet.
          </p>
        )}
        {visiblePois.map((poi) => (
          <a
            key={poi.id}
            href={googleMapsUrl(`${poi.name} ${poi.formatted ?? ""}`.trim())}
            target="_blank"
            rel="noopener noreferrer"
            className="group block overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
          >
            {/* 带质量徽章的图片区（真实图片；加载中/无图时以 Icon 表示无图） */}
            <div className="relative m-2 h-48 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
              {images[poi.id]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={safeHttpUrl(images[poi.id].url)}
                  alt={poi.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageOff
                  className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-gray-400"
                  aria-label="No image available"
                />
              )}
              {/* 作者与许可署名（开源协议合规：CC BY-SA 等要求保留原作者与许可声明） */}
              {images[poi.id]?.url && (
                <PlaceImageAttribution
                  attribution={images[poi.id].attribution}
                />
              )}
              {/* 官方品质评级徽章（仅匹配 Offical Quality Rating 的地点展示） */}
              {poi.qualityBadge && (
                <div className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-gray-800/90 px-3 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-sm">
                  <svg
                    className="text-accent-400 h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  {BADGE_LABEL[poi.qualityBadge]}
                </div>
              )}
              {/* 收藏按钮（星标）：阻止冒泡避免触发卡片外链跳转；状态由 favouriteIds 驱动 */}
              {favouriteIds && onToggleFavourite && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavourite(poi);
                  }}
                  aria-label={
                    favouriteIds.has(poi.id)
                      ? `Remove ${poi.name} from favourites`
                      : `Add ${poi.name} to favourites`
                  }
                  className={`absolute top-3 right-3 cursor-pointer rounded-full p-2 shadow-sm backdrop-blur-sm transition-all duration-150 active:scale-90 ${
                    favouriteIds.has(poi.id)
                      ? "bg-primary-500 text-white hover:bg-primary-500/90"
                      : "bg-white/90 text-gray-500 hover:bg-white hover:text-primary-500"
                  }`}
                >
                  <StarIcon
                    filled={favouriteIds.has(poi.id)}
                    className="h-5 w-5"
                  />
                </button>
              )}
            </div>

            <div className="p-6 pt-4">
              <div className="mb-2 flex items-start justify-between">
                <h3 className="text-xl font-semibold text-gray-800">
                  {poi.name}
                </h3>
              </div>

              {/* 地址、电话与评级有效期（数据来自 Offical Quality Rating） */}
              <div className="mb-4 space-y-2 text-sm text-gray-500">
                {poi.formatted && (
                  <p className="line-clamp-2">{poi.formatted}</p>
                )}
                {poi.phone && (
                  <p className="flex items-center gap-1">📞 {poi.phone}</p>
                )}
                {poi.ratingDuration && (
                  <p className="flex items-center gap-1">
                    📅 Valid {poi.ratingDuration}
                  </p>
                )}
              </div>

              {/* 加入行程（跨模块：模块 02，经 RoutePlannerBridge 真实导入接口） */}
              {onAddToTrip && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddToTrip(poi);
                  }}
                  disabled={addingToTripId === poi.id}
                  aria-label={`Add ${poi.name} to trip`}
                  className="bg-primary-500/10 text-primary-500 hover:bg-primary-500 mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition-all duration-150 hover:text-white active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingToTripId === poi.id
                    ? "Adding to trip…"
                    : "+ Add to Trip"}
                </button>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* 分页控件（每页 PAGE_SIZE 条，前端分页） */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`h-9 w-9 cursor-pointer rounded-full text-sm font-semibold transition-all duration-150 active:scale-[0.9] ${
                n === safePage
                  ? "bg-primary-500 text-white shadow-md hover:shadow-[0_12px_32px_rgba(255,107,107,0.25)]"
                  : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
