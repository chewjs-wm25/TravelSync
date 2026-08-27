"use client";

import { useEffect, useRef, useState } from "react";

import { ItineraryItemCard, type ItineraryItem } from "./ItineraryItemCard";

type LocalSuggestionItem = {
  placeId: string;
  name: string;
  formatted: string;
  imageUrl?: string;
  lat: number;
  lon: number;
};

const MALAYSIA_PLACE_SUGGESTIONS: LocalSuggestionItem[] = [
  { placeId: "local:kuala-lumpur", name: "Kuala Lumpur", formatted: "Kuala Lumpur, Malaysia", imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80", lat: 3.139, lon: 101.6869 },
  { placeId: "local:petronas-twin-towers", name: "Petronas Twin Towers", formatted: "Petronas Twin Towers, Kuala Lumpur, Malaysia", imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80", lat: 3.1579, lon: 101.7113 },
  { placeId: "local:batu-caves", name: "Batu Caves", formatted: "Batu Caves, Selangor, Malaysia", imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80", lat: 3.2378, lon: 101.6831 },
  { placeId: "local:penang", name: "Penang", formatted: "Penang, Malaysia", imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80", lat: 5.4141, lon: 100.3292 },
  { placeId: "local:georgetown", name: "George Town", formatted: "George Town, Penang, Malaysia", imageUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80", lat: 5.4141, lon: 100.3292 },
  { placeId: "local:langkawi", name: "Langkawi", formatted: "Langkawi, Kedah, Malaysia", imageUrl: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80", lat: 6.35, lon: 99.8 },
  { placeId: "local:melaka", name: "Melaka", formatted: "Melaka, Malaysia", imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80", lat: 2.1896, lon: 102.2501 },
  { placeId: "local:malacca", name: "Malacca", formatted: "Malacca, Malaysia", imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80", lat: 2.1896, lon: 102.2501 },
  { placeId: "local:cameron-highlands", name: "Cameron Highlands", formatted: "Cameron Highlands, Pahang, Malaysia", imageUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80", lat: 4.478, lon: 101.375 },
  { placeId: "local:kota-kinabalu", name: "Kota Kinabalu", formatted: "Kota Kinabalu, Sabah, Malaysia", imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80", lat: 5.9804, lon: 116.0735 },
  { placeId: "local:kuching", name: "Kuching", formatted: "Kuching, Sarawak, Malaysia", imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80", lat: 1.5536, lon: 110.3593 },
  { placeId: "local:johor-bahru", name: "Johor Bahru", formatted: "Johor Bahru, Johor, Malaysia", imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80", lat: 1.4927, lon: 103.7414 },
  { placeId: "local:perhentian-island", name: "Perhentian Island", formatted: "Perhentian Island, Terengganu, Malaysia", imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80", lat: 5.905, lon: 102.739 },
  { placeId: "local:gunung-mulu", name: "Gunung Mulu", formatted: "Gunung Mulu, Sarawak, Malaysia", imageUrl: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80", lat: 4.047, lon: 114.826 },
];

function buildLocalSuggestions(query: string): LocalSuggestionItem[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const normalized = trimmed.toLowerCase();
  return MALAYSIA_PLACE_SUGGESTIONS.filter(({ name, formatted }) => {
    const haystacks = [name, formatted];
    return haystacks.some((value) => value.toLowerCase().includes(normalized));
  }).slice(0, 6);
}

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
  /** Called when a user selects a suggestion for the itinerary item */
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

  // Suggestions stay local to module 02 so itinerary creation works even when
  // the external discovery endpoints are unavailable.
  const [suggestions, setSuggestions] = useState<LocalSuggestionItem[]>([]);
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

  useEffect(() => {
    const trimmedValue = searchValue.trim();
    if (!trimmedValue) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      onSelectSuggestion?.(undefined);
      return;
    }

    if (suggestionsTimer.current) {
      window.clearTimeout(suggestionsTimer.current);
    }

    suggestionsTimer.current = window.setTimeout(() => {
      const nextSuggestions = buildLocalSuggestions(trimmedValue);
      setSuggestions(nextSuggestions);
      setIsSuggestionsOpen(nextSuggestions.length > 0);
    }, 150);

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
                        onMouseDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={() => {
                          const formatted = s.formatted || s.name;
                          onSearchChange(formatted);
                          onSelectSuggestion?.({
                            placeId: s.placeId,
                            formatted,
                            name: s.name,
                            imageUrl: s.imageUrl,
                            lat: s.lat,
                            lon: s.lon,
                          });
                          setIsSuggestionsOpen(false);
                          inputRef.current?.focus();
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