"use client";

import { useEffect, useRef, useState } from "react";

import { ItineraryItemCard, type ItineraryItem } from "./ItineraryItemCard";
import {
  getLocalSuggestions,
  type LocalSuggestion,
} from "../api/localSuggestionApi";
import { generateRoute } from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/moduleAPI";
import type { Stop } from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/moduleAPI";

type LocalSuggestionItem = LocalSuggestion;

export type DayItinerary = {
  id: string;
  title: string;
  date: string;
  note?: string | null;
  isCollapsed?: boolean;
  items: ItineraryItem[];
};

// In DayItineraryCard.tsx
type DayItineraryCardProps = {
  day: DayItinerary;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelectSuggestion?: (suggestion?: {
    placeId: string;
    formatted: string;
    name?: string;
    imageUrl?: string;
    lat?: number;
    lon?: number;
  }) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void | Promise<void>;
  onDeleteDay: () => void;
  onAddDayBefore: (dayId: string) => void;
  onAddDayAfter: (dayId: string) => void;
  onToggleCollapse: (collapseValue?: boolean) => void;
  onToggleItemEdit: (itemId: string) => void;
  // FIX: Change startTime and endTime to start_time and end_time
  onSaveItem: (
    itemId: string,
    payload: {
      name: string;
      note: string;
      position?: number;
      start_time?: string;
      end_time?: string;
    }
  ) => void | Promise<void>;
  onSaveNote: (note: string) => Promise<boolean> | boolean;
  onEditDay: (title: string, date: string) => void;
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  const parsed = new Date(`${year}-${month}-${day}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function DayItineraryCard({
  day,
  searchValue,
  onSearchChange,
  onSelectSuggestion,
  onAddItem,
  onDeleteItem,
  onDeleteDay,
  onAddDayBefore,
  onAddDayAfter,
  onToggleCollapse,
  onToggleItemEdit,
  onSaveItem,
  onSaveNote,
  onEditDay,
}: DayItineraryCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(day.title);
  const [draftDate, setDraftDate] = useState(day.date);
  const [draftNote, setDraftNote] = useState(day.note ?? "");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [suggestions, setSuggestions] = useState<LocalSuggestionItem[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  // Route segments: key = "fromId->toId", value = summary or null (unavailable)
  type RouteSegment = { distanceKm: number; timeMinutes: number } | null;
  const [routeSegments, setRouteSegments] = useState<Record<string, RouteSegment>>({});
  const [loadingSegmentKeys, setLoadingSegmentKeys] = useState<Set<string>>(new Set());

  // Recalculate all connectors whenever the item list changes (add or delete)
  useEffect(() => {
    if (day.items.length < 2) {
      setRouteSegments({});
      setLoadingSegmentKeys(new Set());
      return;
    }

    let cancelled = false;

    const calculateSegments = async () => {
      for (let i = 0; i < day.items.length - 1; i++) {
        if (cancelled) break;

        const from = day.items[i]!;
        const to = day.items[i + 1]!;
        const key = `${from.id}->${to.id}`;

        // Skip pairs without coordinates
        if (
          from.lat == null || from.lon == null ||
          to.lat == null || to.lon == null
        ) {
          if (!cancelled) {
            setRouteSegments((prev) => ({ ...prev, [key]: null }));
          }
          continue;
        }

        // Mark as loading
        if (!cancelled) {
          setLoadingSegmentKeys((prev) => new Set(prev).add(key));
        }

        try {
          const fromStop: Stop = { id: from.id, name: from.name, lat: from.lat, lng: from.lon };
          const toStop: Stop = { id: to.id, name: to.name, lat: to.lat, lng: to.lon };
          console.log(from.lat, from.lon, to.lat, to.lon)
          const result = await generateRoute(fromStop, toStop, 'car', 'fastest');

          if (!cancelled) {
            setRouteSegments((prev) => ({
              ...prev,
              [key]: result.success
                ? { distanceKm: result.summary.distanceKm, timeMinutes: result.summary.timeMinutes }
                : null,
            }));
          }
        } catch {
          if (!cancelled) {
            setRouteSegments((prev) => ({ ...prev, [key]: null }));
          }
        } finally {
          if (!cancelled) {
            setLoadingSegmentKeys((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
          }
        }
      }
    };

    void calculateSegments();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.items.map((item) => item.id).join(",")]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }

      if (
        searchContainerRef.current &&
        event.target instanceof Node &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOpenNoteEditor = () => {
    setDraftNote(day.note ?? "");
    setIsEditingNote(true);
  };

  useEffect(() => {
    const trimmedValue = searchValue.trim();
    if (!trimmedValue) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      onSelectSuggestion?.(undefined);
      return;
    }

    void getLocalSuggestions(trimmedValue).then((nextSuggestions) => {
      setSuggestions(nextSuggestions);
      setIsSuggestionsOpen(nextSuggestions.length > 0);
    });
  }, [searchValue, onSelectSuggestion]);

  const handleSuggestionSelect = (suggestion: LocalSuggestionItem) => {
    const formatted = suggestion.value || suggestion.formatted || suggestion.name || "";
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    onSearchChange(formatted);
    onSelectSuggestion?.({
      placeId: suggestion.id,
      formatted,
      name: suggestion.name,
      imageUrl: suggestion.imageUrl,
      lat: suggestion.lat,
      lon: suggestion.lon,
    });
    inputRef.current?.focus();
  };

  const handleSaveNote = async (nextNote: string) => {
    setIsSavingNote(true);

    try {
      const wasSaved = await onSaveNote(nextNote);
      if (wasSaved) {
        setIsEditingNote(false);
        setDraftNote(nextNote);
      }
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-gray-50/50 p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-800">{day.title}</h3>
          <div className="mt-1 text-xs font-semibold tracking-[0.18em] text-[#ff6b6b] uppercase">
            {formatDate(day.date)}
          </div>
        </div>

        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((previous) => !previous)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-2xs hover:bg-gray-100"
            aria-label="Itinerary Card Options"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute top-9 right-0 z-20 w-40 rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setDraftTitle(day.title);
                  setDraftDate(day.date);
                  setIsEditing(true);
                  setIsDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <svg
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5 3.5 3.5L12.5 16.5 9 13zm-5 5h4l8.5-8.5-4-4L5 14v4z"
                  />
                </svg>
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddDayBefore(day.id);
                  setIsDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <span className="font-bold">+</span> Add Day Before
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddDayAfter(day.id);
                  setIsDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <span className="font-bold">+</span> Add Day After
              </button>
              <hr className="my-1 border-gray-100" />

              {day.isCollapsed ? (
                <button
                  type="button"
                  onClick={() => {
                    onToggleCollapse(false);
                    setIsDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  Expand
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onToggleCollapse(true);
                    setIsDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  Collapse
                </button>
              )}
              <hr className="my-1 border-gray-100" />
              <button
                type="button"
                onClick={() => {
                  const shouldDelete = window.confirm(
                    `Delete "${day.title}"? This action cannot be undone.`
                  );

                  if (!shouldDelete) {
                    setIsDropdownOpen(false);
                    return;
                  }

                  onDeleteDay();
                  setIsDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <svg
                  className="h-4 w-4 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="border-primary-500/20 mt-3 space-y-3 rounded-xl border bg-white p-3 shadow-sm">
          <label className="block space-y-1 text-xs font-semibold text-gray-700">
            <span>Title</span>
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              className="focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 outline-none focus:ring-2"
            />
          </label>
          <label className="block space-y-1 text-xs font-semibold text-gray-700">
            <span>Date</span>
            <input
              type="date"
              value={draftDate}
              onChange={(event) => setDraftDate(event.target.value)}
              className="focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 outline-none focus:ring-2"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                onEditDay(draftTitle, draftDate);
              }}
              className="bg-primary-500 hover:bg-primary-500/90 rounded-lg px-3 py-2 text-xs font-semibold text-white"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white/70 p-3">
          {isEditingNote ? (
            <div className="space-y-3">
              <label className="block space-y-1 text-xs font-semibold text-gray-700">
                <span>Itinerary Note</span>
                <textarea
                  rows={4}
                  value={draftNote}
                  onChange={(event) => setDraftNote(event.target.value)}
                  placeholder="Add reminders or day-specific context"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 outline-none focus:border-[#ff6b6b] focus:ring-2 focus:ring-[#ff6b6b]/20"
                  disabled={isSavingNote}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSavingNote) {
                      setDraftNote(day.note ?? "");
                      setIsEditingNote(false);
                    }
                  }}
                  disabled={isSavingNote}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveNote(draftNote);
                  }}
                  disabled={isSavingNote}
                  className="rounded-lg bg-[#ff6b6b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#ff5252] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSavingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </div>
          ) : day.note ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-[#ff6b6b] uppercase">
                  Itinerary Note
                </p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-gray-700">
                  {day.note}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleOpenNoteEditor}
                  className="text-right text-xs font-medium text-[#ff6b6b] hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveNote("");
                  }}
                  disabled={isSavingNote}
                  className="text-right text-xs font-medium text-red-500 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOpenNoteEditor}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#ff6b6b] hover:underline"
            >
              <span className="text-base leading-none">+</span>
              Add Itinerary Note
            </button>
          )}
        </div>
      )}

      {!day.isCollapsed && !isEditing && (
        <>
          <div className="my-4 space-y-3">
            {day.items.length === 0 ? (
              <div className="py-6 text-center text-xs font-medium text-gray-400">
                No items found
              </div>
            ) : (
              day.items.map((item, index) => {
                const previousItem = index > 0 ? day.items[index - 1] : undefined;
                const previousEndTime = previousItem?.end_time;
                const segmentKey = previousItem ? `${previousItem.id}->${item.id}` : null;
                const isSegmentLoading = segmentKey ? loadingSegmentKeys.has(segmentKey) : false;
                const segment = segmentKey ? routeSegments[segmentKey] : undefined;

                return (
                  <div key={item.id}>
                    {segmentKey && (
                      <div className="flex items-center gap-2 py-1 px-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                        <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-medium shadow-sm">
                          {isSegmentLoading ? (
                            <>
                              <svg className="h-3 w-3 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                              </svg>
                              <span className="text-gray-400">Calculating…</span>
                            </>
                          ) : segment ? (
                            <>
                              <svg className="h-3 w-3 text-[#ff6b6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
                              </svg>
                              <span className="text-gray-600">
                                {segment.distanceKm.toFixed(1)} km
                              </span>
                              <span className="text-gray-300">·</span>
                              <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-gray-600">
                                {segment.timeMinutes < 60
                                  ? `${Math.round(segment.timeMinutes)} min`
                                  : `${Math.floor(segment.timeMinutes / 60)}h ${Math.round(segment.timeMinutes % 60)}min`}
                              </span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
                              </svg>
                              <span className="text-gray-400">No route data</span>
                            </>
                          )}
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                      </div>
                    )}
                    <ItineraryItemCard
                      item={item}
                      previousEndTime={previousEndTime}
                      onDelete={() => onDeleteItem(item.id)}
                      onToggleEdit={() => onToggleItemEdit(item.id)}
                      onSaveItem={(payload) => onSaveItem(item.id, payload)}
                    />
                  </div>
                );
              })
            )}

          </div>

          <div className="mt-2 border-t border-gray-200/60 pt-2">
            <div className="relative flex items-center">
              <div ref={searchContainerRef} className="relative w-full">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Add a place"
                  value={searchValue}
                  onChange={(event) => {
                    onSearchChange(event.target.value);
                    onSelectSuggestion?.(undefined);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && searchValue.trim()) {
                      onAddItem();
                    }
                  }}
                  className="focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-10 pl-4 text-xs text-gray-800 shadow-2xs focus:ring-2 focus:outline-none"
                />

                {isSuggestionsOpen && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-9 top-full z-30 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white text-left text-xs shadow-lg">
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion.id}
                        onClick={() => {
                          handleSuggestionSelect(suggestion);
                        }}
                        className="cursor-pointer px-3 py-2 hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-800">{suggestion.name}</div>
                        <div className="text-gray-500">{suggestion.formatted}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={onAddItem}
                disabled={!searchValue.trim()}
                className="bg-primary-500 hover:bg-primary-500/90 absolute right-2 flex h-7 w-7 items-center justify-center rounded-lg text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-300"
                aria-label="Add location"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
