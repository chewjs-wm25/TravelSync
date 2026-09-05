"use client";

/**
 * Home Page — TravelSync 首页（Presentation Layer，跨模块落地页）
 *
 * 数据真实性原则（本页不展示任何硬编码内容数据或虚构信息）：
 *   - 官方认证地点：读取本应用维护的官方旅游质量评级名录（Platinum / Gold /
 *     Silver，含地址 / 电话 / 评级有效期），经模块 03 真实 API 在线获取；
 *   - 州与联邦直辖区：读取真实州列表 API（13 州 + 3 联邦直辖区）；
 *   - 地点图片：走模块 03 统一图片链路（Wikivoyage → Wikipedia → Wikimedia
 *     Commons Geosearch → Mapillary，马来西亚限定），展示开源署名；
 *   - 搜索联想：读取真实州/直辖区建议 API；
 *   - 其余为页面 UI 文案与可核验的产品能力描述，不含编造的评分、价格、
 *     里程、用户评价或演示数据。
 * 加载失败时展示空态/重试，绝不回退到伪造数据。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  ExternalLink,
  Globe,
  ImageOff,
  MapPin,
  Phone,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  Users,
} from "lucide-react";

import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";
import {
  getStateSuggestions,
  type StateSuggestion,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/api/stateSuggestionApi";
import { discoveryService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";
import type {
  PoiItem,
  StateInfo,
} from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/types";
import { usePlaceImages } from "@/app/03_Destination_Discovery_&_Inspiration/hooks";
import PlaceImageAttribution from "@/app/03_Destination_Discovery_&_Inspiration/placeImageAttribution";
import { safeHttpUrl } from "@/app/03_Destination_Discovery_&_Inspiration/safeUrl";
import {
  googleMapsUrl,
  MODULE_03_HOME,
} from "@/app/03_Destination_Discovery_&_Inspiration/routes";

// ---------------------------------------------------------------------------
// 路由常量（真实模块页面，与 Header/Sidebar 一致）
// ---------------------------------------------------------------------------
const ACCOUNT_ROUTE = "/01_User_&_Account_Management";
const TRIPS_ROUTE = "/02_Trip_Planning_&_Itinerary_Management";
const LOGISTICS_ROUTE = "/04_Travel_Logistics_&_Map_Route_Planning";
const COLLAB_ROUTE = "/05_Collaboration_&_Shared_Planning";

/** 首页展示的官方认证地点数量（与模块 03 每行 4 张 × 2 行一致） */
const RATED_PLACES_LIMIT = 8;

