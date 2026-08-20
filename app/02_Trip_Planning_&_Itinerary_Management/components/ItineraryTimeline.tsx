import type { TripRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripRepository";
import type { ItineraryRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";

import { ItineraryDayCard } from "./ItineraryDayCard";

type ItineraryTimelineProps = {
  trip: TripRecord | null;
  itineraries: ItineraryRecord[];
  isLoading: boolean;
  canCreate: boolean;
  onCreate: () => void;
};

export function ItineraryTimeline({
  trip,
  itineraries,
  isLoading,
  canCreate,
  onCreate,
}: ItineraryTimelineProps) {
  return (
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
          onClick={onCreate}
          disabled={!canCreate || isLoading}
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
          <h3 className="text-lg font-semibold text-gray-900">
            Trip not found
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            The itinerary workspace could not find the selected trip.
          </p>
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
            onClick={onCreate}
            disabled={!canCreate}
            className="mt-6 inline-flex rounded-full bg-[#ff6b6b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff6b6b]/20 transition hover:bg-[#ff5252] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create first itinerary
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {itineraries.map((itinerary, index) => (
            <ItineraryDayCard
              key={itinerary.itinerary_id}
              itinerary={itinerary}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  );
}
