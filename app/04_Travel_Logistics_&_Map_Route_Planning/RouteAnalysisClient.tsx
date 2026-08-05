// app/route-analysis/page.tsx
'use client';

import { useTripNavigationStore } from '@/src/store/useTripNavigationStore';

export default function RouteAnalysisClient() {
  const { savedRoutes } = useTripNavigationStore();

  const totalTrips = savedRoutes.length;
  const totalDistance = savedRoutes.reduce((sum, route) => sum + route.summary.distanceKm, 0);
  const totalFuelCost = savedRoutes.reduce((sum, route) => sum + (route.summary.fuelCost || 0), 0);

  const destCount: Record<string, number> = {};
  savedRoutes.forEach((route) => {
    const dest = route.destination?.name || 'Unknown';
    destCount[dest] = (destCount[dest] || 0) + 1;
  });
  const mostFrequentDest = Object.entries(destCount).sort((a, b) => b[1] - a[1])[0];

  const vehicleCount: Record<string, number> = {};
  savedRoutes.forEach((route) => {
    const vehicle = route.vehicleType || 'Unknown';
    vehicleCount[vehicle] = (vehicleCount[vehicle] || 0) + 1;
  });
  const mostUsedVehicle = Object.entries(vehicleCount).sort((a, b) => b[1] - a[1])[0];

  const longestTrip = savedRoutes.reduce(
    (max, route) => (route.summary.distanceKm > max.summary.distanceKm ? route : max),
    savedRoutes[0] || { summary: { distanceKm: 0 }, name: 'N/A' }
  );

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">TravelSync</p>
        <h1 className="text-2xl font-bold text-slate-900">Route Analysis</h1>
      </div>

      {savedRoutes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-sm text-slate-500">
          <p className="text-lg font-semibold text-slate-700">No saved routes yet</p>
          <p className="mt-2">Generate and save a route to see analysis here.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Total Trips</p>
              <p className="text-3xl font-bold text-blue-900">{totalTrips}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Total Distance</p>
              <p className="text-3xl font-bold text-emerald-900">{totalDistance.toFixed(1)} km</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Total Fuel Cost</p>
              <p className="text-3xl font-bold text-amber-900">RM {totalFuelCost.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Most Frequent Destination</p>
              <p className="text-xl font-bold text-slate-900">
                {mostFrequentDest ? `${mostFrequentDest[0]} (${mostFrequentDest[1]} trips)` : 'N/A'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Most Used Vehicle</p>
              <p className="text-xl font-bold text-slate-900">
                {mostUsedVehicle ? `${mostUsedVehicle[0]} (${mostUsedVehicle[1]} trips)` : 'N/A'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Longest Trip</p>
            <p className="text-xl font-bold text-slate-900">
              {longestTrip.name || 'N/A'} — {longestTrip.summary.distanceKm.toFixed(1)} km
            </p>
          </div>
        </>
      )}
    </div>
  );
}