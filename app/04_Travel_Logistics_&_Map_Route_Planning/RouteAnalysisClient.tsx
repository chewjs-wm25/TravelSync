// app/route-analysis/page.tsx
"use client";

import { useTripNavigationStore } from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";

export default function RouteAnalysisClient() {
  const { savedRoutes } = useTripNavigationStore();

  const totalTrips = savedRoutes.length;
  const totalDistance = savedRoutes.reduce(
    (sum, route) => sum + route.summary.distanceKm,
    0
  );
  const totalFuelCost = savedRoutes.reduce(
    (sum, route) => sum + (route.summary.fuelCost || 0),
    0
  );

  const destCount: Record<string, number> = {};
  savedRoutes.forEach((route) => {
    const dest = route.destination?.name || "Unknown";
    destCount[dest] = (destCount[dest] || 0) + 1;
  });
  const mostFrequentDest = Object.entries(destCount).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const vehicleCount: Record<string, number> = {};
  savedRoutes.forEach((route) => {
    const vehicle = route.vehicleType || "Unknown";
    vehicleCount[vehicle] = (vehicleCount[vehicle] || 0) + 1;
  });
  const mostUsedVehicle = Object.entries(vehicleCount).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const longestTrip = savedRoutes.reduce(
    (max, route) =>
      route.summary.distanceKm > max.summary.distanceKm ? route : max,
    savedRoutes[0] || { summary: { distanceKm: 0 }, name: "N/A" }
  );

  return (
    <div className="space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-primary-500 text-sm font-semibold tracking-[0.3em] uppercase">
          TravelSync
        </p>
        <h1 className="text-2xl font-bold text-gray-800">Route Analysis</h1>
      </div>

      {savedRoutes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-100 p-12 text-center text-sm text-gray-500">
          <p className="text-lg font-semibold text-gray-800">
            No saved routes yet
          </p>
          <p className="mt-2">
            Generate and save a route to see analysis here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-primary-500/10 rounded-2xl border border-gray-200 p-4">
              <p className="text-primary-500 text-sm font-semibold tracking-[0.2em] uppercase">
                Total Trips
              </p>
              <p className="text-3xl font-bold text-gray-800">{totalTrips}</p>
            </div>
            <div className="bg-secondary-500/10 rounded-2xl border border-gray-200 p-4">
              <p className="text-secondary-500 text-sm font-semibold tracking-[0.2em] uppercase">
                Total Distance
              </p>
              <p className="text-3xl font-bold text-gray-800">
                {totalDistance.toFixed(1)} km
              </p>
            </div>
            <div className="bg-accent-400/10 rounded-2xl border border-gray-200 p-4">
              <p className="text-accent-400 text-sm font-semibold tracking-[0.2em] uppercase">
                Total Fuel Cost
              </p>
              <p className="text-3xl font-bold text-gray-800">
                RM {totalFuelCost.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4">
              <p className="text-sm font-semibold tracking-[0.2em] text-gray-500 uppercase">
                Most Frequent Destination
              </p>
              <p className="text-xl font-bold text-gray-800">
                {mostFrequentDest
                  ? `${mostFrequentDest[0]} (${mostFrequentDest[1]} trips)`
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4">
              <p className="text-sm font-semibold tracking-[0.2em] text-gray-500 uppercase">
                Most Used Vehicle
              </p>
              <p className="text-xl font-bold text-gray-800">
                {mostUsedVehicle
                  ? `${mostUsedVehicle[0]} (${mostUsedVehicle[1]} trips)`
                  : "N/A"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4">
            <p className="text-sm font-semibold tracking-[0.2em] text-gray-500 uppercase">
              Longest Trip
            </p>
            <p className="text-xl font-bold text-gray-800">
              {longestTrip.name || "N/A"} —{" "}
              {longestTrip.summary.distanceKm.toFixed(1)} km
            </p>
          </div>
        </>
      )}
    </div>
  );
}
