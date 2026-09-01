"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import Image from "next/image";
import { collabApi } from "@/api_layer/05_Collaboration_&_Shared_Planning/collab";
import { useCollabStore } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";
import type { TripLikeInfo } from "@/api_layer/05_Collaboration_&_Shared_Planning/types";

interface LikePlanButtonProps {
  tripId?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLikersPopover?: boolean;
}

export default function LikePlanButton({
  tripId,
  className = "",
  size = "md",
  showLikersPopover = false,
}: LikePlanButtonProps) {
  const { isLoggedIn, user } = useAuthStore();
  const currentUserId = useCollabStore((s) => s.currentUserId);
  const activeTripId = useCollabStore((s) => s.activeTripId);
  const storeTrip = useCollabStore((s) =>
    s.trips.find((t) => t.tripId === (tripId || s.activeTripId))
  );

  const targetTripId = tripId || activeTripId || storeTrip?.tripId || "trip_langkawi";
  const effectiveUserId = user?.id || currentUserId;

  const [likesData, setLikesData] = useState<TripLikeInfo>({
    count: storeTrip?.likes?.count ?? 0,
    likedByMe: storeTrip?.likes?.likedByMe ?? false,
    likers: storeTrip?.likes?.likers ?? [],
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync from CollabStore if store has newer data
  useEffect(() => {
    if (storeTrip?.likes) {
      setLikesData(storeTrip.likes);
    }
  }, [storeTrip?.likes]);

  // Fetch likes on mount and when targetTripId or user changes
  const fetchLikes = useCallback(async () => {
    if (!targetTripId) return;
    try {
      const res = await collabApi.getLikes(targetTripId, effectiveUserId);
      if (res.success) {
        setLikesData({
          count: res.count,
          likedByMe: res.likedByMe,
          likers: res.likers ?? [],
        });
      }
    } catch {
      // ignore
    }
  }, [targetTripId, effectiveUserId]);

  useEffect(() => {
    void fetchLikes();
  }, [fetchLikes]);

  // Close popover on outside click
  useEffect(() => {
    if (!showLikersPopover) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLikersPopover]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      if (showLikersPopover) {
        setIsPopoverOpen(true);
      }
      return;
    }

    if (!targetTripId || isLoading) return;

    // 1. Instant Optimistic UI Update
    const nextLiked = !likesData.likedByMe;
    const nextCount = nextLiked
      ? likesData.count + 1
      : Math.max(0, likesData.count - 1);
    const myLiker = {
      id: effectiveUserId || "me",
      name: user?.name || "You",
      avatar: user?.avatarUrl || "",
    };
    const nextLikers = nextLiked
      ? [myLiker, ...likesData.likers.filter((l) => l.id !== effectiveUserId)]
      : likesData.likers.filter((l) => l.id !== effectiveUserId);

    setLikesData({
      count: nextCount,
      likedByMe: nextLiked,
      likers: nextLikers,
    });

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);

    // 2. Call API & Sync
    setIsLoading(true);
    try {
      const res = await collabApi.toggleLike(targetTripId, effectiveUserId);
      if (res.success) {
        setLikesData({
          count: res.count,
          likedByMe: res.liked,
          likers: res.likers ?? [],
        });

        // Sync with CollabStore if active
        useCollabStore.setState((state) => ({
          trips: state.trips.map((t) =>
            t.tripId === targetTripId
              ? {
                  ...t,
                  likes: {
                    count: res.count,
                    likedByMe: res.liked,
                    likers: res.likers,
                  },
                }
              : t
          ),
        }));
      }
    } catch {
      // Re-fetch on failure to restore truth
      void fetchLikes();
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-3 text-base gap-2.5",
  };

  const heartSizes = {
    sm: 14,
    md: 18,
    lg: 20,
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`group inline-flex items-center rounded-xl font-semibold transition-all duration-200 active:scale-95 cursor-pointer select-none ${
          sizeClasses[size]
        } ${
          likesData.likedByMe
            ? "border border-rose-200 bg-rose-50 text-rose-600 shadow-sm hover:bg-rose-100"
            : "border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-rose-200 hover:bg-rose-50/40 hover:text-rose-600"
        }`}
        title={likesData.likedByMe ? "Unlike trip plan" : "Like this trip plan"}
      >
        <Heart
          size={heartSizes[size]}
          className={`transition-transform duration-300 ${
            likesData.likedByMe
              ? "fill-rose-500 text-rose-500"
              : "text-gray-400 group-hover:text-rose-500"
          } ${isAnimating ? "scale-125" : "scale-100"}`}
        />
        <span>{likesData.count}</span>
        <span className="hidden sm:inline font-normal text-xs text-gray-500 group-hover:text-rose-600">
          {likesData.count === 1 ? "Like" : "Likes"}
        </span>
      </button>

      {/* ── Likers Popover (Only when explicitly enabled, e.g. in workspace header) ── */}
      {showLikersPopover && isPopoverOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 z-50 w-64 max-w-[calc(100vw-32px)] rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
              <Heart size={14} className="fill-rose-500 text-rose-500" />
              <span>
                {likesData.count} {likesData.count === 1 ? "Person" : "People"} Liked
              </span>
            </div>
            {likesData.likedByMe && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                You liked
              </span>
            )}
          </div>

          {!isLoggedIn ? (
            <div className="pt-3 text-center">
              <p className="text-xs text-gray-500">Sign in to like and support this trip plan!</p>
              <a
                href="/01_User_&_Account_Management"
                className="mt-2 block rounded-lg bg-primary-500 py-1.5 text-xs font-semibold text-white hover:bg-primary-500/90"
              >
                Sign In
              </a>
            </div>
          ) : likesData.likers.length === 0 ? (
            <div className="pt-3 text-center text-xs text-gray-400">
              Be the first collaborator to like this trip plan!
            </div>
          ) : (
            <div className="mt-2.5 max-h-48 space-y-2 overflow-y-auto pr-1">
              {likesData.likers.map((liker) => (
                <div key={liker.id} className="flex items-center gap-2.5">
                  {liker.avatar ? (
                    <div className="relative h-6 w-6 overflow-hidden rounded-full border border-gray-100">
                      <Image
                        src={liker.avatar}
                        alt={liker.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-600">
                      {liker.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate text-xs font-medium text-gray-700">
                    {liker.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
