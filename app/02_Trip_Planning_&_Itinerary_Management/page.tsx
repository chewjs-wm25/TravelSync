"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";

import {
  deleteTripAction,
  listTripsAction,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/api/tripApi";
import CreateTripCard from "@/app/02_Trip_Planning_&_Itinerary_Management/components/CreateTripCard";
import CreateTripModal from "@/app/02_Trip_Planning_&_Itinerary_Management/components/CreateTripModal";
import EditTripModal from "@/app/02_Trip_Planning_&_Itinerary_Management/components/EditTripModal";
import SearchBar from "@/app/02_Trip_Planning_&_Itinerary_Management/components/SearchBar";

import TripCard from "@/app/02_Trip_Planning_&_Itinerary_Management/components/TripCard";

type TripRecord = {
  trip_id: string;
  user_id: string;
  trip_name: string;
  start_date: string | null;
  end_date: string | null;
  trip_note: string | null;
  image_url: string | null;
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

export default function PlanningPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripRecord | null>(null);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { isLoggedIn, user, refreshSession } = useAuthStore();

  // Refresh session on mount to pick up cookie-backed session from Module 01
  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    let isMounted = true;

    const loadTrips = async () => {
      setIsLoadingTrips(true);

      try {
        // Only load trips for authenticated users. Module 02 is locked behind login.
        if (!isLoggedIn || !user?.id) {
          if (!isMounted) return;
          setTrips([]);
          setIsLoadingTrips(false);
          return;
        }

        const data = await listTripsAction(user.id);
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
  }, [refreshCounter, isLoggedIn, user?.id]);

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
        <div className="fixed top-4 right-4 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-900/10">
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
            onClick={() => {
              if (!isLoggedIn) {
                // redirect to Module 01 account page to login
                window.location.href = "/01_User_&_Account_Management";
                return;
              }

              setIsCreateModalOpen(true);
            }}
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
          !isLoggedIn ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
              <p className="mb-3 text-lg font-semibold text-gray-800">Module locked</p>
              <p className="mb-4 text-sm text-gray-600">Please sign in to access your trips and create new itineraries.</p>
              <a
                href="/01_User_&_Account_Management"
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff6b6b] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Go to Sign in
              </a>
            </div>
          ) : (
            <CreateTripCard
              variant="empty"
              onOpen={() => setIsCreateModalOpen(true)}
            />
          )
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <TripCard
                key={trip.trip_id}
                tripId={trip.trip_id}
                name={trip.trip_name}
                image={trip.image_url ?? undefined}
                startDate={formatTripDate(trip.start_date)}
                endDate={formatTripDate(trip.end_date)}
                locationsCount={0}
                onEdit={() => setEditingTrip(trip)}
                onDelete={() => handleTripDeleted(trip.trip_id)}
              />
            ))}

            <CreateTripCard onOpen={() => {
                if (!isLoggedIn) {
                  window.location.href = "/01_User_&_Account_Management";
                  return;
                }

                setIsCreateModalOpen(true);
              }} />
          </div>
        )}
      </section>

      <hr className="border-gray-200" />
    </div>
  );
}
