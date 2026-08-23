"use client";

import { useEffect, useRef, useState } from "react";

import { ItineraryItemCard, type ItineraryItem } from "./ItineraryItemCard";
import type { SuggestionItem } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

export type DayItinerary = {
  id: string;
  title: string;
  date: string;
  note?: string | null;
  isCollapsed?: boolean;
  items: ItineraryItem[];
};

type DayItineraryCardProps = {
  day: DayItinerary;
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Called when a user selects a suggestion from module 03 */
  onSelectSuggestion?: (suggestion?: { placeId: string; formatted: string }) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void | Promise<void>;
  onDeleteDay: () => void;
  onAddDayBefore: (dayId: string) => void;
  onAddDayAfter: (dayId: string) => void;
  onToggleCollapse: (collapseValue?: boolean) => void;
  onToggleItemEdit: (itemId: string) => void;
  onSaveItem: (
    itemId: string,
    payload: { name: string; note: string; position?: number }
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Suggestions from module 03 (DiscoveryService)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const suggestionsTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }

      // close suggestions if click outside input area
      if (
        inputRef.current &&
        event.target instanceof Node &&
        !inputRef.current.contains(event.target as Node)
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

  // Stubbed suggestions (module 02 only). Avoids network calls to module 03 by
  // generating lightweight in-memory suggestion items based on the searchValue.
  useEffect(() => {
    const value = searchValue.trim();
    if (suggestionsTimer.current) {
      window.clearTimeout(suggestionsTimer.current);
      suggestionsTimer.current = null;
    }

    if (!value) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      // inform parent selection cleared
      onSelectSuggestion?.(undefined);
      return;
    }

    suggestionsTimer.current = window.setTimeout(() => {
      // Create up to 5 stub suggestions. SuggestionItem shape:
      // { placeId, name, formatted, lat, lon }
      const baseLat = 3.1390; // Kuala Lumpur base
      const baseLon = 101.6869;
      const states = [
        "Kuala Lumpur",
        "Selangor",
        "Penang",
        "Johor",
        "Kedah",
        "Perak",
        "Melaka",
      ];

      const stubs: SuggestionItem[] = Array.from({ length: 5 }).map((_, i) => {
        const idx = i % states.length;
        const lat = baseLat + (i + value.length % 3) * 0.01;
        const lon = baseLon + (i + value.length % 5) * 0.01;
        const name = `${value} ${i + 1}`;
        const formatted = `${name}, ${states[idx]}, Malaysia`;
        return {
          placeId: `stub:${value}:${i + 1}`,
          name,
          formatted,
          lat,
          lon,
        };
      });

      setSuggestions(stubs);
      setIsSuggestionsOpen(stubs.length > 0);
    }, 300) as unknown as number;

    return () => {
      if (suggestionsTimer.current) {
        window.clearTimeout(suggestionsTimer.current);
        suggestionsTimer.current = null;
      }
    };
  }, [searchValue, onSelectSuggestion]);

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
              day.items.map((item) => (
                <ItineraryItemCard
                  key={item.id}
                  item={item}
                  onDelete={() => onDeleteItem(item.id)}
                  onToggleEdit={() => onToggleItemEdit(item.id)}
                  onSaveItem={(payload) => onSaveItem(item.id, payload)}
                />
              ))
            )}
          </div>

          <div className="mt-2 border-t border-gray-200/60 pt-2">
            <div className="relative flex items-center">
              <div className="relative w-full">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Add a place"
                  value={searchValue}
                  onChange={(event) => {
                    onSearchChange(event.target.value);
                    // clear any previously selected suggestion when user types
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
                    {suggestions.map((s) => (
                      <li
                        key={s.placeId}
                        onClick={() => {
                          const formatted = s.formatted || s.name;
                          onSearchChange(formatted);
                          onSelectSuggestion?.({
                            placeId: s.placeId,
                            formatted,
                          });
                          setIsSuggestionsOpen(false);
                        }}
                        className="cursor-pointer px-3 py-2 hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-800">{s.name}</div>
                        <div className="text-gray-500">{s.formatted}</div>
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