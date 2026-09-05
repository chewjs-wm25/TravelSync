"use client";

import { useParams } from "next/navigation";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";
import { useEffect, useState, useCallback } from "react";

import { discoveryService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";
import {
  deleteItineraryAction,
  listItinerariesAction,
  createItineraryAction,
  updateItineraryAction,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/api/itineraryApi";
import {
  deleteItineraryItemAction,
  listItineraryItemsAction,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/api/itineraryItemApi";
import {
  listTripsAction,
  updateTripAction,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/api/tripApi";
import CreateItineraryModal from "@/app/02_Trip_Planning_&_Itinerary_Management/components/CreateItineraryModal";
import {
  DayItineraryCard,
  type DayItinerary,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/components/DayItineraryCard";
import { TripInfoCard } from "@/app/02_Trip_Planning_&_Itinerary_Management/components/TripInfoCard";
import { TripNoteCard } from "@/app/02_Trip_Planning_&_Itinerary_Management/components/TripNoteCard";
import type { ItineraryRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";
import type { TripRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripRepository";

type RouteParams = {
  tripId?: string | string[];
};

type ItemApiPayload = {
  id?: string;
  item_id?: string;
  place?: string;
  name?: string;
  item_name?: string;
  destination?: string | null;
  image?: string;
  image_url?: string | null;
  note?: string | null;
  itinerary_note?: string | null;
  itinerary_item_note?: string | null;
  position?: number | null;
  order_index?: number | null;
  type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  reference_id?: string | null;
  /** Coordinates stored with the item for Module 04 route calculation */
  lat?: number | null;
  lon?: number | null;
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
  // Use UTC date math to avoid timezone offset issues (match server-side behavior)
  const [y, m, d] = date.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const dt = new Date(utc);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

const defaultItemImage =
  "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=400&q=80";

function sortDayItems(items: DayItinerary["items"]) {
  return [...items].sort((left, right) => {
    const leftPosition =
      left.position ?? left.order_index ?? Number.MAX_SAFE_INTEGER;
    const rightPosition =
      right.position ?? right.order_index ?? Number.MAX_SAFE_INTEGER;

    if (leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }

    return left.id.localeCompare(right.id);
  });
}

function mapItemResponse(
  item: ItemApiPayload,
  fallbackName: string,
  fallbackImage = defaultItemImage
) {
  const position = item.position ?? item.order_index;

  return {
    id: item.id ?? item.item_id ?? `${fallbackName}-${Date.now()}`,
    name: item.name ?? item.item_name ?? item.place ?? fallbackName,
    image: item.image ?? item.image_url ?? fallbackImage,
    note: item.note ?? item.itinerary_item_note ?? item.itinerary_note ?? undefined,
    position: position ?? undefined,
    order_index: item.order_index ?? item.position ?? position ?? undefined,
    start_time: item.start_time ?? undefined,
    end_time: item.end_time ?? undefined,
    isEditingItem: false,
    // Pass through coordinates for Module 04 route calculation
    lat: item.lat ?? undefined,
    lon: item.lon ?? undefined,
  };
}

function createDayState(
  itinerary: ItineraryRecord,
  index: number,
  persistedItems: ItemApiPayload[]
): DayItinerary {
  return {
    id: itinerary.itinerary_id,
    title: itinerary.title || `Day ${index + 1}`,
    date: itinerary.date,
    note: itinerary.note ?? null,
    isCollapsed: false,
    items: sortDayItems(
      persistedItems.map((item) => mapItemResponse(item, itinerary.title))
    ),
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
  // selected suggestions per day (from module 03 DiscoveryService)
  const [selectedSuggestions, setSelectedSuggestions] = useState<
    Record<
      string,
      | {
          placeId: string;
          formatted: string;
          name?: string;
          imageUrl?: string;
          lat?: number;
          lon?: number;
        }
      | undefined
    >
  >({});

const handleSelectSuggestion = useCallback(
    (
      dayId: string,
      sugg?: {
        placeId: string;
        formatted: string;
        name?: string;
        imageUrl?: string;
        lat?: number;
        lon?: number;
      }
    ) => {
      setSelectedSuggestions((prev) => ({ ...prev, [dayId]: sugg }));
    },
    []
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { isLoggedIn, user, refreshSession } = useAuthStore();
  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  // Editing trip start/end dates from the itinerary header
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState<string>(""
  );
  const [draftEndDate, setDraftEndDate] = useState<string>("");
  const [isSavingDates, setIsSavingDates] = useState(false);

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
        // Only allow loading workspace for logged-in users. Module 02 requires authenticated session.
        if (!isLoggedIn || !user?.id) {
          if (!isMounted) return;
          setTrip(null);
          setItineraries([]);
          setDayCards([]);
          setIsLoading(false);
          return;
        }

        const [trips, tripItineraries] = await Promise.all([
          listTripsAction(user.id),
          listItinerariesAction(tripId),
        ]);

        const persistedItems = await Promise.all(
          tripItineraries.map((itinerary) =>
            listItineraryItemsAction(itinerary.itinerary_id)
          )
        );

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
              createDayState(itinerary, index, persistedItems[index])
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
  }, [tripId, refreshCounter, isLoggedIn, user?.id]);

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

  const handleSaveTripName = async (nextName: string) => {
    if (!trip) {
      return false;
    }

    const normalizedName = nextName.trim();
    if (!normalizedName) {
      setToastMessage("Trip destination is required");
      return false;
    }

    try {
      const updatedTrip = await updateTripAction({
        tripId: trip.trip_id,
        userId: trip.user_id,
        tripName: normalizedName,
        startDate: trip.start_date,
        endDate: trip.end_date,
        tripNote: trip.trip_note ?? undefined,
      });

      setTrip(updatedTrip);
      return true;
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Failed to update trip name"
      );
      return false;
    }
  };

  const handleSaveTripNote = async (note: string) => {
    if (!trip) {
      return false;
    }

    try {
      const updatedTrip = await updateTripAction({
        tripId: trip.trip_id,
        userId: trip.user_id,
        tripName: trip.trip_name,
        startDate: trip.start_date,
        endDate: trip.end_date,
        tripNote: note,
      });

      setTrip(updatedTrip);
      setToastMessage(
        note.trim().length > 0 ? "Trip note saved!" : "Trip note cleared!"
      );
      return true;
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Failed to update trip note"
      );
      return false;
    }
  };

  const handleSaveItineraryNote = async (dayId: string, note: string) => {
    const currentDay = dayCards.find((day) => day.id === dayId);

    if (!currentDay) {
      return false;
    }

    if (dayId.startsWith("local-")) {
      setDayCards((previous) =>
        previous.map((day) =>
          day.id === dayId
            ? { ...day, note: note.length > 0 ? note : null }
            : day
        )
      );
      setToastMessage(
        note.trim().length > 0
          ? "Itinerary note saved!"
          : "Itinerary note cleared!"
      );
      return true;
    }

    try {
      const updatedItinerary = await updateItineraryAction({
        itineraryId: dayId,
        title: currentDay.title,
        date: currentDay.date,
        note,
      });

      setDayCards((previous) =>
        previous.map((day) =>
          day.id === dayId
            ? { ...day, note: updatedItinerary.note ?? null }
            : day
        )
      );
      setItineraries((previous) =>
        previous.map((itinerary) =>
          itinerary.itinerary_id === dayId
            ? { ...itinerary, note: updatedItinerary.note ?? null }
            : itinerary
        )
      );
      setToastMessage(
        note.trim().length > 0
          ? "Itinerary note saved!"
          : "Itinerary note cleared!"
      );
      return true;
    } catch (error) {
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Failed to update itinerary note"
      );
      return false;
    }
  };

  const handleAddDay = async (
    position: "after" | "before" = "after",
    anchorDayId?: string
  ) => {
    // If there are no days yet, create a local first day (same behavior as before)
    if (dayCards.length === 0) {
      const startDate = trip?.start_date ?? new Date().toISOString().slice(0, 10);
      const newDay: DayItinerary = {
        id: `local-${Date.now()}`,
        title: "Day 1",
        date: startDate,
        note: null,
        isCollapsed: false,
        items: [],
      };
      setDayCards([newDay]);
      return;
    }

    // determine anchor index
    let anchorIndex = 0;
    if (anchorDayId) {
      anchorIndex = dayCards.findIndex((d) => d.id === anchorDayId);
      if (anchorIndex === -1) {
        anchorIndex = position === "after" ? dayCards.length - 1 : 0;
      }
    } else {
      anchorIndex = position === "after" ? dayCards.length - 1 : 0;
    }

    const anchorDay = dayCards[anchorIndex];
    const newDate = addDaysToDate(anchorDay.date, position === "before" ? -1 : 1);

    // deny if a day already exists for newDate
    const existsInLocal = dayCards.some((d) => d.date === newDate);
    const existsInPersisted = itineraries.some((it) => it.date === newDate);
    if (existsInLocal || existsInPersisted) {
      setToastMessage("An itinerary day already exists for that date");
      return;
    }

    // If trip exists, and newDate is outside trip window, update trip dates to include it
    if (trip) {
      let needUpdate = false;
      let nextStart = trip.start_date ?? null;
      let nextEnd = trip.end_date ?? null;

      if (trip.start_date && newDate < trip.start_date) {
        nextStart = newDate;
        needUpdate = true;
      }
      if (trip.end_date && newDate > trip.end_date) {
        nextEnd = newDate;
        needUpdate = true;
      }

      if (needUpdate) {
        try {
          const updatedTrip = await updateTripAction({
            tripId: trip.trip_id,
            userId: trip.user_id,
            tripName: trip.trip_name,
            tripNote: trip.trip_note ?? undefined,
            startDate: nextStart,
            endDate: nextEnd,
          });
          setTrip(updatedTrip);
          // reflect in UI message
          setToastMessage("Trip dates updated to include new day");
        } catch (error) {
          setToastMessage(
            error instanceof Error ? error.message : "Failed to update trip dates"
          );
          return;
        }
      }
    }

    // If anchor day is persisted (not local), create a persisted itinerary day via server action
    if (!anchorDay.id.startsWith("local-")) {
      try {
        const created = await createItineraryAction({
          tripId: trip?.trip_id ?? itineraries[0]?.trip_id ?? null,
          title: `Day ${itineraries.length + 1}`,
          date: newDate,
          note: null,
        });

        // insert into itineraries and dayCards sorted by date
        setItineraries((prev) => {
          const next = [...prev, created];
          return next.sort((a, b) => a.date.localeCompare(b.date));
        });

        const newDay: DayItinerary = {
          id: created.itinerary_id,
          title: created.title,
          date: created.date,
          note: created.note ?? null,
          isCollapsed: false,
          items: [],
        };

        setDayCards((prev) => {
          const copy = [...prev];
          // find insertion index based on date ordering
          const insertionIndex = copy.findIndex((d) => d.date > newDate);
          if (insertionIndex === -1) copy.push(newDay);
          else copy.splice(insertionIndex, 0, newDay);

          // renumber titles for UI consistency
          return copy.map((d, i) => ({ ...d, title: `Day ${i + 1}` }));
        });

        setToastMessage("Itinerary day added");
        setRefreshCounter((v) => v + 1);
      } catch (error) {
        setToastMessage(
          error instanceof Error ? error.message : "Failed to add itinerary day"
        );
      }

      return;
    }

    // Insert a local day when anchor is local
    setDayCards((previous) => {
      const copy = [...previous];
      const insertionIndex = position === "before" ? anchorIndex : anchorIndex + 1;
      const newDay: DayItinerary = {
        id: `local-${Date.now()}`,
        title: `Day ${copy.length + 1}`,
        date: newDate,
        note: null,
        isCollapsed: false,
        items: [],
      };
      copy.splice(insertionIndex, 0, newDay);
      return copy.map((d, i) => ({ ...d, title: `Day ${i + 1}` }));
    });
  };

  const handleAddItem = async (dayId: string) => {
    const query = searchInputs[dayId]?.trim();
    if (!query) {
      setToastMessage("Place Not Found!");
      return;
    }

    const selectedSuggestion = selectedSuggestions[dayId];
    let resolvedPlaceDetail = null as Awaited<
      ReturnType<typeof discoveryService.getPlaceDetail>
    >;

    const isLocalSuggestion =
      selectedSuggestion?.placeId.startsWith("local:") ?? false;

    if (selectedSuggestion && !isLocalSuggestion) {
      try {
        resolvedPlaceDetail = await discoveryService.getPlaceDetail(
          selectedSuggestion.placeId,
          selectedSuggestion.formatted || query
        );
      } catch {
        resolvedPlaceDetail = null;
      }
    }

    const resolvedItemName =
      selectedSuggestion?.name ?? resolvedPlaceDetail?.name ?? query;
    const resolvedItemImage =
      selectedSuggestion?.imageUrl ??
      resolvedPlaceDetail?.imageUrl ??
      defaultItemImage;
    const resolvedLat = selectedSuggestion?.lat ?? resolvedPlaceDetail?.lat ?? null;
    const resolvedLon = selectedSuggestion?.lon ?? resolvedPlaceDetail?.lon ?? null;

    if (dayId.startsWith("local-")) {
      setDayCards((previous) =>
        previous.map((day) => {
          if (day.id !== dayId) {
            return day;
          }

          const newItem = {
            id: `${day.id}-${Date.now()}`,
            name: resolvedItemName,
            image: resolvedItemImage,
            note: undefined,
            position: day.items.length + 1,
            order_index: day.items.length + 1,
            isEditingItem: false,
            lat: resolvedLat ?? undefined,
            lon: resolvedLon ?? undefined,
          };

          return {
            ...day,
            items: sortDayItems([...day.items, newItem]),
          };
        })
      );

      setSearchInputs((previous) => ({ ...previous, [dayId]: "" }));
      setSelectedSuggestions((prev) => ({ ...prev, [dayId]: undefined }));
      setToastMessage("Place Added!");
      return;
    }

    try {
      const response = await fetch(
        `/02_Trip_Planning_&_Itinerary_Management/api/itineraries/${encodeURIComponent(dayId)}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            place: resolvedItemName,
            image: resolvedItemImage,
            note: "",
            referenceId: selectedSuggestion?.placeId ?? null,
            lat: resolvedLat,
            lon: resolvedLon,
          }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        error?: string;
        item?: ItemApiPayload;
      };

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message ?? payload.error ?? "Failed to add item");
      }

      const item = payload.item;
      const newItem = {
        ...mapItemResponse(item ?? {}, query),
        lat: item?.lat ?? resolvedLat ?? undefined,
        lon: item?.lon ?? resolvedLon ?? undefined,
      };

      setDayCards((previous) =>
        previous.map((day) => {
          if (day.id !== dayId) {
            return day;
          }

          return {
            ...day,
            items: sortDayItems([...day.items, newItem]),
          };
        })
      );

      setSearchInputs((previous) => ({ ...previous, [dayId]: "" }));
      setSelectedSuggestions((prev) => ({ ...prev, [dayId]: undefined }));
      setToastMessage("Place Added!");
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Failed to add item"
      );
    }
  };

  const handleDeleteItem = async (dayId: string, itemId: string) => {
    if (itemId.endsWith("-sample") || itemId.startsWith("local-")) {
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
      setToastMessage("Item removed from itinerary!");
      return;
    }

    try {
      await deleteItineraryItemAction({
        itineraryId: dayId,
        itemId,
      });

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
      setToastMessage("Item removed from itinerary!");
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Failed to delete item"
      );
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    const targetDay = dayCards.find((day) => day.id === dayId);

    if (!targetDay) {
      return;
    }

    if (dayId.startsWith("local-")) {
      setDayCards((previous) => previous.filter((day) => day.id !== dayId));
      return;
    }

    try {
      await deleteItineraryAction({ itineraryId: dayId });
      setDayCards((previous) => previous.filter((day) => day.id !== dayId));
      setItineraries((previous) =>
        previous.filter((itinerary) => itinerary.itinerary_id !== dayId)
      );
      setRefreshCounter((value) => value + 1);
      setToastMessage("Itinerary deleted!");
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Failed to delete itinerary"
      );
    }
  };

  const handleEditDay = async (
    dayId: string,
    nextTitle: string,
    nextDate: string
  ) => {
    const trimmedTitle = nextTitle.trim();
    const normalizedDate = nextDate.trim();

    if (!trimmedTitle) {
      setToastMessage("Itinerary title is required");
      return;
    }

    if (dayId.startsWith("local-")) {
      setDayCards((previous) =>
        previous.map((day) => {
          if (day.id !== dayId) {
            return day;
          }

          return {
            ...day,
            title: trimmedTitle,
            date: normalizedDate,
          };
        })
      );
      setToastMessage("Itinerary updated!");
      return;
    }

    try {
      const updatedItinerary = await updateItineraryAction({
        itineraryId: dayId,
        title: trimmedTitle,
        date: normalizedDate,
      });

      setDayCards((previous) =>
        previous.map((day) => {
          if (day.id !== dayId) {
            return day;
          }

          return {
            ...day,
            title: updatedItinerary.title,
            date: updatedItinerary.date,
          };
        })
      );
      setItineraries((previous) =>
        previous.map((itinerary) =>
          itinerary.itinerary_id === dayId
            ? {
                ...itinerary,
                title: updatedItinerary.title,
                date: updatedItinerary.date,
              }
            : itinerary
        )
      );
      setRefreshCounter((value) => value + 1);
      setToastMessage("Itinerary updated!");
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Failed to update itinerary"
      );
    }
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

  const handleToggleItemEdit = (dayId: string, itemId: string) => {
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
              isEditingItem: !item.isEditingItem,
            };
          }),
        };
      })
    );
  };

  const handleUpdateItem = async (
  dayId: string,
  itemId: string,
  trimmedName: string,
  payload: {
    note?: string;
    position?: number;
    start_time?: string;
    end_time?: string;
  }
) => {
  const targetDay = dayCards.find((day) => day.id === dayId);
  const existingItem = targetDay?.items.find((item) => item.id === itemId);

  // Compute effective times before validating
  const effectiveStartTime = payload.start_time ?? existingItem?.start_time;
  const effectiveEndTime = payload.end_time ?? existingItem?.end_time;

  // Validate using full effective times
  if (targetDay) {
    const overlapError = hasTimeOverlap(
      targetDay.items,
      itemId,
      effectiveStartTime,
      effectiveEndTime
    );

    if (overlapError) {
      setToastMessage(overlapError);
      return;
    }
  }

if (effectiveStartTime && effectiveEndTime && effectiveEndTime < effectiveStartTime) {
  setToastMessage("End time cannot be earlier than start time");
  return;
}

    const applyLocalUpdate = () => {
      setDayCards((previous) =>
        previous.map((day) => {
          if (day.id !== dayId) {
            return day;
          }

          return {
            ...day,
            items: sortDayItems(
              day.items.map((item) => {
                if (item.id !== itemId) {
                  return item;
                }

                return {
                  ...item,
                  name: trimmedName,
                  note: payload.note,
                  start_time: payload.start_time ?? item.start_time,
                  end_time: payload.end_time ?? item.end_time,
                  position: payload.position ?? item.position,
                  order_index: payload.position ?? item.order_index,
                  isEditingItem: false,
                };
              })
            ),
          };
        })
      );
    };

    if (itemId.endsWith("-sample") || itemId.startsWith("local-")) {
      applyLocalUpdate();
      setToastMessage("Itinerary item updated!");
      return;
    }

    try {
      const response = await fetch(
        `/02_Trip_Planning_&_Itinerary_Management/api/itineraries/${encodeURIComponent(dayId)}/items/${encodeURIComponent(itemId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
            note: payload.note,
            position: payload.position,
            start_time: payload.start_time,
            end_time: payload.end_time,
          }),
        }
      );

      const responsePayload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        error?: string;
        item?: ItemApiPayload;
      };

      if (!response.ok || responsePayload.success === false) {
        throw new Error(responsePayload.message ?? responsePayload.error ?? "Failed to update item");
      }

      const updatedItem = responsePayload.item ?? {};
      const updatedPosition = updatedItem.position ?? updatedItem.order_index;

      setDayCards((previous) =>
        previous.map((day) => {
          if (day.id !== dayId) return day;

          return {
            ...day,
            items: sortDayItems(
              day.items.map((item) => {
                if (item.id !== itemId) return item;

                return {
                  ...item,
                  name:
                    updatedItem.name ??
                    updatedItem.item_name ??
                    updatedItem.place ??
                    trimmedName,
                  image:
                    updatedItem.image ?? updatedItem.image_url ?? item.image,
                  note:
                    updatedItem.note ??
                    updatedItem.itinerary_item_note ??
                    updatedItem.itinerary_note ??
                    undefined,
                  start_time: updatedItem.start_time ?? payload.start_time ?? item.start_time,
                  end_time: updatedItem.end_time ?? payload.end_time ?? item.end_time,
                  position:
                    updatedPosition ?? payload.position ?? item.position,
                  order_index:
                    updatedItem.order_index ??
                    updatedItem.position ??
                    payload.position ??
                    item.order_index,
                  isEditingItem: false,
                };
              })
            ),
          };
        })
      );
      setToastMessage("Itinerary item updated!");
    } catch (error) {
      setToastMessage(
        error instanceof Error ? error.message : "Failed to update item"
      );
    }
  };

  const handleSaveItem = async (
    dayId: string,
    itemId: string,
    payload: {
      name?: string;
      note?: string;
      position?: number;
      start_time?: string;
      end_time?: string;
    }
  ) => {
    const trimmedName = payload.name?.trim() ?? "";
    return handleUpdateItem(dayId, itemId, trimmedName, payload);
  };

  const tripTitle = trip?.trip_name ?? "Trip itinerary";
  const tripStart = formatTripDate(trip?.start_date ?? null);
  const tripEnd = formatTripDate(trip?.end_date ?? null);
  const canCreateItinerary = Boolean(trip && trip.start_date && trip.end_date);

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-16 text-gray-800">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
          <p className="mb-3 text-lg font-semibold text-gray-800">Account Not Found</p>
          <p className="mb-4 text-sm text-gray-600">Please sign in to access this trip. Trips are private to each account.</p>
          <a
            href="/01_User_&_Account_Management"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff6b6b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#ff5252] active:scale-95"
          >
            Go to Sign in
          </a>
        </div>
      </div>
    );
  }

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
        ownerAvatar={user?.avatarUrl ?? undefined}
        ownerName={user?.name ?? undefined}
        shareUrl={
          tripId
            ? `/05_Collaboration_&_Shared_Planning?trip=${encodeURIComponent(tripId)}`
            : undefined
        }
        onSaveTripName={handleSaveTripName}
      />

      <TripNoteCard
        note={trip?.trip_note ?? ""}
        onSaveNote={handleSaveTripNote}
      />

      <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-800">Itinerary</h2>

          <div className="flex items-center gap-2">
            {isEditingDates ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={draftStartDate}
                  onChange={(e) => setDraftStartDate(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#ff6b6b] focus:ring-2 focus:ring-[#ff6b6b]/20"
                />
                <span className="text-sm text-gray-500">—</span>
                <input
                  type="date"
                  value={draftEndDate}
                  onChange={(e) => setDraftEndDate(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#ff6b6b] focus:ring-2 focus:ring-[#ff6b6b]/20"
                />

                <button
                  type="button"
                  onClick={async () => {
                    if (!trip) return;

                    // basic validation
                    if (draftStartDate && draftEndDate && draftStartDate > draftEndDate) {
                      setToastMessage("Start date must be on or before end date");
                      return;
                    }

                    try {
                      setIsSavingDates(true);
                      const updatedTrip = await updateTripAction({
                        tripId: trip.trip_id,
                        userId: trip.user_id,
                        tripName: trip.trip_name,
                        tripNote: trip.trip_note ?? undefined,
                        startDate: draftStartDate || null,
                        endDate: draftEndDate || null,
                      });

                      setTrip(updatedTrip);
                      setIsEditingDates(false);
                      setRefreshCounter((v) => v + 1);

                      // check for out-of-range itineraries
                      const outOfRange = itineraries.filter((it) => {
                        if (draftStartDate && it.date < draftStartDate) return true;
                        if (draftEndDate && it.date > draftEndDate) return true;
                        return false;
                      });

                      if (outOfRange.length > 0) {
                        setToastMessage(
                          `${outOfRange.length} itinerary day(s) are outside the new trip dates. Please adjust them manually.`
                        );
                      } else {
                        setToastMessage("Trip dates saved!");
                      }
                    } catch (error) {
                      setToastMessage(
                        error instanceof Error ? error.message : "Failed to update trip dates"
                      );
                    } finally {
                      setIsSavingDates(false);
                    }
                  }}
                  disabled={isSavingDates}
                  className="rounded-xl bg-[#ff6b6b] px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#ff5252] active:scale-95 disabled:opacity-60"
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingDates(false)}
                  className="ml-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-100 active:scale-95"
                  onClick={() => {
                    setDraftStartDate(trip?.start_date ?? "");
                    setDraftEndDate(trip?.end_date ?? "");
                    setIsEditingDates(true);
                  }}
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
                  className="bg-primary-500 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#ff5252] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Add a new itinerary day"
                >
                  <span className="text-sm font-bold">+</span>
                  <span>Add Day</span>
                </button>
              </>
            )}
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
              className="bg-primary-500 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#ff5252] active:scale-95"
            >
              <span>+</span> Create First Itinerary Day
            </button>
          </div>
        ) : (
<div className="space-y-6">
  {dayCards.map((day) => (
    <DayCardWrapper
      key={day.id}
      day={day}
      searchValue={searchInputs[day.id] ?? ""}
      onSearchChange={(value) => {
        const trimmedValue = value.trim();

        setSearchInputs((previous) => ({
          ...previous,
          [day.id]: value,
        }));

        setSelectedSuggestions((prev) => {
          const current = prev[day.id];
          if (!current) {
            return { ...prev, [day.id]: undefined };
          }

          const labels = [current.formatted, current.name]
            .filter(Boolean)
            .map((label) => label!.trim().toLowerCase());

          if (!trimmedValue) {
            return { ...prev, [day.id]: undefined };
          }

          if (labels.includes(trimmedValue.toLowerCase())) {
            return prev;
          }

          return { ...prev, [day.id]: undefined };
        });
      }}
      onSelectSuggestion={handleSelectSuggestion}
      onAddItem={() => handleAddItem(day.id)}
      onDeleteItem={(itemId) => void handleDeleteItem(day.id, itemId)}
      onDeleteDay={() => {
        void handleDeleteDay(day.id);
      }}
      onAddDayBefore={(id) => void handleAddDay("before", id)}
      onAddDayAfter={(id) => void handleAddDay("after", id)}
      onToggleCollapse={(collapseValue) =>
        handleToggleCollapse(day.id, collapseValue)
      }
      onToggleItemEdit={(itemId) =>
        handleToggleItemEdit(day.id, itemId)
      }
      onSaveItem={(itemId, payload) =>
        handleSaveItem(day.id, itemId, payload)
      }
      onSaveNote={(note) => handleSaveItineraryNote(day.id, note)}
      onEditDay={(nextTitle, nextDate) =>
        void handleEditDay(day.id, nextTitle, nextDate)
      }
    />
  ))}
</div>
        )}
      </div>
    </div>
  );
}

