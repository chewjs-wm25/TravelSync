"use client";

import { useTripNavigationStore } from "@/business_logic_layer/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";

const getTimeOfDay = (createdAt?: string) => {
  if (!createdAt) return "Night";
  const hour = new Date(createdAt).getHours();
  if (hour < 6) return "Night";
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
};

export default function RouteAnalysisClient() {
  const { savedRoutes } = useTripNavigationStore();
  const totalTrips = savedRoutes.length;
  const totalDistance = savedRoutes.reduce((sum, route) => sum + route.summary.distanceKm, 0);
  const totalTime = savedRoutes.reduce((sum, route) => sum + route.summary.timeMinutes, 0);
  const totalCost = savedRoutes.reduce(
    (sum, route) => sum + (route.summary.energyCost || route.summary.fuelCost || 0),
    0
  );
  const totalCarbon = savedRoutes.reduce((sum, route) => sum + (route.summary.carbonKg || 0), 0);
  const averageDistance = totalTrips ? totalDistance / totalTrips : 0;
  const averageTime = totalTrips ? totalTime / totalTrips : 0;
  const averageCost = totalTrips ? totalCost / totalTrips : 0;

  const pairs: Record<string, number> = {};
  const timeBuckets = ["Morning", "Afternoon", "Evening", "Night"] as const;
  const times: Record<(typeof timeBuckets)[number], number> = {
    Morning: 0,
    Afternoon: 0,
    Evening: 0,
    Night: 0,
  };
  savedRoutes.forEach((route) => {
    const pair = `${route.origin?.name || "Unknown"} -> ${route.destination?.name || "Unknown"}`;
    pairs[pair] = (pairs[pair] || 0) + 1;
    const timeOfDay = getTimeOfDay(route.createdAt);
    times[timeOfDay] = (times[timeOfDay] || 0) + 1;
  });
  const commonPair = Object.entries(pairs).sort((a, b) => b[1] - a[1])[0];
  const longestTrip = savedRoutes.reduce((max, route) =>
    route.summary.distanceKm > max.summary.distanceKm ? route : max,
    savedRoutes[0] || { summary: { distanceKm: 0 }, name: "N/A" }
  );

  return (
    <div className="space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-primary-500 text-sm font-semibold tracking-[0.3em] uppercase">TravelSync</p>
        <h1 className="text-2xl font-bold text-gray-800">Route Analysis</h1>
      </div>

      {savedRoutes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-100 p-12 text-center text-sm text-gray-500">
          <p className="text-lg font-semibold text-gray-800">No saved routes yet</p>
          <p className="mt-2">Generate and save a route to see analysis here.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-primary-500/10 rounded-2xl border border-gray-200 p-4"><p className="text-primary-500 text-sm font-semibold uppercase">Total trips</p><p className="text-3xl font-bold text-gray-800">{totalTrips}</p></div>
            <div className="bg-secondary-500/10 rounded-2xl border border-gray-200 p-4"><p className="text-secondary-500 text-sm font-semibold uppercase">Total distance</p><p className="text-3xl font-bold text-gray-800">{totalDistance.toFixed(1)} km</p></div>
            <div className="bg-accent-400/10 rounded-2xl border border-gray-200 p-4"><p className="text-accent-400 text-sm font-semibold uppercase">Average trip</p><p className="text-3xl font-bold text-gray-800">{averageDistance.toFixed(1)} km</p></div>
            <div className="rounded-2xl border border-gray-200 bg-emerald-50 p-4"><p className="text-sm font-semibold uppercase text-emerald-700">Carbon footprint</p><p className="text-3xl font-bold text-gray-800">{totalCarbon.toFixed(1)} kg</p></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4"><p className="text-sm font-semibold uppercase text-gray-500">Average time</p><p className="text-xl font-bold text-gray-800">{averageTime.toFixed(0)} min</p></div>
            <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4"><p className="text-sm font-semibold uppercase text-gray-500">Average cost</p><p className="text-xl font-bold text-gray-800">RM {averageCost.toFixed(2)}</p></div>
            <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4"><p className="text-sm font-semibold uppercase text-gray-500">Common route</p><p className="text-xl font-bold text-gray-800">{commonPair ? `${commonPair[0]} (${commonPair[1]})` : "N/A"}</p></div>
            <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4"><p className="text-sm font-semibold uppercase text-gray-500">Saved at what time</p><div className="mt-2 space-y-1 text-sm font-semibold text-gray-800">{timeBuckets.map((timeBucket) => <p key={timeBucket}>{timeBucket} ({timeBucket === "Morning" ? "6am-12pm" : timeBucket === "Afternoon" ? "12pm-6pm" : timeBucket === "Evening" ? "6pm-12am" : "12am-6am"}): {times[timeBucket]} {times[timeBucket] === 1 ? "trip" : "trips"}</p>)}</div></div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4">
            <p className="text-sm font-semibold uppercase text-gray-500">Longest trip</p>
            <p className="text-xl font-bold text-gray-800">{longestTrip.name || "N/A"} - {longestTrip.summary.distanceKm.toFixed(1)} km</p>
            <p className="mt-2 text-sm text-gray-500">Carbon estimates use 2.31 kg CO2/L for fuel and 0.4 kg CO2/kWh for electricity.</p>
          </div>
        </>
      )}
    </div>
  );
}