// ---------------------------------------------------------------------------
// 五大功能模块入口（真实能力描述，可对照各模块页面核验）
// ---------------------------------------------------------------------------
interface ModuleEntry {
  num: string;
  title: string;
  tagline: string;
  description: string;
  points: string[];
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

const MODULES: ModuleEntry[] = [
  {
    num: "01",
    title: "Accounts",
    tagline: "Sign in & keep your data yours",
    description:
      "Log in or register, restore your session, and manage your profile, security and account settings.",
    points: [
      "Sign in / register with session restore",
      "Profile, security & account settings",
    ],
    href: ACCOUNT_ROUTE,
    icon: UserRound,
  },
  {
    num: "02",
    title: "Trip Planning",
    tagline: "Day-by-day itineraries",
    description:
      "Create trips, structure each day with activities and notes, and add places you discovered — all scoped to Malaysia.",
    points: [
      "Create & edit trips with daily schedules",
      "Attach notes and reminders to items",
    ],
    href: TRIPS_ROUTE,
    icon: CalendarDays,
  },
  {
    num: "03",
    title: "Destination Discovery",
    tagline: "Real places, official quality ratings",
    description:
      "Search real places across Malaysia, browse officially quality-rated listings (Platinum / Gold / Silver), and open photos with open-license attribution.",
    points: [
      "Real map-based place search (Malaysia only)",
      "Official quality-rated place register with validity dates",
    ],
    href: MODULE_03_HOME,
    icon: Compass,
  },
  {
    num: "04",
    title: "Route & Logistics",
    tagline: "Map it before you drive it",
    description:
      "Plot stops on an interactive map, estimate driving legs, and compare vehicle or public-transport profiles for your journey.",
    points: [
      "Interactive map with driving-time estimates",
      "Vehicle profiles & public-transport legs",
    ],
    href: LOGISTICS_ROUTE,
    icon: Route,
  },
  {
    num: "05",
    title: "Group Co-Planning",
    tagline: "Plan together, stay in sync",
    description:
      "Invite members with Owner / Editor / Viewer roles, receive live updates over Server-Sent Events, and export plans as JSON, CSV or .ics calendar files.",
    points: [
      "Invites with role-based access (Owner / Editor / Viewer)",
      "Live updates (Server-Sent Events) & JSON / CSV / .ics export",
    ],
    href: COLLAB_ROUTE,
    icon: Users,
  },
];

// ---------------------------------------------------------------------------
// 品质徽章展示（等级来自官方评级数据字段，非推断）
// ---------------------------------------------------------------------------
type QualityBadge = NonNullable<PoiItem["qualityBadge"]>;

const BADGE_STYLES: Record<
  QualityBadge,
  { label: string; chip: string; dot: string }
> = {
  platinum: {
    label: "Platinum",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "text-rose-400",
  },
  gold: {
    label: "Gold",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "text-amber-400",
  },
  silver: {
    label: "Silver",
    chip: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "text-gray-400",
  },
};

/** 在线统计：官方评级数据中 Platinum / Gold / Silver 各自数量（真实计数） */
function countBadges(pois: PoiItem[]): Record<QualityBadge, number> {
  const counts: Record<QualityBadge, number> = {
    platinum: 0,
    gold: 0,
    silver: 0,
  };
  for (const poi of pois) {
    if (poi.qualityBadge) counts[poi.qualityBadge] += 1;
  }
  return counts;
}

function QualityBadgeChip({ level }: { level: QualityBadge }) {
  const style = BADGE_STYLES[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.chip}`}
    >
      <Star size={10} fill="currentColor" className={style.dot} />
      {style.label}
    </span>
  );
}

/** 加载骨架（数据到达前的占位，不展示任何数字） */
function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-base ${className}`}
    >
      <div className="h-44 animate-pulse bg-gray-100" />
      <div className="space-y-2.5 p-5">
        <div className="h-3 w-3/4 animate-pulse rounded-md bg-gray-100" />
        <div className="h-3 w-1/2 animate-pulse rounded-md bg-gray-100" />
        <div className="h-3 w-2/3 animate-pulse rounded-md bg-gray-100" />
      </div>
    </div>
  );
}

