"use client";
// AddToTripPicker.tsx — Module 03 "加入行程"（→ Module 02）目标选择弹窗
//
// 交互闭环：用户在 Recommended Places 卡片 / 收藏夹抽屉条目点击
// "+ Add to Trip" 后打开本弹窗：
//   1. 未登录 → 提示登录并引导到登录页（写入行程归属当前用户，未登录不可选）；
//   2. 已登录 → 列出当前用户已创建的旅行（listTripsAction，模块 02 只读
//      server action——不改模块 02，先例同模块 05 SharedTripPlanEditor）；
//   3. 选中旅行 → 懒加载该旅行已持久化的行程日期（listItinerariesAction）；
//   4. 选中行程日期 → "Add to Trip"：经 addToTripService.addToTripToItinerary
//      （BL：登录校验 + 坐标解析补齐 + RoutePlannerBridge 目标注入 + 调用模块 02
//      真实导入接口）完成导入；成功回调 onAdded 供父级 toast，失败在弹窗内展示。
//
// 结构说明：外层组件仅负责挂载判断；每次打开（item 从 null → 非 null）都会以
// 全新 key 挂载内层会话组件 AddToTripPickerDialog——所有交互状态以内层
// useState 初始值开始，天然随每次打开重置，无需在 effect 中同步清空状态。
//
// 数据方向：Presentation → BL（AddToTripService）→ 模块 02 导入端点；
//          旅行/行程日期列表为模块 02 只读 server action（Presentation 直接调用，
//          与模块 05 既有跨模块复用方式一致）。

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/app/Admin_Panel/authUser";
import { listTripsAction } from "@/app/02_Trip_Planning_&_Itinerary_Management/api/tripApi";
import { listItinerariesAction } from "@/app/02_Trip_Planning_&_Itinerary_Management/api/itineraryApi";
import { addToTripService } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/AddToTripService";
import type { AddToTripImportItem } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

/** 目标地点候选（父级传入；坐标缺失时由 BL 解析补齐） */
export interface AddToTripCandidate {
  /** 地点 id（收藏条目 id / POI id，展示用） */
  id?: string;
  /** 模块 03 地点标识（Geoapify place_id / json-{jsonId} / wikidata:...） */
  placeId?: string | null;
  name: string;
  thumbnailUrl?: string;
  experienceType?: string;
  lat?: number | null;
  lon?: number | null;
}

/** 父级成功回调信息（父级据此展示 toast：加入了哪个旅行 / 哪天） */
export interface AddToTripSuccessInfo {
  placeName: string;
  tripName: string;
  dayTitle: string;
  importedCount: number;
}

/** 模块 02 只读 server action 返回的行类型（避免引入模块 02 的类型依赖） */
type TripRow = Awaited<ReturnType<typeof listTripsAction>>[number];
type ItineraryRow = Awaited<ReturnType<typeof listItinerariesAction>>[number];

/** 将候选地点归一为导入条目（缺省字段补空串，坐标保持可空由 BL 解析） */
function toImportItem(candidate: AddToTripCandidate): AddToTripImportItem {
  return {
    id: candidate.id ?? "",
    placeId: candidate.placeId ?? "",
    name: candidate.name,
    thumbnailUrl: candidate.thumbnailUrl ?? "",
    experienceType: candidate.experienceType ?? "",
    lat: candidate.lat ?? null,
    lon: candidate.lon ?? null,
  };
}

