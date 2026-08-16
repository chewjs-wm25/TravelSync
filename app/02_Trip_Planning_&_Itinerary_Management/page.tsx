"use client";

import { useEffect, useState } from "react";

import {
  deleteTripAction,
  listTripsAction,
} from "@/api_layer/02_Trip_Planning_&_Itinerary_Management/tripApi";
import CreateTripCard from "@/app/02_Trip_Planning_&_Itinerary_Management/components/CreateTripCard";
import CreateTripModal from "@/app/02_Trip_Planning_&_Itinerary_Management/components/CreateTripModal";
import EditTripModal from "@/app/02_Trip_Planning_&_Itinerary_Management/components/EditTripModal";
import SearchBar from "@/app/02_Trip_Planning_&_Itinerary_Management/components/SearchBar";
import SuggestedTripCard from "@/app/02_Trip_Planning_&_Itinerary_Management/components/SuggestedTripCard";
import TripCard from "@/app/02_Trip_Planning_&_Itinerary_Management/components/TripCard";

type TripRecord = {
  trip_id: string;
  user_id: string;
  trip_name: string;
  start_date: string | null;
  end_date: string | null;
  trip_note: string | null;
};

const suggestedTrips = [
  {
    id: "s1",
    name: "Langkawi Island Escape",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    description:
      "A serene 4-day itinerary covering Cable Car rides, pristine beach sunsets, and mangrove boat tours.",
    owner: {
      username: "traveler_sam",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    },
  },
  {
    id: "s2",
    name: "Melaka Historic Walk",
    image:
      "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80",
    description:
      "Relaxed weekend exploring Jonker Street night market, Nyonya food hotspots, and river cruises.",
    owner: {
      username: "history_buff_99",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    },
  },
  {
    id: "s3",
    name: "Kota Kinabalu Adventure",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    description:
      "Mountain views at Mount Kinabalu park combined with island hopping near Tunku Abdul Rahman Marine Park.",
    owner: {
      username: "hiking_alex",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    },
  },
];

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

export default function PlanningPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripRecord | null>(null);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTrips = async () => {
      setIsLoadingTrips(true);

      try {
        const data = await listTripsAction("usr_demo");
        if (!isMounted) {
          return;
        }

        setTrips(data);
      } catch {
        if (isMounted) {
          setTrips([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTrips(false);
        }
      }
    };

    void loadTrips();

    return () => {
      isMounted = false;
    };
  }, [refreshCounter]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const handleTripCreated = () => {
    setIsCreateModalOpen(false);
    setRefreshCounter((value) => value + 1);
    setToastMessage("Trip Successfully Created!");
  };

  const handleTripUpdated = () => {
    setEditingTrip(null);
    setRefreshCounter((value) => value + 1);
    setToastMessage("Trip Updated Successfully!");
  };

  const handleTripDeleted = async (tripId: string) => {
    await deleteTripAction({ tripId });
    setRefreshCounter((value) => value + 1);
    setToastMessage("Trip Removed Successfully");
  };

  return (
    <div className="space-y-10 pb-12">
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTripCreated}
      />

      <EditTripModal
        isOpen={Boolean(editingTrip)}
        trip={editingTrip}
        onClose={() => setEditingTrip(null)}
        onSuccess={handleTripUpdated}
      />

      {toastMessage ? (
        <div className="fixed right-4 top-4 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-900/10">
          {toastMessage}
        </div>
      ) : null}

      <SearchBar />

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-gray-800">
            Trip collection
          </h2>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#ff6b6b] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#ff5252]"
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
            Start New Trip
          </button>
        </div>

        {isLoadingTrips ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-[320px] animate-pulse rounded-2xl border border-dashed border-gray-200 bg-gray-50" />
            <div className="h-[320px] animate-pulse rounded-2xl border border-dashed border-gray-200 bg-gray-50" />
            <div className="h-[320px] animate-pulse rounded-2xl border border-dashed border-gray-200 bg-gray-50" />
          </div>
        ) : trips.length === 0 ? (
          <CreateTripCard variant="empty" onOpen={() => setIsCreateModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <TripCard
                key={trip.trip_id}
                tripId={trip.trip_id}
                name={trip.trip_name}
                startDate={formatTripDate(trip.start_date)}
                endDate={formatTripDate(trip.end_date)}
                locationsCount={0}
                onEdit={() => setEditingTrip(trip)}
                onDelete={() => handleTripDeleted(trip.trip_id)}
              />
            ))}

            <CreateTripCard onOpen={() => setIsCreateModalOpen(true)} />
          </div>
        )}
      </section>

      <hr className="border-gray-200" />

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-800">
              Explore
            </h2>
            <h3 className="mt-0.5 text-xs font-medium text-gray-500">
              Suggested Trip
            </h3>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {suggestedTrips.map((suggestion) => (
            <SuggestedTripCard
              key={suggestion.id}
              name={suggestion.name}
              image={suggestion.image}
              description={suggestion.description}
              owner={suggestion.owner}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
