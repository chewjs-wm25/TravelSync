"use client";
// 搜索结果页：真实 Geoapify 搜索结果 + 多维筛选（体验类型 / 场景 / 州属 / 品质评级）
// 数据来源：Business Logic Layer（discoveryService.searchPlaceDetails 拉取 +
//           filterPlaceDetails 对已加载结果做纯前端过滤，不重复请求）
// 筛选状态：搜索词 q 与筛选参数（exp / scene / state / quality）存于 URL——
//   - 页面挂载/URL 变化时从 URL 恢复筛选状态（可分享、刷新保留）；
//   - 用户操作筛选或修改搜索词时即时同步 URL（replace，不产生历史记录）；
//   - 搜索词变化（Enter 提交）触发重新搜索，筛选变化只做本地过滤。
// 交互：点击地点卡片 → 跳转地点详情页（携带 placeId + 搜索词）

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchAndFilter from "../searchAndFilter";
import { discoveryService } from "../../../business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";
import type {
  PlaceDetail,
  SearchFilters,
  activeType,
} from "../../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";
import { MODULE_03_HOME, placeDetailPath, searchPagePath } from "../routes";
import { StarIcon } from "../favouriteList";
import { useFavorites, usePlaceImages, useSearchAndFilter } from "../hooks";
import PlaceImageAttribution from "../placeImageAttribution";
import { safeHttpUrl } from "../safeUrl";
import { ImageOff } from "lucide-react";

/** 品质徽章等级 → 展示文案（纯 UI 展示映射） */
const BADGE_LABEL: Record<NonNullable<PlaceDetail["qualityBadge"]>, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
};