/** 数据加载失败提示（含重试） */
function LoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center shadow-base">
      <p className="text-sm text-gray-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition duration-150 hover:bg-gray-50 hover:text-gray-800 active:scale-95"
      >
        <RefreshCw size={13} />
        Try again
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 页面
// ---------------------------------------------------------------------------
export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();

  // ---- 搜索联想（真实州/联邦直辖区建议 API）----
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StateSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ---- 官方认证地点（真实数据：本应用维护的官方评级名录）----
  const [ratedStatus, setRatedStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [ratedPois, setRatedPois] = useState<PoiItem[]>([]);

  // ---- 州与联邦直辖区（真实州列表）----
  const [stateStatus, setStateStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [states, setStates] = useState<StateInfo[]>([]);

  /** 官方认证地点 / 州数据加载触发（初始与重试共用；setState 全部在异步回调中） */
  const [ratedReload, setRatedReload] = useState(0);
  const [stateReload, setStateReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    discoveryService
      .getQualityRatedPois()
      .then((pois) => {
        if (cancelled) return;
        setRatedPois(pois);
        setRatedStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setRatedPois([]);
        setRatedStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [ratedReload]);

  useEffect(() => {
    let cancelled = false;
    discoveryService
      .getStateInfo()
      .then((list) => {
        if (cancelled) return;
        setStates(list);
        setStateStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStates([]);
        setStateStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [stateReload]);

  /** 重试（事件处理器内允许同步置回加载态） */
  const retryLoad = () => {
    setRatedStatus("loading");
    setStateStatus("loading");
    setRatedReload((t) => t + 1);
    setStateReload((t) => t + 1);
  };

  // ---- 搜索联想请求（真实 API，仅当有输入）----
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    let isCurrent = true;
    getStateSuggestions(trimmed)
      .then((results) => {
        if (isCurrent) {
          setSuggestions(results);
          setShowSuggestions(true);
        }
      })
      .catch(() => {
        if (isCurrent) setSuggestions([]);
      });
    return () => {
      isCurrent = false;
    };
  }, [searchQuery]);

  // ---- 点击搜索框外部时收起建议下拉 ----
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** 规划入口（保留现状：未登录 → 登录/账户页；已登录 → 行程管理页） */
  const handleStartPlanning = () => {
    if (!isLoggedIn) {
      router.push(ACCOUNT_ROUTE);
      return;
    }
    router.push(TRIPS_ROUTE);
  };

  /** 提交搜索（回车 / 搜索按钮）→ 规划流程（与建议点击行为一致） */
  const handleSearchSubmit = () => {
    setShowSuggestions(false);
    handleStartPlanning();
  };

  // ---- 首页展示的官方认证地点（前 N 条，其余在模块 03 查看）----
  const visibleRated = useMemo(() => ratedPois.slice(0, RATED_PLACES_LIMIT), [
    ratedPois,
  ]);

  // ---- 官方认证地点 / 州卡片图片（模块 03 统一图片链路 + 缓存）----
  const ratedImages = usePlaceImages(visibleRated);
  /** 州卡图片入参映射：usePlaceImages 以 id 为键，StateInfo 的键为 stateId */
  const statePlaceItems = useMemo(
    () =>
      states.map((state) => ({
        id: state.stateId,
        name: state.name,
        lat: state.lat,
        lon: state.lon,
      })),
    [states]
  );
  const stateImages = usePlaceImages(statePlaceItems);

  // ---- 真实徽章分布统计（供加载成功时展示，失败/为空则隐藏）----
  const badgeCounts = useMemo(() => countBadges(ratedPois), [ratedPois]);
  const hasRatedData = ratedStatus === "ready" && ratedPois.length > 0;
  const hasStateData = stateStatus === "ready" && states.length > 0;

  const ratedError = ratedStatus === "error";
  const ratedEmpty = ratedStatus === "ready" && ratedPois.length === 0;
  const ratedLoading = ratedStatus === "loading";
  const stateError = stateStatus === "error";
  const stateEmpty = stateStatus === "ready" && states.length === 0;
  const stateLoading = stateStatus === "loading";

  return (
    <div className="space-y-12 pb-12 sm:space-y-16">
      {/* ═══════════════════════════════════════════════
          1. HERO — 品牌定位 + 搜索（真实建议）+ 真实在线统计
          ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-gradient-to-b from-white via-gray-50/40 to-white px-6 py-12 text-center shadow-base sm:px-10 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
            <Globe size={13} className="text-secondary-500" />
            <span>
              Malaysia&apos;s 13 states &amp; 3 federal territories — one
              travel planner
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-800 sm:text-5xl sm:leading-[1.15]">
            Plan your Malaysia journey,{" "}
            <span className="text-primary-500">all in one place</span>.
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-500 sm:text-lg">
            Build day-by-day itineraries, discover officially quality-rated
            places, estimate driving routes, and co-plan with your group in
            real time.
          </p>

          {/* 搜索（联想数据来自真实州/联邦直辖区建议 API） */}
          <div
            ref={searchContainerRef}
            className="relative mx-auto mt-4 max-w-xl text-left"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchSubmit();
              }}
              className="flex flex-col gap-2 rounded-full border border-gray-200 bg-white p-2 shadow-lg shadow-gray-200/50 transition sm:flex-row sm:items-center"
            >
              <div className="flex flex-1 items-center gap-3 px-4 py-2 text-gray-800">
                <Search size={19} className="flex-shrink-0 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (!val.trim()) {
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Where do you want to go? (e.g. Penang, Langkawi...)"
                  className="w-full bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 outline-none"
                  aria-label="Search destinations or states"
                />
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition duration-150 hover:bg-primary-500/90 active:scale-95 sm:w-auto"
              >
                <span>Start planning</span>
                <ArrowRight size={15} />
              </button>
            </form>

            {/* 真实建议下拉（州/联邦直辖区） */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="animate-fade-in absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 text-gray-800 shadow-xl">
                <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  States &amp; Federal Territories
                </p>
                {suggestions.map((item) => (
                  <button
                    key={item.stateId}
                    type="button"
                    onClick={() => {
                      setSearchQuery(item.name);
                      setShowSuggestions(false);
                      handleStartPlanning();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition duration-150 hover:bg-gray-50 active:scale-[0.98]"
                  >
                    <MapPin size={15} className="flex-shrink-0 text-primary-500" />
                    <span className="font-medium text-gray-800">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 真实在线统计（仅数据加载成功时展示；加载中骨架，失败隐藏） */}
          <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-4 border-t border-gray-100 pt-6">
            {hasRatedData && (
              <div className="space-y-0.5">
                <p className="text-2xl font-bold text-gray-800">
                  {ratedPois.length}
                </p>
                <p className="text-xs text-gray-500">Quality-rated places</p>
              </div>
            )}
            {hasStateData && (
              <div className="space-y-0.5">
                <p className="text-2xl font-bold text-gray-800">
                  {states.length}
                </p>
                <p className="text-xs text-gray-500">
                  States &amp; territories
                </p>
              </div>
            )}
            {hasRatedData &&
              (["platinum", "gold", "silver"] as QualityBadge[]).map(
                (level) => (
                  <div key={level} className="space-y-0.5">
                    <p className="text-2xl font-bold text-gray-800">
                      {badgeCounts[level]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {BADGE_STYLES[level].label}
                    </p>
                  </div>
                )
              )}
            {ratedLoading && (
              <>
                <div className="space-y-1.5">
                  <div className="h-7 w-12 animate-pulse rounded-lg bg-gray-100" />
                  <div className="h-3 w-20 animate-pulse rounded-md bg-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-7 w-12 animate-pulse rounded-lg bg-gray-100" />
                  <div className="h-3 w-20 animate-pulse rounded-md bg-gray-100" />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          2. 五大功能模块（真实能力入口）
          ═══════════════════════════════════════════════ */}
      <section className="space-y-5">
        <div className="max-w-2xl space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
            The Toolkit
          </p>
          <h2 className="text-2xl font-semibold text-gray-800 sm:text-3xl">
            Five modules, one journey
          </h2>
          <p className="text-sm text-gray-500">
            Every module below is a working part of TravelSync — open it and
            start using the real tools.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.num}
                href={mod.href}
                className="group flex flex-col justify-between rounded-3xl border border-gray-200/80 bg-white p-6 shadow-base transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-hover"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-secondary-500 shadow-sm transition duration-300 group-hover:bg-secondary-500 group-hover:text-white">
                      <Icon size={20} />
                    </div>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      Module {mod.num}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-gray-800">
                      {mod.title}
                    </h3>
                    <p className="text-xs font-medium text-secondary-500">
                      {mod.tagline}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-500">
                    {mod.description}
                  </p>
                  <ul className="space-y-1.5 pt-1">
                    {mod.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-xs font-medium text-gray-600"
                      >
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 transition-colors duration-150 group-hover:text-primary-500">
                  Open module
                  <ArrowRight
                    size={13}
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          3. 官方认证地点（真实数据：官方评级名录）
          ═══════════════════════════════════════════════ */}
      <section className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500">
              Quality Rated Places
            </p>
            <h2 className="text-2xl font-semibold text-gray-800 sm:text-3xl">
              Officially quality-rated places
            </h2>
            <p className="text-sm text-gray-500">
              These entries come from the app&apos;s maintained official
              quality-rating register — name, address, contact and the rating
              period shown are the register&apos;s own fields, not editorial
              guesses.
            </p>
          </div>
          {hasRatedData && (
            <Link
              href={MODULE_03_HOME}
              className="inline-flex flex-shrink-0 items-center gap-1.5 text-xs font-semibold text-gray-700 transition-colors duration-150 hover:text-primary-500"
            >
              View all in Destination Discovery
              <ExternalLink size={12} />
            </Link>
          )}
        </div>

        {ratedLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {ratedError && (
          <LoadError
            message="We couldn't load the quality-rated places right now."
            onRetry={retryLoad}
          />
        )}

        {ratedEmpty && (
          <div className="rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center shadow-base">
            <p className="text-sm text-gray-500">
              No officially rated places available yet.
            </p>
            <Link
              href={MODULE_03_HOME}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-500"
            >
              Open Destination Discovery
              <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {hasRatedData && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {visibleRated.map((poi) => {
              const image = ratedImages[poi.id];
              const imageUrl = image?.url ? safeHttpUrl(image.url) : "";
              return (
                <a
                  key={poi.id}
                  href={googleMapsUrl(`${poi.name} ${poi.formatted ?? ""}`.trim())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-base transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-hover"
                  aria-label={`Open ${poi.name} on Google Maps`}
                >
                  {/* 图片区（真实图片；无图以 Icon 占位）+ 开源署名 */}
                  <div className="relative m-2 h-40 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={poi.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff
                          size={28}
                          className="text-gray-300"
                          aria-label="No image available"
                        />
                      </div>
                    )}
                    {imageUrl && (
                      <PlaceImageAttribution attribution={image.attribution} />
                    )}
                    {poi.qualityBadge && (
                      <div className="absolute left-2.5 top-2.5">
                        <QualityBadgeChip level={poi.qualityBadge} />
                      </div>
                    )}
                  </div>

                  {/* 登记信息（全部来自评级名录字段） */}
                  <div className="flex flex-1 flex-col gap-2 p-5 pt-3">
                    <h3 className="text-sm font-semibold leading-snug text-gray-800">
                      {poi.name}
                    </h3>
                    {poi.formatted && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
                        {poi.formatted}
                      </p>
                    )}
                    <div className="mt-auto space-y-1.5 border-t border-gray-100 pt-2.5 text-xs text-gray-500">
                      {poi.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone size={12} className="text-gray-400" />
                          <span className="truncate">{poi.phone}</span>
                        </p>
                      )}
                      {poi.ratingDuration && (
                        <p className="flex items-center gap-1.5">
                          <ShieldCheck
                            size={12}
                            className="flex-shrink-0 text-secondary-500"
                          />
                          <span className="truncate">
                            Valid {poi.ratingDuration}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════
          4. 按州探索（真实州/联邦直辖区列表）
          ═══════════════════════════════════════════════ */}
      <section className="space-y-5">
        <div className="max-w-2xl space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary-500">
            Explore by State
          </p>
          <h2 className="text-2xl font-semibold text-gray-800 sm:text-3xl">
            All of Malaysia&apos;s states &amp; territories
          </h2>
          <p className="text-sm text-gray-500">
            Pick any state or federal territory to start planning there.
          </p>
        </div>

        {stateLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {stateError && (
          <LoadError
            message="We couldn't load the list of states right now."
            onRetry={retryLoad}
          />
        )}

        {stateEmpty && (
          <div className="rounded-3xl border border-gray-200 bg-white px-6 py-10 text-center shadow-base">
            <p className="text-sm text-gray-500">
              The list of Malaysian states is not available right now.
            </p>
          </div>
        )}

        {hasStateData && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {states.map((state) => {
              const image = stateImages[state.stateId];
              const imageUrl = image?.url ? safeHttpUrl(image.url) : "";
              return (
                <button
                  key={state.stateId}
                  type="button"
                  onClick={() => handleStartPlanning()}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white text-left shadow-base transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-hover active:translate-y-0 active:scale-[0.99]"
                  aria-label={`Start planning in ${state.name}`}
                >
                  <div className="relative m-2 h-24 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-100 to-gray-50">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt={state.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <MapPin
                          size={20}
                          className="text-gray-300 transition duration-300 group-hover:text-secondary-500"
                          aria-label="No image available"
                        />
                      </div>
                    )}
                    {imageUrl && (
                      <PlaceImageAttribution attribution={image.attribution} />
                    )}
                  </div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {state.name}
                    </h3>
                    <ArrowRight
                      size={14}
                      className="text-gray-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary-500"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════
          5. 底部 CTA + 数据披露
          ═══════════════════════════════════════════════ */}
      <section className="rounded-3xl border border-gray-200/80 bg-gradient-to-b from-gray-50 to-white px-8 py-12 text-center shadow-base md:py-14">
        <div className="mx-auto max-w-xl space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-800 sm:text-3xl">
            Ready to plan your next Malaysian trip?
          </h2>
          <p className="text-sm leading-relaxed text-gray-500">
            Create your itinerary, invite friends or family, and explore
            Malaysia with TravelSync.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleStartPlanning()}
              className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition duration-150 hover:bg-primary-500/90 active:scale-95"
            >
              Start planning
              <ArrowRight size={14} />
            </button>
            <Link
              href={MODULE_03_HOME}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition duration-150 hover:bg-gray-50 active:scale-95"
            >
              <Compass size={14} />
              Browse destinations
            </Link>
          </div>
          <p className="mx-auto max-w-lg pt-2 text-[11px] leading-relaxed text-gray-400">
            About this page&apos;s data: quality-rated places and the state list
            come from this app&apos;s maintained data; place photos come from
            Wikimedia / Mapillary under open licenses (attribution shown where
            required); search suggestions come from the app&apos;s state list.
            No ratings, prices, distances or user reviews on this page are
            fabricated.
          </p>
        </div>
      </section>
    </div>
  );
}
