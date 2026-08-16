"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { listItinerariesAction } from "@/api_layer/02_Trip_Planning_&_Itinerary_Management/itineraryApi";
import { listTripsAction } from "@/api_layer/02_Trip_Planning_&_Itinerary_Management/tripApi";
import CreateItineraryModal from "../components/CreateItineraryModal";
import {
  DayItineraryCard,
  type DayItinerary,
} from "../components/DayItineraryCard";
import { TripInfoCard } from "../components/TripInfoCard";
import { TripNoteCard } from "../components/TripNoteCard";
import type { ItineraryRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";
import type { TripRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripRepository";

type RouteParams = {
  tripId?: string | string[];
};

function formatTripDate(value: string | null) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

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

function addDaysToDate(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function createDayState(
  itinerary: ItineraryRecord,
  index: number
): DayItinerary {
  return {
    id: itinerary.itinerary_id,
    title: itinerary.title || `Day ${index + 1}`,
    date: itinerary.date,
    isCollapsed: false,
    items: [
      {
        id: `${itinerary.itinerary_id}-sample`,
        name: itinerary.title || `Day ${index + 1}`,
        image:
          "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=400&q=80",
      },
    ],
  };
}

export default function TripItineraryPage() {
  const params = useParams<RouteParams>();
  const tripId = Array.isArray(params.tripId)
    ? params.tripId[0]
    : params.tripId;
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [itineraries, setItineraries] = useState<ItineraryRecord[]>([]);
  const [dayCards, setDayCards] = useState<DayItinerary[]>([]);
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadWorkspace = async () => {
      if (!tripId) {
        if (isMounted) {
          setTrip(null);
          setItineraries([]);
          setDayCards([]);
          setIsLoading(false);
        }

        return;
      }

      setIsLoading(true);

      try {
        const [trips, tripItineraries] = await Promise.all([
          listTripsAction("usr_demo"),
          listItinerariesAction(tripId),
        ]);

        if (!isMounted) {
          return;
        }

        const currentTrip =
          trips.find((candidate) => candidate.trip_id === tripId) ?? null;
        setTrip(currentTrip);
        setItineraries(currentTrip ? tripItineraries : []);
        setDayCards(
          currentTrip
            ? tripItineraries.map((itinerary, index) =>
                createDayState(itinerary, index)
              )
            : []
        );
      } catch {
        if (isMounted) {
          setTrip(null);
          setItineraries([]);
          setDayCards([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [tripId, refreshCounter]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const handleItineraryCreated = () => {
    setIsCreateModalOpen(false);
    setRefreshCounter((value) => value + 1);
    setToastMessage("Itinerary added!");
  };

  const handleInvalidDate = () => {
    setToastMessage("Invalid date!");
  };

  const handleAddDay = (position: "after" | "before" = "after") => {
    setDayCards((previous) => {
      if (previous.length === 0) {
        const startDate =
          trip?.start_date ?? new Date().toISOString().slice(0, 10);
        const newDay: DayItinerary = {
          id: `local-${Date.now()}`,
          title: "Day 1",
          date: startDate,
          isCollapsed: false,
          items: [],
        };
        return [newDay];
      }

      if (position === "after") {
        const lastDay = previous[previous.length - 1];
        const nextDate = addDaysToDate(lastDay.date, 1);
        const newDay: DayItinerary = {
          id: `local-${Date.now()}`,
          title: `Day ${previous.length + 1}`,
          date: nextDate,
          isCollapsed: false,
          items: [],
        };

        return [...previous, newDay];
      }

      const firstDay = previous[0];
      const previousDate = addDaysToDate(firstDay.date, -1);
      const newDay: DayItinerary = {
        id: `local-${Date.now()}`,
        title: "Day 1",
        date: previousDate,
        isCollapsed: false,
        items: [],
      };

      return [
        newDay,
        ...previous.map((day, index) => ({
          ...day,
          title: `Day ${index + 2}`,
        })),
      ];
    });
  };

  const handleAddItem = (dayId: string) => {
    const query = searchInputs[dayId]?.trim();
    if (!query) {
      return;
    }

    setDayCards((previous) =>
      previous.map((day) => {
        if (day.id !== dayId) {
          return day;
        }

        return {
          ...day,
          items: [
            ...day.items,
            {
              id: `${day.id}-${Date.now()}`,
              name: query,
              image:
                "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=400&q=80",
            },
          ],
        };
      })
    );

    setSearchInputs((previous) => ({ ...previous, [dayId]: "" }));
  };

  const handleDeleteItem = (dayId: string, itemId: string) => {
    setDayCards((previous) =>
      previous.map((day) => {
        if (day.id !== dayId) {
          return day;
        }

        return {
          ...day,
          items: day.items.filter((item) => item.id !== itemId),
        };
      })
    );
  };

  const handleDeleteDay = (dayId: string) => {
    setDayCards((previous) => previous.filter((day) => day.id !== dayId));
  };

  const handleToggleCollapse = (dayId: string, collapseValue?: boolean) => {
    setDayCards((previous) =>
      previous.map((day) => {
        if (day.id !== dayId) {
          return day;
        }

        return {
          ...day,
          isCollapsed:
            collapseValue !== undefined ? collapseValue : !day.isCollapsed,
        };
      })
    );
  };

  const handleToggleItemNoteEdit = (dayId: string, itemId: string) => {
    setDayCards((previous) =>
      previous.map((day) => {
        if (day.id !== dayId) {
          return day;
        }

        return {
          ...day,
          items: day.items.map((item) => {
            if (item.id !== itemId) {
              return item;
            }

            return {
              ...item,
              isEditingNote: !item.isEditingNote,
            };
          }),
        };
      })
    );
  };

  const handleSaveItemNote = (dayId: string, itemId: string, note: string) => {
    setDayCards((previous) =>
      previous.map((day) => {
        if (day.id !== dayId) {
          return day;
        }

        return {
          ...day,
          items: day.items.map((item) => {
            if (item.id !== itemId) {
              return item;
            }

            return {
              ...item,
              note,
              isEditingNote: false,
            };
          }),
        };
      })
    );
  };

  const tripTitle = trip?.trip_name ?? "Trip itinerary";
  const tripStart = formatTripDate(trip?.start_date ?? null);
  const tripEnd = formatTripDate(trip?.end_date ?? null);
  const canCreateItinerary = Boolean(trip && trip.start_date && trip.end_date);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16 text-gray-800">
      <CreateItineraryModal
        key={`${trip?.trip_id ?? "missing-trip"}-${itineraries.length}`}
        isOpen={isCreateModalOpen}
        trip={trip}
        itineraries={itineraries}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleItineraryCreated}
        onInvalidDate={handleInvalidDate}
      />

      {toastMessage ? (
        <div className="fixed top-4 right-4 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-900/10">
          {toastMessage}
        </div>
      ) : null}

      <TripInfoCard
        tripName={tripTitle}
        startDate={tripStart}
        endDate={tripEnd}
      />

      <TripNoteCard initialNote={trip?.trip_note ?? ""} />

      <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-800">Itinerary</h2>

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
              {tripStart && tripEnd ? `${tripStart} - ${tripEnd}` : "Add date"}
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!canCreateItinerary}
              className="bg-primary-500 hover:bg-primary-500/90 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:bg-gray-300"
              title="Add a new itinerary day"
            >
              <span className="text-sm font-bold">+</span>
              <span>Add Day</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl border border-dashed border-gray-200 bg-gray-50" />
            <div className="h-28 animate-pulse rounded-2xl border border-dashed border-gray-200 bg-gray-50" />
          </div>
        ) : dayCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm font-medium text-gray-400">
              No itinerary days found.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary-500 hover:bg-primary-500/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              <span>+</span> Create First Itinerary Day
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {dayCards.map((day) => (
              <DayItineraryCard
                key={day.id}
                day={day}
                searchValue={searchInputs[day.id] ?? ""}
                onSearchChange={(value) =>
                  setSearchInputs((previous) => ({
                    ...previous,
                    [day.id]: value,
                  }))
                }
                onAddItem={() => handleAddItem(day.id)}
                onDeleteItem={(itemId) => handleDeleteItem(day.id, itemId)}
                onDeleteDay={() => handleDeleteDay(day.id)}
                onAddDayBefore={() => handleAddDay("before")}
                onAddDayAfter={() => handleAddDay("after")}
                onToggleCollapse={(collapseValue) =>
                  handleToggleCollapse(day.id, collapseValue)
                }
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