/** 从 URL 解析场景参数（非法值 → "all"） */
function parseSceneParam(value: string | null): activeType {
  return value === "indoor" || value === "outdoor" || value === "all"
    ? value
    : "all";
}

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ---- URL 参数（唯一真相：搜索词 q + 筛选参数） ----
  const q = searchParams.get("q") ?? "";
  const exp = searchParams.get("exp") ?? "";
  const scene = parseSceneParam(searchParams.get("scene"));
  const state = searchParams.get("state") ?? "";
  const hasQuery = q.trim().length > 0;

  // ---- 搜索与筛选状态（初始从 URL 恢复；SearchAndFilter 组件受控） ----
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
  } = useSearchAndFilter({
    query: q,
    experienceType: exp,
    scene,
    state,
  });

  /** 是否有活跃筛选（本地状态派生：筛选即时生效，不依赖 URL 同步时序） */
  const hasActiveFilters = Boolean(
    selectedExperienceType || selectedState || activeTab !== "all"
  );

  // URL → 本地状态（地址栏编辑 / 浏览器前进后退 / 从详情页返回时恢复）
  useEffect(() => {
    setSearchQuery(q);
    setSelectedExperienceType(exp);
    setActiveTab(scene);
    setSelectedState(state);
  }, [
    q,
    exp,
    scene,
    state,
    setSearchQuery,
    setSelectedExperienceType,
    setActiveTab,
    setSelectedState,
  ]);

  // 本地状态 → URL（replace：筛选即时可分享/刷新保留，不产生历史记录）。
  // 搜索词用 URL 中已提交的 q（而非输入中的 searchQuery）：搜索框输入过程
  // 不写入 URL，避免每次击键触发重新搜索消耗 Geoapify 免费配额；
  // 提交搜索（Enter）由 SearchAndFilter 的 goToSearchPage push 新 URL 完成。
  useEffect(() => {
    const next = searchPagePath(q, {
      experienceType: selectedExperienceType || undefined,
      scene: activeTab,
      state: selectedState || undefined,
    });
    if (window.location.pathname + window.location.search !== next) {
      router.replace(next);
    }
  }, [
    q,
    selectedExperienceType,
    activeTab,
    selectedState,
    router,
  ]);

  // ---- 搜索结果（完整结果集；筛选在展示层纯前端过滤，不重复请求） ----
  const [allPlaces, setAllPlaces] = useState<PlaceDetail[]>([]);
  /** 已加载结果的搜索词（与当前 q 不一致即为请求进行中，派生 loading） */
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLoading = hasQuery && loadedQuery !== q;
  const { savedItems, toggleItem } = useFavorites();
  /** 已收藏地点 id 集合（合并 isFavourite 展示状态） */
  const favouriteIds = useMemo(
    () => new Set(savedItems.map((item) => item.id)),
    [savedItems]
  );

  useEffect(() => {
    if (!hasQuery) return;
    let cancelled = false;
    discoveryService
      .searchPlaceDetails(q)
      .then((result) => {
        if (!cancelled) {
          setAllPlaces(result);
          setError(null);
          setLoadedQuery(q);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Search failed. Please check your connection and try again."
          );
          setAllPlaces([]);
          setLoadedQuery(q);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [q, hasQuery]);

  // ---- 多维筛选（BL 层纯计算：场景 / 体验类型 / 州属） ----
  const filters = useMemo<SearchFilters>(
    () => ({
      query: searchQuery,
      experienceType: selectedExperienceType,
      scene: activeTab,
      state: selectedState,
    }),
    [searchQuery, selectedExperienceType, activeTab, selectedState]
  );

  const places = useMemo(
    () => discoveryService.filterPlaceDetails(allPlaces, filters),
    [allPlaces, filters]
  );

  /** 地点图片（懒加载：统一链路——Wikivoyage → Wikipedia 条目配图 → Wikimedia Commons Geosearch → Mapillary 兜底，马来西亚限定；无图以 Icon 表示） */
  const images = usePlaceImages(places);

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
          className="cursor-pointer rounded-full bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-500 transition-all duration-150 hover:bg-gray-200 hover:text-gray-700 active:scale-[0.94]"
        >
          ← Back to Explore
        </Link>
      </div>

      {/* 搜索与多维筛选（与主页同组件；搜索词 Enter 跳转带筛选的新 URL，筛选变化本地过滤） */}
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

      {/* 加载态 */}
      {isLoading && hasQuery && (
        <p className="text-sm text-gray-400">Loading places…</p>
      )}

      {/* 错误态 */}
      {!isLoading && error && hasQuery && (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <p className="text-base text-gray-800">{error}</p>
          <p className="mt-1 text-sm text-gray-500">
            Please try again in a moment.
          </p>
        </div>
      )}

      {/* 空态 / 无查询词提示（区分"无结果"与"筛选导致空"） */}
      {(!hasQuery || (!isLoading && !error && places.length === 0)) && (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <p className="text-base text-gray-800">
            {!hasQuery
              ? "Enter a search term to find places in Malaysia."
              : hasActiveFilters
                ? "No places match the selected filters."
                : `No results found for “${q.trim()}”`}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {!hasQuery
              ? "Use the search bar above, then press Enter."
              : hasActiveFilters
                ? "Try adjusting the filters or search for a different place."
                : "Try a different keyword, e.g. “Batu Caves” or “Penang”."}
          </p>
        </div>
      )}

      {/* 结果网格（整卡可点击 → 地点详情页） */}
      {!isLoading && !error && hasQuery && places.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {places.map((place) => (
            <Link
              key={place.placeId}
              href={placeDetailPath(place.placeId, q)}
              className="group block overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
            >
              {/* 图片区（真实地点图片；加载中/无图时以 Icon 表示无图） */}
              <div className="relative m-2 h-40 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-primary-500/20 via-secondary-500/20 to-accent-400/30">
                {images[place.id]?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={safeHttpUrl(images[place.id].url)}
                    alt={place.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {/* 作者与许可署名（开源协议合规：CC BY-SA 等要求保留原作者与许可声明） */}
                {images[place.id]?.url && (
                  <PlaceImageAttribution
                    attribution={images[place.id].attribution}
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
                  className={`absolute top-3 right-3 cursor-pointer rounded-full p-2 shadow-sm backdrop-blur-sm transition-all duration-150 active:scale-90 ${
                    favouriteIds.has(place.id)
                      ? "bg-primary-500 text-white hover:bg-primary-500/90"
                      : "bg-white/90 text-gray-500 hover:bg-white hover:text-primary-500"
                  }`}
                >
                  <StarIcon
                    filled={favouriteIds.has(place.id)}
                    className="h-5 w-5"
                  />
                </button>
                {!images[place.id]?.url && (
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
                  {place.state && (
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                      {place.state}
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