function hasTimeOverlap(
  items: DayItinerary["items"],
  currentItemId: string,
  startTime?: string,
  endTime?: string
): string | null {
  // 1. Check if end time is earlier than start time
  if (startTime && endTime && endTime <= startTime) {
    return "End time cannot be earlier than or same as start time";
  }

  if (!startTime) return null;

  for (const item of items) {
    if (item.id === currentItemId || !item.start_time) continue;

    // Check if start time falls within an existing item's window
    if (item.end_time && startTime >= item.start_time && startTime < item.end_time) {
      return `Start time overlaps with "${item.name}" (${item.start_time} – ${item.end_time})`;
    }

    // Check if end time falls within an existing item's window
    if (endTime && item.end_time && endTime > item.start_time && endTime <= item.end_time) {
      return `End time overlaps with "${item.name}" (${item.start_time} – ${item.end_time})`;
    }

    // Check if new window completely covers an existing item
    if (endTime && item.end_time && startTime <= item.start_time && endTime >= item.end_time) {
      return `Time range completely covers "${item.name}" (${item.start_time} – ${item.end_time})`;
    }
  }

  return null;
}

type DayCardWrapperProps = {
  day: DayItinerary;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelectSuggestion: (
    dayId: string,
    sugg?: {
      placeId: string;
      formatted: string;
      name?: string;
      imageUrl?: string;
      lat?: number;
      lon?: number;
    }
  ) => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteDay: () => void;
  onAddDayBefore: (id: string) => void;
  onAddDayAfter: (id: string) => void;
  onToggleCollapse: (collapseValue?: boolean) => void;
  onToggleItemEdit: (itemId: string) => void;
  onSaveItem: (
    itemId: string,
    payload: {
      name?: string;
      note?: string;
      position?: number;
      start_time?: string;
      end_time?: string;
    }
  ) => Promise<void>;
  onSaveNote: (note: string) => Promise<boolean>;
  onEditDay: (nextTitle: string, nextDate: string) => void;
};

function DayCardWrapper({
  day,
  onSelectSuggestion,
  ...rest
}: DayCardWrapperProps) {
  const handleSelect = useCallback(
    (sugg: Parameters<DayCardWrapperProps["onSelectSuggestion"]>[1]) => {
      onSelectSuggestion(day.id, sugg);
    },
    [day.id, onSelectSuggestion]
  );

  return (
    <DayItineraryCard
      day={day}
      onSelectSuggestion={handleSelect}
      {...rest}
    />
  );
}