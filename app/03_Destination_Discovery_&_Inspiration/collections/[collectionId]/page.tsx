"use client";
// 合辑详情页：展示 Wikivoyage 自动发现主题的成员目的地（导语/代表图/
// Star 徽章）与附近灵感推荐
// 数据来源：Business Logic Layer（inspirationsService，经 Presentation hooks）
// 交互：成员卡 "Search in TravelSync" 跳模块搜索页（闭环）、"Read guide"
//       外链 Wikivoyage 完整指南；有坐标成员可切换查看附近目的地

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Compass, ExternalLink, ImageOff, Search, Star } from "lucide-react";
import { useCollectionDetail, useNearbyInspirations } from "../../hooks";
import {
  MODULE_03_HOME,
  searchPagePath,
  WIKIVOYAGE_HOME,
} from "../../routes";

/** 距离格式化：<1000m 显示米，否则保留一位小数的公里 */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 幂等 URL 解码路由参数：兼容未编码 / 单次编码 / 双编码形态
 * （不同环境下动态段参数可能保留编码或已解码）。
 */
function normalizeRouteParam(raw: string): string {
  let value = raw;
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value;
}

function CollectionDetailView() {
  const params = useParams<{ collectionId: string }>();
  const collectionId = normalizeRouteParam(params.collectionId ?? "");
  const { detail, isLoading, error } = useCollectionDetail(collectionId);

  /** 当前查看附近推荐的成员（默认第一个有坐标成员） */
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const itemsWithCoords = useMemo(
    () =>
      (detail?.items ?? []).filter(
        (item) => typeof item.lat === "number" && typeof item.lon === "number"
      ),
    [detail]
  );
  const selectedItem =
    itemsWithCoords.find((item) => item.id === selectedItemId) ??
    itemsWithCoords[0];

  /** 附近灵感（数据源：Wikivoyage geosearch，马来西亚限定） */
  const { nearby, isLoading: nearbyLoading } = useNearbyInspirations(
    selectedItem?.lat,
    selectedItem?.lon
  );

  return (
    <div className="space-y-6">
      {/* 返回导航 */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={MODULE_03_HOME}
          className="cursor-pointer rounded-full bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-200 hover:text-gray-700 active:scale-[0.94]"
        >
          ← Back to Explore
        </Link>
      </div>

      {/* 加载态 */}
      {isLoading && <p className="text-sm text-gray-400">Loading collection…</p>}

      {/* 错误态（含限流：提示刷新重试） */}
      {!isLoading && error && (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <p className="text-base text-gray-800">
            Failed to load this collection.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Please check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-primary-500 hover:bg-primary-500/90 mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.94]"
          >
            Try again
          </button>
        </div>
      )}

      {/* 未找到 */}
      {!isLoading && !error && !detail && (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <p className="text-base text-gray-800">
            This collection could not be found.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            It may have been removed or the link may be outdated.
          </p>
        </div>
      )}

      {!isLoading && !error && detail && (
        <>
          {/* Hero（封面大图 + 渐变遮罩 + 标题/副标题/统计） */}
          <div className="relative min-h-64 overflow-hidden rounded-3xl border border-gray-200 shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
            {detail.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.imageUrl}
                alt={detail.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-secondary-500/20 to-accent-400/30"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-800/70 via-gray-800/30 to-transparent"></div>
            <div className="relative z-10 p-8">
              <h1 className="text-4xl font-bold text-white">{detail.title}</h1>
              {detail.subtitle && (
                <p className="mt-2 max-w-2xl text-base text-white/90">
                  {detail.subtitle}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-gray-800">
                  {detail.memberCount} place
                  {detail.memberCount === 1 ? "" : "s"}
                </span>
                {detail.starCount > 0 && (
                  <span className="flex items-center gap-1 rounded-md bg-accent-400/90 px-2 py-1 text-xs font-semibold text-gray-800">
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                    {detail.starCount} Wikivoyage Star
                    {detail.starCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 成员目的地网格 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {detail.items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
              >
                {/* 图片区（真实 Wikivoyage 缩略图；无图时以 Icon 表示） */}
                <div className="relative m-2 h-40 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff
                      className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-gray-400"
                      aria-label="No image available"
                    />
                  )}
                  {/* Wikivoyage Star 徽章（社区质量评级，与官方品质徽章区分） */}
                  {item.isStar && (
                    <span className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-accent-400/95 px-2 py-1 text-xs font-semibold text-gray-800 shadow-md">
                      <Star
                        className="h-3 w-3 fill-current"
                        aria-hidden="true"
                      />
                      Wikivoyage Star
                    </span>
                  )}
                  {/* 附近灵感切换（仅对有坐标成员显示） */}
                  {typeof item.lat === "number" &&
                    typeof item.lon === "number" && (
                      <button
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        aria-label={`Show nearby destinations of ${item.title}`}
                        className={`absolute right-3 bottom-3 flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm transition-all duration-150 active:scale-[0.94] ${
                          selectedItem?.id === item.id
                            ? "bg-primary-500 text-white hover:bg-primary-500/90"
                            : "bg-white/90 text-gray-500 hover:bg-white hover:text-primary-500"
                        }`}
                      >
                        <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                        Nearby
                      </button>
                    )}
                </div>

                <div className="p-6 pt-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {item.title}
                  </h3>
                  {item.extract && (
                    <p className="mt-2 line-clamp-3 text-sm text-gray-500">
                      {item.extract}
                    </p>
                  )}
                  {/* 行动闭环：站内搜索（可继续收藏/加行程） + 完整指南外链 */}
                  <div className="mt-4 flex flex-col gap-2">
                    <Link
                      href={searchPagePath(item.title)}
                      className="bg-primary-500 hover:bg-primary-500/90 flex cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.94]"
                    >
                      <Search className="h-4 w-4" aria-hidden="true" />
                      Search in TravelSync
                    </Link>
                    <a
                      href={item.wikivoyageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.94]"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Read guide
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 附近灵感（geosearch 附近目的地，按距离排序） */}
          {selectedItem && (
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-gray-800">
                Nearby {selectedItem.title}
              </h2>
              {nearbyLoading && (
                <p className="text-sm text-gray-400">
                  Loading nearby destinations...
                </p>
              )}
              {!nearbyLoading && nearby.length === 0 && (
                <p className="text-sm text-gray-500">
                  No nearby destinations found.
                </p>
              )}
              <div className="flex snap-x gap-4 overflow-x-auto pb-2 md:gap-6">
                {nearby.map((place) => (
                  <a
                    key={place.title}
                    href={place.wikivoyageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-[220px] max-w-[220px] snap-start overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
                  >
                    <div className="relative m-2 h-28 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                      {place.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={place.imageUrl}
                          alt={place.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff
                          className="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-gray-400"
                          aria-label="No image available"
                        />
                      )}
                      <span className="absolute top-2 right-2 rounded-md bg-gray-800/80 px-2 py-0.5 text-xs font-semibold text-white">
                        {formatDistance(place.distanceMeters)}
                      </span>
                    </div>
                    <div className="p-4 pt-2">
                      <h3 className="truncate text-sm font-semibold text-gray-800">
                        {place.title}
                      </h3>
                      {place.isStar && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-accent-400/20 px-2 py-0.5 text-xs font-semibold text-gray-800">
                          <Star
                            className="h-3 w-3 fill-current"
                            aria-hidden="true"
                          />
                          Star
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 来源署名（Wikivoyage 内容许可 CC BY-SA 4.0） */}
          <p className="text-xs text-gray-400">
            Content from{" "}
            <a
              href={WIKIVOYAGE_HOME}
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors duration-150 hover:text-secondary-500"
            >
              Wikivoyage
            </a>
            , licensed under CC BY-SA 4.0.
          </p>
        </>
      )}
    </div>
  );
}

export default function CollectionDetailPage() {
  return <CollectionDetailView />;
}
