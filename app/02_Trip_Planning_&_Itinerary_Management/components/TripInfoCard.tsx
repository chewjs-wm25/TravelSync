"use client";

import Link from "next/link";
import { useState } from "react";

type TripInfoCardProps = {
  tripName: string;
  startDate: string | null;
  endDate: string | null;
  ownerAvatar?: string;
  ownerName?: string;
  onSaveTripName?: (nextName: string) => Promise<boolean> | boolean;
};

export function TripInfoCard({
  tripName,
  startDate,
  endDate,
  ownerAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  ownerName = "Sarah Tan",
  onSaveTripName,
}: TripInfoCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(tripName);

  const hasDates = Boolean(startDate && endDate);

  const handleSaveTitle = async (nextValue: string) => {
    const normalized = nextValue.trim();
    if (!normalized) {
      setTitle(tripName);
      setIsEditingTitle(false);
      return;
    }

    setTitle(normalized);
    setIsEditingTitle(false);

    if (!onSaveTripName) {
      return;
    }

    const wasSaved = await onSaveTripName(normalized);
    if (!wasSaved) {
      setTitle(tripName);
    }
  };

  return (
    <>
      <div>
        <Link
          href="/02_Trip_Planning_&_Itinerary_Management"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
        >
          <svg
            className="h-4 w-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </Link>
      </div>

      <div className="relative flex min-h-40 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div>
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                void handleSaveTitle(title);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSaveTitle(title);
                }
              }}
              className="border-primary-500 focus:ring-primary-500/20 w-full rounded-xl border px-3 py-1.5 text-2xl font-bold text-gray-900 outline-none focus:ring-2"
            />
          ) : (
            <h1
              onClick={() => {
                setTitle(tripName);
                setIsEditingTitle(true);
              }}
              title="Click to edit title"
              className="group hover:text-primary-500 cursor-pointer text-2xl font-bold tracking-tight text-gray-900"
            >
              {tripName}
              <span className="ml-2 inline-block text-xs font-normal text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                (click to edit)
              </span>
            </h1>
          )}
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <svg
              className="text-primary-500 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>
              {hasDates
                ? `${startDate ?? "No travel dates set"} - ${endDate ?? "No travel dates set"}`
                : "No travel dates set"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <img
              src={ownerAvatar}
              alt={ownerName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
            />
          </div>
        </div>
      </div>
    </>
  );
}
