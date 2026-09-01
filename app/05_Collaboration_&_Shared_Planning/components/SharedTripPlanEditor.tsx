"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  Pencil,
  Lock,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { can } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/RolePermissions";
import { useCollabStore } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";

// Direct imports from Module 02 components (zero modification to module 02)
import {
  DayItineraryCard,
  type DayItinerary,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/components/DayItineraryCard";
import CreateItineraryModal from "@/app/02_Trip_Planning_&_Itinerary_Management/components/CreateItineraryModal";
import EditTripModal from "@/app/02_Trip_Planning_&_Itinerary_Management/components/EditTripModal";
import { TripNoteCard } from "@/app/02_Trip_Planning_&_Itinerary_Management/components/TripNoteCard";
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
  updateTripAction,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/api/tripApi";
import { discoveryService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";
import type { ItineraryRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";
import type { TripRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripRepository";

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
  lat?: number | null;
  lon?: number | null;
};

const defaultItemImage =
  "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=400&q=80";

function sortDayItems(items: DayItinerary["items"]) {
  return [...items].sort((left, right) => {
    const leftPosition = left.position ?? left.order_index ?? Number.MAX_SAFE_INTEGER;
    const rightPosition = right.position ?? right.order_index ?? Number.MAX_SAFE_INTEGER;
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

function addDaysToDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const dt = new Date(utc);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export default function SharedTripPlanEditor() {
  const activeTrip = useCollabStore((s) =>
    s.trips.find((t) => t.tripId === s.activeTripId) ?? s.trips[0]
  );
  const activeTripId = useCollabStore((s) => s.activeTripId);
  const currentUserId = useCollabStore((s) => s.currentUserId);
  const { isLoggedIn, user } = useAuthStore();

  const me = activeTrip?.members.find((m) => m.id === currentUserId);
  const canEdit = can(me?.role ?? "Viewer", "editItinerary");
  const isOwner = me?.role === "Owner";

  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [itineraries, setItineraries] = useState<ItineraryRecord[]>([]);
  const [dayCards, setDayCards] = useState<DayItinerary[]>([]);
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});
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
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditTripModalOpen, setIsEditTripModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const targetTripId = activeTripId || activeTrip?.tripId;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  // Load itinerary data from Module 02 API
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!targetTripId) {
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
        // Fetch trip record
        const tripRes = await fetch(
          `/02_Trip_Planning_&_Itinerary_Management/api/trips/${encodeURIComponent(targetTripId)}`
        );
        let tripData: TripRecord | null = null;
        if (tripRes.ok) {
          const data = (await tripRes.json()) as { trip?: TripRecord } & TripRecord;
          tripData = data.trip ?? (data.trip_id ? data : null);
        }

        // Fallback trip record using activeTrip if needed
        if (!tripData && activeTrip) {
          tripData = {
            trip_id: activeTrip.tripId,
            user_id: user?.id || currentUserId || "dev-user-001",
            trip_name: activeTrip.tripName,
            start_date: activeTrip.startDate ?? null,
            end_date: activeTrip.endDate ?? null,
            trip_note: null,
            image_url: null,
          };
        }

        const tripItineraries = await listItinerariesAction(targetTripId);
        const persistedItems = await Promise.all(
          tripItineraries.map((it) => listItineraryItemsAction(it.itinerary_id))
        );

        if (!isMounted) return;

        setTrip(tripData);
        setItineraries(tripItineraries);
        setDayCards(
          tripItineraries.map((itinerary, index) =>
            createDayState(itinerary, index, persistedItems[index])
          )
        );
      } catch {
        if (isMounted) {
          setItineraries([]);
          setDayCards([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [targetTripId, refreshCounter, activeTrip, user?.id, currentUserId]);

  const handleAddItem = async (dayId: string) => {
    if (!canEdit) {
      showToast("Viewer role cannot add itinerary items.");
      return;
    }

    const query = searchInputs[dayId]?.trim();
    if (!query) {
      showToast("Please enter a place name or search keyword");
      return;
    }

    const selectedSuggestion = selectedSuggestions[dayId];
    let resolvedPlaceDetail = null as Awaited<
      ReturnType<typeof discoveryService.getPlaceDetail>
    >;

    const isLocalSuggestion = selectedSuggestion?.placeId.startsWith("local:") ?? false;

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

    const resolvedItemName = selectedSuggestion?.name ?? resolvedPlaceDetail?.name ?? query;
    const resolvedItemImage =
      selectedSuggestion?.imageUrl ?? resolvedPlaceDetail?.imageUrl ?? defaultItemImage;
    const resolvedLat = selectedSuggestion?.lat ?? resolvedPlaceDetail?.lat ?? null;
    const resolvedLon = selectedSuggestion?.lon ?? resolvedPlaceDetail?.lon ?? null;

    try {
      const response = await fetch(
        `/02_Trip_Planning_&_Itinerary_Management/api/itineraries/${encodeURIComponent(dayId)}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        previous.map((day) =>
          day.id === dayId
            ? { ...day, items: sortDayItems([...day.items, newItem]) }
            : day
        )
      );

      setSearchInputs((prev) => ({ ...prev, [dayId]: "" }));
      setSelectedSuggestions((prev) => ({ ...prev, [dayId]: undefined }));
      showToast("Place added to itinerary!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add item");
    }
  };

  const handleDeleteItem = async (dayId: string, itemId: string) => {
    if (!canEdit) {
      showToast("Viewer role cannot delete items.");
      return;
    }

    try {
      await deleteItineraryItemAction({ itineraryId: dayId, itemId });
      setDayCards((prev) =>
        prev.map((day) =>
          day.id === dayId
            ? { ...day, items: day.items.filter((item) => item.id !== itemId) }
            : day
        )
      );
      showToast("Item removed from itinerary");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!canEdit) {
      showToast("Viewer role cannot delete days.");
      return;
    }

    try {
      await deleteItineraryAction({ itineraryId: dayId });
      setDayCards((prev) => prev.filter((day) => day.id !== dayId));
      setItineraries((prev) => prev.filter((it) => it.itinerary_id !== dayId));
      setRefreshCounter((v) => v + 1);
      showToast("Itinerary day deleted");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete day");
    }
  };

  const handleAddDay = async (position: "after" | "before" = "after", anchorDayId?: string) => {
    if (!canEdit) {
      showToast("Viewer role cannot add days.");
      return;
    }

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
    const newDate = anchorDay
      ? addDaysToDate(anchorDay.date, position === "before" ? -1 : 1)
      : (trip?.start_date || new Date().toISOString().slice(0, 10));

    try {
      await createItineraryAction({
        tripId: targetTripId || null,
        title: `Day ${itineraries.length + 1}`,
        date: newDate,
        note: null,
      });

      setRefreshCounter((v) => v + 1);
      showToast("New itinerary day added");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add day");
    }
  };

  const handleToggleCollapse = (dayId: string, collapseValue?: boolean) => {
    setDayCards((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? { ...day, isCollapsed: collapseValue ?? !day.isCollapsed }
          : day
      )
    );
  };

  const handleToggleItemEdit = (dayId: string, itemId: string) => {
    if (!canEdit) return;
    setDayCards((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              items: day.items.map((item) =>
                item.id === itemId
                  ? { ...item, isEditingItem: !item.isEditingItem }
                  : item
              ),
            }
          : day
      )
    );
  };

  const handleSaveItem = async (
    dayId: string,
    itemId: string,
    payload: {
      name: string;
      note: string;
      position?: number;
      start_time?: string;
      end_time?: string;
    }
  ) => {
    if (!canEdit) {
      showToast("Viewer role cannot modify items.");
      return;
    }

    try {
      const response = await fetch(
        `/02_Trip_Planning_&_Itinerary_Management/api/itineraries/${encodeURIComponent(
          dayId
        )}/items/${encodeURIComponent(itemId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Failed to save item");

      setDayCards((prev) =>
        prev.map((day) =>
          day.id === dayId
            ? {
                ...day,
                items: day.items.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        name: payload.name,
                        note: payload.note || undefined,
                        position: payload.position ?? item.position,
                        start_time: payload.start_time ?? item.start_time,
                        end_time: payload.end_time ?? item.end_time,
                        isEditingItem: false,
                      }
                    : item
                ),
              }
            : day
        )
      );
      showToast("Item saved!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save item");
    }
  };

  const handleSaveItineraryNote = async (dayId: string, note: string) => {
    if (!canEdit) {
      showToast("Viewer role cannot edit itinerary notes.");
      return false;
    }

    const currentDay = dayCards.find((d) => d.id === dayId);
    if (!currentDay) return false;

    try {
      await updateItineraryAction({
        itineraryId: dayId,
        title: currentDay.title,
        date: currentDay.date,
        note,
      });

      setDayCards((prev) =>
        prev.map((day) =>
          day.id === dayId ? { ...day, note: note.length > 0 ? note : null } : day
        )
      );
      showToast(note.trim().length > 0 ? "Itinerary note saved!" : "Itinerary note cleared!");
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save note");
      return false;
    }
  };

  const handleEditDay = async (dayId: string, nextTitle: string, nextDate: string) => {
    if (!canEdit) {
      showToast("Viewer role cannot edit day titles/dates.");
      return;
    }

    const currentDay = dayCards.find((d) => d.id === dayId);
    if (!currentDay) return;

    try {
      await updateItineraryAction({
        itineraryId: dayId,
        title: nextTitle,
        date: nextDate,
        note: currentDay.note ?? undefined,
      });

      setDayCards((prev) =>
        prev.map((day) =>
          day.id === dayId ? { ...day, title: nextTitle, date: nextDate } : day
        )
      );
      showToast("Day updated");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update day");
    }
  };

  const handleSaveTripNote = async (note: string) => {
    if (!trip || !canEdit) {
      showToast("Viewer role cannot edit trip notes.");
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
      showToast(note.trim().length > 0 ? "Trip note saved!" : "Trip note cleared!");
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update trip note");
      return false;
    }
  };

  if (!targetTripId) return null;

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
              <CalendarDays size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-800">Trip Itinerary Plan</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                    canEdit ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {canEdit ? <Pencil size={11} /> : <Lock size={11} />}
                  {canEdit ? "Editable" : "Read-only"} ({me?.role ?? "Viewer"})
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Directly synchronized with Module 02 Trip Planning workspace
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && trip && (
              <button
                onClick={() => setIsEditTripModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 active:scale-95"
              >
                <SlidersHorizontal size={14} />
                <span>Edit Trip Details</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-95"
              >
                <Plus size={15} />
                <span>Add Day</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Trip Note Card (Module 02 Component) ── */}
      {trip && (
        <TripNoteCard note={trip.trip_note ?? ""} onSaveNote={handleSaveTripNote} />
      )}

      {/* ── Day Itinerary Cards (Module 02 Component) ── */}
      {isLoading ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-400">
          <Loader2 size={24} className="mr-2 animate-spin text-primary-500" />
          Loading itinerary days…
        </div>
      ) : dayCards.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
          <CalendarDays size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">No itinerary days yet</p>
          <p className="mt-1 text-xs text-gray-400">
            {canEdit
              ? "Start building your trip schedule by adding your first itinerary day."
              : "No itinerary schedule has been published for this trip yet."}
          </p>
          {canEdit && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary-500/90"
            >
              <Plus size={14} />
              <span>Create First Day</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {dayCards.map((day) => (
            <DayItineraryCard
              key={day.id}
              day={day}
              searchValue={searchInputs[day.id] ?? ""}
              onSearchChange={(val) => {
                setSearchInputs((prev) => ({ ...prev, [day.id]: val }));
                if (!val.trim()) {
                  setSelectedSuggestions((prev) => ({ ...prev, [day.id]: undefined }));
                }
              }}
              onSelectSuggestion={(sugg) => handleSelectSuggestion(day.id, sugg)}
              onAddItem={() => handleAddItem(day.id)}
              onDeleteItem={(itemId) => void handleDeleteItem(day.id, itemId)}
              onDeleteDay={() => void handleDeleteDay(day.id)}
              onAddDayBefore={(id) => void handleAddDay("before", id)}
              onAddDayAfter={(id) => void handleAddDay("after", id)}
              onToggleCollapse={(collapseValue) => handleToggleCollapse(day.id, collapseValue)}
              onToggleItemEdit={(itemId) => handleToggleItemEdit(day.id, itemId)}
              onSaveItem={(itemId, payload) => void handleSaveItem(day.id, itemId, payload)}
              onSaveNote={(note) => handleSaveItineraryNote(day.id, note)}
              onEditDay={(nextTitle, nextDate) => void handleEditDay(day.id, nextTitle, nextDate)}
            />
          ))}
        </div>
      )}

      {/* ── Module 02 Create Itinerary Modal ── */}
      <CreateItineraryModal
        isOpen={isCreateModalOpen}
        trip={trip}
        itineraries={itineraries}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          setRefreshCounter((v) => v + 1);
          showToast("Itinerary day created!");
        }}
      />

      {/* ── Module 02 Edit Trip Modal ── */}
      <EditTripModal
        isOpen={isEditTripModalOpen}
        trip={trip}
        onClose={() => setIsEditTripModalOpen(false)}
        onSuccess={() => {
          setIsEditTripModalOpen(false);
          setRefreshCounter((v) => v + 1);
          showToast("Trip details updated!");
        }}
      />

      {/* ── Toast Feedback ── */}
      {toastMessage && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
