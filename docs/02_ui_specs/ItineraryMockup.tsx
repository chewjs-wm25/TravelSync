"use client";

import React, { useState, useRef, useEffect } from "react";

interface ItineraryItem {
  id: string;
  name: string;
  image: string;
  note?: string;
  isEditingNote?: boolean;
}

interface DayItinerary {
  id: string;
  date: string;
  isCollapsed?: boolean;
  items: ItineraryItem[];
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Helper to parse "12 Oct 2026"
function parseDateStr(str: string): Date | null {
  if (!str) return null;
  const parts = str.trim().split(" ");
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const monthIdx = MONTHS.indexOf(parts[1]);
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || monthIdx === -1 || isNaN(year)) return null;
  return new Date(year, monthIdx, day);
}

// Helper to format Date -> "12 Oct 2026"
function formatDateStr(date: Date): string {
  const day = date.getDate();
  const monthStr = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${monthStr} ${year}`;
}

// Helper to add or subtract days
function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export default function TripDetailPage() {
  // 1. Trip Information State (Title and dates are editable)
  const [tripTitle, setTripTitle] = useState("Alor Setar & Heritage Exploration");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tripInfo, setTripInfo] = useState({
    startDate: "12 Oct 2026",
    endDate: "15 Oct 2026",
    ownerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    ownerName: "Sarah Tan",
  });

  // Trip Note State
  const [noteText, setNoteText] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tempNoteText, setTempNoteText] = useState("");

  // Search Inputs for each Day Card
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});

  // Itineraries State
  const [itineraries, setItineraries] = useState<DayItinerary[]>([
    {
      id: "day-1",
      date: "Day 1 - 12 Oct 2026",
      isCollapsed: false,
      items: [
        {
          id: "item-1",
          name: "Zahir Mosque",
          image:
            "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=400&q=80",
          note: "Remember to bring modest clothing.",
        },
        {
          id: "item-2",
          name: "Alor Setar Tower",
          image:
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80",
        },
      ],
    },
    {
      id: "day-2",
      date: "Day 2 - 13 Oct 2026",
      isCollapsed: false,
      items: [],
    },
  ]);

  // Handle adding an itinerary day (before or after)
  const handleAddDay = (position: "after" | "before" = "after") => {
    setItineraries((prev) => {
      let newStartDate = tripInfo.startDate;
      let newEndDate = tripInfo.endDate;

      if (prev.length === 0) {
        const startD = parseDateStr(tripInfo.startDate) || new Date(2026, 9, 12);
        const dateStr = formatDateStr(startD);
        const newDay: DayItinerary = {
          id: `day-${Date.now()}`,
          date: `Day 1 - ${dateStr}`,
          isCollapsed: false,
          items: [],
        };

        if (!tripInfo.startDate || !tripInfo.endDate) {
          newStartDate = dateStr;
          newEndDate = dateStr;
          setTripInfo((p) => ({ ...p, startDate: newStartDate, endDate: newEndDate }));
        }

        return [newDay];
      }

      if (position === "after") {
        const lastDay = prev[prev.length - 1];
        const datePart = lastDay.date.split(" - ")[1];
        const lastDate = parseDateStr(datePart) || new Date();
        const nextDate = addDaysToDate(lastDate, 1);
        const nextDateStr = formatDateStr(nextDate);

        const newDay: DayItinerary = {
          id: `day-${Date.now()}`,
          date: `Day ${prev.length + 1} - ${nextDateStr}`,
          isCollapsed: false,
          items: [],
        };

        const currentEndD = parseDateStr(tripInfo.endDate);
        if (!currentEndD || nextDate > currentEndD) {
          newEndDate = nextDateStr;
          setTripInfo((p) => ({ ...p, endDate: newEndDate }));
        }

        return [...prev, newDay];
      } else {
        const firstDay = prev[0];
        const datePart = firstDay.date.split(" - ")[1];
        const firstDate = parseDateStr(datePart) || new Date();
        const prevDate = addDaysToDate(firstDate, -1);
        const prevDateStr = formatDateStr(prevDate);

        const updatedPrevItems = prev.map((item, idx) => {
          const dateStr = item.date.split(" - ")[1] || "";
          return {
            ...item,
            date: `Day ${idx + 2} - ${dateStr}`,
          };
        });

        const newDay: DayItinerary = {
          id: `day-${Date.now()}`,
          date: `Day 1 - ${prevDateStr}`,
          isCollapsed: false,
          items: [],
        };

        const currentStartD = parseDateStr(tripInfo.startDate);
        if (!currentStartD || prevDate < currentStartD) {
          newStartDate = prevDateStr;
          setTripInfo((p) => ({ ...p, startDate: newStartDate }));
        }

        return [newDay, ...updatedPrevItems];
      }
    });
  };

  // Trip Note Handlers
  const handleOpenNoteField = () => {
    setTempNoteText(noteText);
    setIsEditingNote(true);
  };

  const handleSaveNote = () => {
    setNoteText(tempNoteText);
    setIsEditingNote(false);
  };

  const handleClearNote = () => {
    setNoteText("");
    setTempNoteText("");
    setIsEditingNote(false);
  };

  // Add Item Handler
  const handleAddItem = (dayId: string) => {
    const query = searchInputs[dayId]?.trim();
    if (!query) return;

    setItineraries((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            items: [
              ...day.items,
              {
                id: `item-${Date.now()}`,
                name: query,
                image:
                  "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=400&q=80",
              },
            ],
          };
        }
        return day;
      })
    );

    setSearchInputs((prev) => ({ ...prev, [dayId]: "" }));
  };

  // Delete Itinerary Item Handler
  const handleDeleteItem = (dayId: string, itemId: string) => {
    setItineraries((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            items: day.items.filter((item) => item.id !== itemId),
          };
        }
        return day;
      })
    );
  };

  // Delete Entire Day Itinerary Card Handler
  const handleDeleteDay = (dayId: string) => {
    setItineraries((prev) => prev.filter((day) => day.id !== dayId));
  };

  // Toggle Collapse State for a Day
  const handleToggleCollapse = (dayId: string, collapseValue?: boolean) => {
    setItineraries((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            isCollapsed:
              collapseValue !== undefined ? collapseValue : !day.isCollapsed,
          };
        }
        return day;
      })
    );
  };

  // Toggle Item Note Editing
  const handleToggleItemNoteEdit = (dayId: string, itemId: string) => {
    setItineraries((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            items: day.items.map((item) => {
              if (item.id === itemId) {
                return { ...item, isEditingNote: !item.isEditingNote };
              }
              return item;
            }),
          };
        }
        return day;
      })
    );
  };

  // Save Item Note
  const handleSaveItemNote = (dayId: string, itemId: string, note: string) => {
    setItineraries((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            items: day.items.map((item) => {
              if (item.id === itemId) {
                return { ...item, note, isEditingNote: false };
              }
              return item;
            }),
          };
        }
        return day;
      })
    );
  };

  const hasDates = Boolean(tripInfo.startDate && tripInfo.endDate);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16 text-gray-800">
      {/* Button: Back to Menu */}
      <div>
        <button
          type="button"
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
        </button>
      </div>

      {/* 1. Trip Information Card */}
      <div className="relative flex min-h-[160px] flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div>
          {isEditingTitle ? (
            <input
              type="text"
              value={tripTitle}
              autoFocus
              onChange={(e) => setTripTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setIsEditingTitle(false);
              }}
              className="w-full rounded-xl border border-[#ff6b6b] px-3 py-1.5 text-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#ff6b6b]/20"
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit title"
              className="group cursor-pointer text-2xl font-bold tracking-tight text-gray-900 hover:text-[#ff6b6b]"
            >
              {tripTitle}
              <span className="ml-2 inline-block text-xs font-normal text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                (click to edit)
              </span>
            </h1>
          )}
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <svg
              className="h-4 w-4 text-[#ff6b6b]"
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
                ? `${tripInfo.startDate} - ${tripInfo.endDate}`
                : "No travel dates set"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <img
              src={tripInfo.ownerAvatar}
              alt={tripInfo.ownerName}
              className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* 2. Trip Note Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Notes</h2>

          {isEditingNote ? (
            <button
              type="button"
              onClick={handleSaveNote}
              className="rounded-xl bg-[#ff6b6b] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#ff5252]"
            >
              Save
            </button>
          ) : noteText ? (
            <button
              type="button"
              onClick={handleClearNote}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
              aria-label="Clear Note"
              title="Clear Note"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenNoteField}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200"
              aria-label="Add Note"
              title="Add Note"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          )}
        </div>

        {isEditingNote ? (
          <div className="mt-4">
            <textarea
              rows={3}
              value={tempNoteText}
              onChange={(e) => setTempNoteText(e.target.value)}
              placeholder="Write your trip notes here..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:border-[#ff6b6b] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20"
            />
          </div>
        ) : noteText ? (
          <div className="group relative mt-3 flex items-start justify-between rounded-xl bg-gray-50 p-4">
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {noteText}
            </p>
            <button
              type="button"
              onClick={handleOpenNoteField}
              className="ml-2 text-xs font-medium text-[#ff6b6b] hover:underline"
            >
              Edit
            </button>
          </div>
        ) : null}
      </div>

      {/* 3. Itinerary List Container Card */}
      <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-800">Itinerary</h2>

          {/* Action Header Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-100"
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {hasDates
                ? `${tripInfo.startDate} - ${tripInfo.endDate}`
                : "Add date"}
            </button>

            {/* Always-visible Add Day Button next to Trip Date */}
            <button
              type="button"
              onClick={() => handleAddDay("after")}
              className="flex items-center gap-1.5 rounded-xl bg-[#ff6b6b] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#ff5252]"
              title="Add a new itinerary day"
            >
              <span className="text-sm font-bold">+</span>
              <span>Add Day</span>
            </button>
          </div>
        </div>

        {itineraries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <p className="text-sm font-medium text-gray-400">
              No itinerary days found.
            </p>
            <button
              type="button"
              onClick={() => handleAddDay("after")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff6b6b] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#ff5252]"
            >
              <span>+</span> Create First Itinerary Day
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {itineraries.map((day) => (
              <DayItineraryCard
                key={day.id}
                day={day}
                searchValue={searchInputs[day.id] || ""}
                onSearchChange={(val) =>
                  setSearchInputs((prev) => ({ ...prev, [day.id]: val }))
                }
                onAddItem={() => handleAddItem(day.id)}
                onDeleteItem={(itemId) => handleDeleteItem(day.id, itemId)}
                onDeleteDay={() => handleDeleteDay(day.id)}
                onAddDayBefore={() => handleAddDay("before")}
                onAddDayAfter={() => handleAddDay("after")}
                onToggleCollapse={(val) => handleToggleCollapse(day.id, val)}
                onToggleItemNoteEdit={(itemId) =>
                  handleToggleItemNoteEdit(day.id, itemId)
                }
                onSaveItemNote={(itemId, note) =>
                  handleSaveItemNote(day.id, itemId, note)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for individual Day Card with Dropdown and Item List
function DayItineraryCard({
  day,
  searchValue,
  onSearchChange,
  onAddItem,
  onDeleteItem,
  onDeleteDay,
  onAddDayBefore,
  onAddDayAfter,
  onToggleCollapse,
  onToggleItemNoteEdit,
  onSaveItemNote,
}: {
  day: DayItinerary;
  searchValue: string;
  onSearchChange: (val: string) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteDay: () => void;
  onAddDayBefore: () => void;
  onAddDayAfter: () => void;
  onToggleCollapse: (val?: boolean) => void;
  onToggleItemNoteEdit: (itemId: string) => void;
  onSaveItemNote: (itemId: string, note: string) => void;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-gray-50/50 p-5 shadow-2xs">
      {/* Day Title Header & Dropdown Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">{day.date}</h3>

        {/* Dropdown Menu Container */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-2xs hover:bg-gray-100"
            aria-label="Itinerary Card Options"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  onAddDayBefore();
                  setIsDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <span className="font-bold">+</span> Add Day Before
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddDayAfter();
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

      {/* Itinerary Items & Search Bar (Hidden when collapsed) */}
      {!day.isCollapsed && (
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
                  onToggleNoteEdit={() => onToggleItemNoteEdit(item.id)}
                  onSaveNote={(note) => onSaveItemNote(item.id, note)}
                />
              ))
            )}
          </div>

          {/* Search Bar at the bottom of the itinerary card */}
          <div className="mt-2 border-t border-gray-200/60 pt-2">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Add a place"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAddItem();
                }}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-xs text-gray-800 shadow-2xs focus:border-[#ff6b6b] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20"
              />
              <button
                type="button"
                onClick={onAddItem}
                className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff6b6b] text-white transition-colors hover:bg-[#ff5252]"
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

// Sub-component for editing individual Item Note
function ItemNoteEditor({
  initialNote,
  onSaveNote,
  onCancel,
}: {
  initialNote: string;
  onSaveNote: (note: string) => void;
  onCancel: () => void;
}) {
  const [tempNote, setTempNote] = useState(initialNote);

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-2">
      {/* Note Title & Conditional Delete Button */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Note</span>
        {tempNote.length > 0 && (
          <button
            type="button"
            onClick={() => setTempNote("")}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Clear note text"
            aria-label="Clear note text"
          >
            <svg
              className="h-3.5 w-3.5"
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
          </button>
        )}
      </div>

      <input
        type="text"
        value={tempNote}
        onChange={(e) => setTempNote(e.target.value)}
        placeholder="Add a note for this place..."
        className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-800 outline-none focus:border-[#ff6b6b]"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSaveNote(tempNote)}
          className="rounded-lg bg-[#ff6b6b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#ff5252]"
        >
          Save Note
        </button>
      </div>
    </div>
  );
}

// Sub-component for individual Itinerary Item Card
function ItineraryItemCard({
  item,
  onDelete,
  onToggleNoteEdit,
  onSaveNote,
}: {
  item: ItineraryItem;
  onDelete: () => void;
  onToggleNoteEdit: () => void;
  onSaveNote: (note: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Place Name */}
        <span className="text-sm font-semibold text-gray-800">{item.name}</span>

        {/* Right Side Controls: Note Button, Delete Button, & Location Image */}
        <div className="flex items-center gap-2">
          {/* Note Button */}
          <button
            type="button"
            onClick={onToggleNoteEdit}
            title="Add/Edit Note"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={onDelete}
            title="Delete Item"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>

          {/* Location Picture */}
          <div className="h-14 w-20 overflow-hidden rounded-lg bg-gray-200">
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Expandable Note Section */}
      {item.isEditingNote ? (
        <ItemNoteEditor
          initialNote={item.note || ""}
          onSaveNote={onSaveNote}
          onCancel={onToggleNoteEdit}
        />
      ) : (
        item.note && (
          <div className="mt-1 border-t border-gray-100 pt-1.5 flex items-center justify-between text-xs text-gray-500">
            <div>
              <span className="font-semibold text-gray-700">Note:</span> {item.note}
            </div>
            <button
              type="button"
              onClick={() => onSaveNote("")}
              className="flex h-5 w-5 items-center justify-center rounded text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete note"
              aria-label="Delete note"
            >
              <svg
                className="h-3.5 w-3.5"
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
            </button>
          </div>
        )
      )}
    </div>
  );
}