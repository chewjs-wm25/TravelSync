"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { listItinerariesAction } from "@/api_layer/02_Trip_Planning_&_Itinerary_Management/itineraryApi";
import { listTripsAction } from "@/api_layer/02_Trip_Planning_&_Itinerary_Management/tripApi";
import CreateItineraryModal from "../components/CreateItineraryModal";
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

function formatTimelineDate(value: string) {
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

export default function TripItineraryPage() {
  const params = useParams<RouteParams>();
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [itineraries, setItineraries] = useState<ItineraryRecord[]>([]);
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

        const currentTrip = trips.find((candidate) => candidate.trip_id === tripId) ?? null;
        setTrip(currentTrip);
        setItineraries(currentTrip ? tripItineraries : []);
      } catch {
        if (isMounted) {
          setTrip(null);
          setItineraries([]);
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

  const tripTitle = trip?.trip_name ?? "Trip itinerary";
  const tripStart = formatTripDate(trip?.start_date ?? null);
  const tripEnd = formatTripDate(trip?.end_date ?? null);
  const canCreateItinerary = Boolean(trip && trip.start_date && trip.end_date);

  return (
    <div className="space-y-8 pb-12">
      <CreateItineraryModal
        isOpen={isCreateModalOpen}
        trip={trip}
        itineraries={itineraries}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleItineraryCreated}
        onInvalidDate={handleInvalidDate}
      />

      {toastMessage ? (
        <div className="fixed right-4 top-4 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-900/10">
          {toastMessage}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Link href="/02_Trip_Planning_&_Itinerary_Management" className="text-sm font-semibold text-[#ff6b6b] transition hover:text-[#ff5252]">
            ← Back to trips
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ff6b6b]">
              Module 02
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {tripTitle}
            </h1>
            {tripStart || tripEnd ? (
              <p className="mt-1 text-sm text-gray-600">
                {tripStart ?? "Trip start date missing"}
                {tripStart && tripEnd ? " - " : ""}
                {tripEnd ?? ""}
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-600">
                Trip dates are not available yet.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!canCreateItinerary || isLoading}
          className="inline-flex items-center gap-2 rounded-full bg-[#ff6b6b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff6b6b]/20 transition hover:bg-[#ff5252] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Itinerary
        </button>
      </div>

      <section className="space-y-5 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              Itinerary Timeline
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Create one itinerary per day to map out the trip in order.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!canCreateItinerary || isLoading}
            className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Add Itinerary
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl border border-dashed border-gray-200 bg-gray-50" />
            <div className="h-28 animate-pulse rounded-2xl border border-dashed border-gray-200 bg-gray-50" />
            <div className="h-28 animate-pulse rounded-2xl border border-dashed border-gray-200 bg-gray-50" />
          </div>
        ) : !trip ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <h3 className="text-lg font-semibold text-gray-900">Trip not found</h3>
            <p className="mt-2 text-sm text-gray-600">
              The itinerary workspace could not find the selected trip.
            </p>
            <Link
              href="/02_Trip_Planning_&_Itinerary_Management"
              className="mt-5 inline-flex rounded-full bg-[#ff6b6b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff6b6b]/20 transition hover:bg-[#ff5252]"
            >
              Return to trips
            </Link>
          </div>
        ) : itineraries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gradient-to-br from-[#fff7f4] to-white px-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
              📅
            </div>
            <h3 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
              No itineraries yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Add the first day plan to start structuring this Malaysia trip.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!canCreateItinerary}
              className="mt-6 inline-flex rounded-full bg-[#ff6b6b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff6b6b]/20 transition hover:bg-[#ff5252] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create first itinerary
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {itineraries.map((itinerary, index) => (
              <article
                key={itinerary.itinerary_id}
                className="flex gap-4 rounded-3xl border border-gray-100 bg-gray-50 p-5 shadow-sm"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-bold text-[#ff6b6b] shadow-sm">
                    {index + 1}
                  </div>
                  <div className="h-full w-px bg-gray-200" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {itinerary.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {formatTimelineDate(itinerary.date)}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                      Day {index + 1}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                    Itinerary items will appear here in the next module step.
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