/** 行程日期 yyyy-mm-dd → 展示文本（如 "12 Sep 2026"）；空值原样返回 */
function formatDayDate(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

/** 旅行日期区间展示（如 "10 Sep – 12 Sep 2026"；缺日期时省略） */
function formatTripRange(trip: TripRow): string {
  const start = formatDayDate(trip.start_date);
  const end = formatDayDate(trip.end_date);
  if (start && end) return `${start} – ${end}`;
  return start || end || "No date range";
}

const MODULE_02_HOME = "/02_Trip_Planning_&_Itinerary_Management";

export default function AddToTripPicker({
  item,
  onClose,
  onAdded,
}: {
  item: AddToTripCandidate | null;
  onClose: () => void;
  onAdded?: (info: AddToTripSuccessInfo) => void;
}) {
  // 仅负责挂载判断：每次打开都以全新会话挂载内层，交互状态天然重置
  if (!item) return null;
  return (
    <AddToTripPickerDialog
      key={`${item.id ?? "place"}-${item.name}`}
      item={item}
      onClose={onClose}
      onAdded={onAdded}
    />
  );
}

/** 弹窗会话组件：挂载即初始态；异步加载/提交均在回调中 setState */
function AddToTripPickerDialog({
  item,
  onClose,
  onAdded,
}: {
  item: AddToTripCandidate;
  onClose: () => void;
  onAdded?: (info: AddToTripSuccessInfo) => void;
}) {
  const { isLoggedIn, user } = useAuthStore();

  // 旅行列表：null = 加载中；[] = 空；非 null = 已加载
  const [trips, setTrips] = useState<TripRow[] | null>(null);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  // 行程日期列表：null = 加载中/未选择；[] = 该旅行暂无行程日期
  const [itineraries, setItineraries] = useState<ItineraryRow[] | null>(null);
  const [itinerariesError, setItinerariesError] = useState<string | null>(null);
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadTripsKey, setLoadTripsKey] = useState(0); // 失败重试

  const isLoginRequired =
    !isLoggedIn || !user?.id || typeof user.id !== "string" || user.id === "";

  // 会话挂载时加载当前用户旅行列表（失败可经 loadTripsKey 重试）
  useEffect(() => {
    if (isLoginRequired) return;
    let cancelled = false;
    listTripsAction(user.id)
      .then((list) => {
        if (!cancelled) setTrips(list);
      })
      .catch(() => {
        if (!cancelled) setTripsError("Failed to load your trips");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTripsKey]);

  /** 选中旅行 → 懒加载其行程日期 */
  const handleSelectTrip = useCallback((tripId: string) => {
    setSelectedTripId(tripId);
    setSelectedItineraryId(null);
    setItineraries(null);
    setItinerariesError(null);
    listItinerariesAction(tripId)
      .then((list) => setItineraries(list))
      .catch(() => {
        setItineraries([]);
        setItinerariesError("Failed to load itinerary days");
      });
  }, []);

  /** 确认加入行程：经 BL 编排真实导入模块 02 指定行程日期 */
  const handleConfirm = useCallback(async () => {
    if (!selectedItineraryId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await addToTripService.addToTripToItinerary(
        toImportItem(item),
        selectedItineraryId
      );
      if (!result.success) {
        setSubmitError(
          result.message ??
            `Failed to add ${item.name} to trip. Please try again.`
        );
        return;
      }
      const selectedTrip =
        trips?.find((trip) => trip.trip_id === selectedTripId) ?? null;
      const selectedItinerary =
        itineraries?.find((day) => day.itinerary_id === selectedItineraryId) ??
        null;
      const dayTitle = selectedItinerary
        ? [selectedItinerary.title, formatDayDate(selectedItinerary.date)]
            .filter(Boolean)
            .join(" · ")
        : "";
      onAdded?.({
        placeName: item.name,
        tripName: selectedTrip?.trip_name ?? "",
        dayTitle,
        importedCount: result.pushedCount,
      });
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to add to trip"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    item,
    selectedItineraryId,
    selectedTripId,
    trips,
    itineraries,
    onAdded,
    onClose,
  ]);

  const tripHref = selectedTripId
    ? `${MODULE_02_HOME}/${encodeURIComponent(selectedTripId)}`
    : MODULE_02_HOME;
  const hasTripsLoaded = !isLoginRequired && trips !== null && trips.length > 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* 遮罩：点击空白关闭 */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Add ${item.name} to trip`}
        className="relative z-10 max-h-[85vh] w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
      >
        {/* 头部 */}
        <div className="flex items-start justify-between border-b border-gray-200 bg-gray-100 px-6 py-5">
          <div className="pr-4">
            <h2 className="text-lg font-bold text-gray-800">Add to Trip</h2>
            <p className="line-clamp-2 mt-1 text-sm text-gray-500">
              {item.name}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1.5 text-gray-500 transition-all duration-150 hover:bg-gray-200 hover:text-gray-800 active:scale-90"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(85vh-9rem)] space-y-4 overflow-y-auto p-6">
          {isLoginRequired ? (
            /* 未登录：行程归属当前用户，先引导登录 */
            <div className="space-y-3 text-center">
              <p className="text-sm font-medium text-gray-600">
                Please log in first to add places to your trip.
              </p>
              <a
                href="/01_User_&_Account_Management"
                className="bg-primary-500 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#ff5252] active:scale-95"
              >
                Go to Sign in
              </a>
            </div>
          ) : tripsError ? (
            /* 旅行列表加载失败：可重试 */
            <div className="space-y-3 text-center">
              <p className="text-sm font-medium text-gray-500">
                {tripsError}
              </p>
              <button
                type="button"
                onClick={() => setLoadTripsKey((key) => key + 1)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : trips === null ? (
            <div className="space-y-3">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
                />
              ))}
              <p className="pt-1 text-center text-xs text-gray-400">
                Loading your trips…
              </p>
            </div>
          ) : trips.length === 0 ? (
            /* 无旅行：引导去模块 02 创建 */
            <div className="space-y-3 text-center">
              <p className="text-sm font-medium text-gray-600">
                You don&apos;t have any trips yet. Create a trip in Trip Planner
                first.
              </p>
              <a
                href={MODULE_02_HOME}
                className="bg-primary-500 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#ff5252] active:scale-95"
              >
                Go to Trip Planner
              </a>
            </div>
          ) : (
            <>
              {/* 第 1 步：选择旅行 */}
              <div>
                <h3 className="mb-2 text-xs font-bold tracking-wide text-gray-400 uppercase">
                  1. Choose a trip
                </h3>
                <div className="space-y-2">
                  {trips.map((trip) => {
                    const isSelected = trip.trip_id === selectedTripId;
                    return (
                      <button
                        key={trip.trip_id}
                        type="button"
                        onClick={() => handleSelectTrip(trip.trip_id)}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-150 active:scale-[0.98] ${
                          isSelected
                            ? "border-primary-500 bg-primary-500/5 shadow-sm"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`flex-1 truncate text-sm font-semibold ${
                            isSelected ? "text-primary-500" : "text-gray-800"
                          }`}
                        >
                          {trip.trip_name}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatTripRange(trip)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 第 2 步：选择行程日期（选中旅行后懒加载） */}
              {selectedTripId && (
                <div>
                  <h3 className="mb-2 text-xs font-bold tracking-wide text-gray-400 uppercase">
                    2. Choose an itinerary day
                  </h3>
                  {itinerariesError ? (
                    <p className="text-sm font-medium text-gray-500">
                      {itinerariesError}
                    </p>
                  ) : itineraries === null ? (
                    <div className="space-y-2">
                      <div className="h-11 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
                      <p className="pt-1 text-center text-xs text-gray-400">
                        Loading itinerary days…
                      </p>
                    </div>
                  ) : itineraries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                      <p className="text-sm text-gray-500">
                        This trip has no itinerary days yet.
                      </p>
                      <a
                        href={tripHref}
                        className="bg-primary-500/10 text-primary-500 hover:bg-primary-500 mt-3 inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 hover:text-white active:scale-[0.96]"
                      >
                        Open trip in Trip Planner to add a day
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itineraries.map((day) => {
                        const isSelected =
                          day.itinerary_id === selectedItineraryId;
                        return (
                          <button
                            key={day.itinerary_id}
                            type="button"
                            onClick={() =>
                              setSelectedItineraryId(day.itinerary_id)
                            }
                            className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-150 active:scale-[0.98] ${
                              isSelected
                                ? "border-primary-500 bg-primary-500/5 shadow-sm"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <span
                              className={`flex-1 truncate text-sm font-semibold ${
                                isSelected
                                  ? "text-primary-500"
                                  : "text-gray-800"
                              }`}
                            >
                              {day.title}
                            </span>
                            <span className="shrink-0 text-xs text-gray-400">
                              {formatDayDate(day.date)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 弹窗内错误（坐标解析失败 / 服务端拒绝等），可重试 */}
          {submitError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {submitError}
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        {hasTripsLoaded && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                !selectedItineraryId ||
                isSubmitting ||
                itineraries === null ||
                itineraries.length === 0
              }
              className="bg-primary-500 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#ff5252] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Adding to trip…"
                : selectedItineraryId
                  ? "Add to Trip"
                  : "Choose an itinerary day first"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
