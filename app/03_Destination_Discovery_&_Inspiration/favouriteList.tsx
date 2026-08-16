"use client";
//4. 收藏夹（Favourite List）区域
// 数据来源：Business Logic Layer（经 Presentation hooks 获取）

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useFavorites } from "./hooks";
import type { SavedItem } from "../../business_logic_layer/03_Destination_Discovery_&_Inspiration/types";
import { placeDetailPath } from "./routes";
import { ImageOff } from "lucide-react";

interface ChildProbs {
  isDrawerOpen: boolean;
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  typeOptions: string[];
  activeType: string;
  setActiveType: React.Dispatch<React.SetStateAction<string>>;
}

/** 星星图标（heroicons outline star） */
export function StarIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      ></path>
    </svg>
  );
}

export default function FavouriteList({
  isDrawerOpen,
  setIsDrawerOpen,
  typeOptions,
  activeType,
  setActiveType,
}: ChildProbs) {
  const router = useRouter();
  const {
    visibleItems,
    savedItemsCount,
    removeItem,
    addToTrip,
  } = useFavorites();
  const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
  const [tripToast, setTripToast] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  /** 收藏条目加入行程（经 stub 桥接；成功后本地 toast 反馈） */
  const handleAddToTrip = async (
    e: React.MouseEvent,
    item: SavedItem
  ) => {
    e.stopPropagation();
    setAddingToTripId(item.id);
    try {
      const result = await addToTrip(item);
      setTripToast({
        status: result.success ? "success" : "error",
        message: result.success
          ? `✓ ${item.name} added to your trip`
          : `Failed to add ${item.name} to trip`,
      });
    } catch {
      setTripToast({
        status: "error",
        message: `Failed to add ${item.name} to trip`,
      });
    } finally {
      setAddingToTripId(null);
      setTimeout(() => setTripToast(null), 3000);
    }
  };

  /** 移除收藏（阻止冒泡，避免触发条目跳转） */
  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeItem(id);
  };

  /** 点击条目 → 跳转地点详情页（以收藏名称作为搜索词重查） */
  const handleOpenPlace = (item: SavedItem) => {
    router.push(placeDetailPath(item.placeId, item.name));
  };

  return (
    <>
      {/* 悬浮切换按钮 */}
      {!isDrawerOpen && (
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="bg-primary-500 fixed right-8 bottom-8 z-40 flex cursor-pointer items-center gap-2 rounded-full px-6 py-3 text-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(255,107,107,0.15)] active:translate-y-0 active:scale-[0.95] active:shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
        >
          <StarIcon filled className="h-6 w-6" />
          <span className="font-semibold">Favourite List ({savedItemsCount})</span>
        </button>
      )}

      {/* 收藏夹抽屉 / 悬浮面板 */}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-full transform flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-96 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
            <StarIcon filled className="text-primary-500 h-6 w-6" />
            Favourite List
          </h2>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="cursor-pointer rounded-full p-2 text-gray-500 transition-all duration-150 hover:bg-gray-200 hover:text-gray-800 active:scale-90"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* 类型过滤器：自动读取收藏夹内条目的体验类型 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveType("All")}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.94] ${
                activeType === "All"
                  ? "bg-primary-500 text-white shadow-md hover:shadow-[0_12px_32px_rgba(255,107,107,0.25)]"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 active:bg-gray-300"
              }`}
            >
              All
            </button>
            {typeOptions.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.94] ${
                  activeType === type
                    ? "bg-primary-500 text-white shadow-md hover:shadow-[0_12px_32px_rgba(255,107,107,0.25)]"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 active:bg-gray-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* 已收藏地点列表（点击条目跳转地点详情页） */}
          {visibleItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenPlace(item)}
              className="flex cursor-pointer gap-4 rounded-2xl border border-gray-200 p-4 transition-all duration-150 hover:bg-gray-100 active:scale-[0.99] active:bg-gray-200"
            >
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-200">
                  <ImageOff
                    className="h-6 w-6 text-gray-400"
                    aria-label="No image available"
                  />
                </div>
              )}
              <div className="flex-1">
                <h4 className="line-clamp-1 text-base font-semibold text-gray-800">
                  {item.name}
                </h4>
                {item.experienceType && (
                  <span className="mt-1 inline-block rounded-md bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                    {item.experienceType}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end justify-between gap-2">
                <button
                  onClick={(e) => handleRemove(e, item.id)}
                  aria-label={`Remove ${item.name} from favourites`}
                  className="text-primary-500 cursor-pointer transition-all duration-150 hover:text-[#ef4444] active:scale-90"
                >
                  <StarIcon filled className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => handleAddToTrip(e, item)}
                  disabled={addingToTripId === item.id}
                  aria-label={`Add ${item.name} to trip`}
                  className="cursor-pointer rounded-full bg-primary-500/10 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-primary-500 transition-all duration-150 hover:bg-primary-500 hover:text-white active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingToTripId === item.id ? "Adding…" : "+ Add to Trip"}
                </button>
              </div>
            </div>
          ))}
          {visibleItems.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              No favourite places yet. Tap the star icon on any place to save
              it.
            </p>
          )}
        </div>

        {/* 加入行程反馈 toast */}
        {tripToast && (
          <div
            className={`fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg ${
              tripToast.status === "success" ? "bg-[#10b981]" : "bg-[#ef4444]"
            }`}
          >
            {tripToast.message}
          </div>
        )}
      </div>
    </>
  );
}
