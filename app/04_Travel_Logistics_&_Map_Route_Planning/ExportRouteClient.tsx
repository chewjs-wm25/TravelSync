// app/export-route/page.tsx
"use client";

import { useState } from "react";
import { useTripNavigationStore } from "@/app/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";

export default function ExportRouteClient() {
  const { origin, destination, savedRoutes } = useTripNavigationStore();
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");

  const hasCurrentRoute = Boolean(origin && destination);
  const selectedRoute = savedRoutes.find(
    (route) => route.id === selectedRouteId
  );

  const exportToGoogleMaps = (
    routeOrigin?: typeof origin,
    routeDest?: typeof destination
  ) => {
    const o = routeOrigin || origin;
    const d = routeDest || destination;
    if (!o || !d) return;
    const url = `https://www.google.com/maps/dir/${o.lat},${o.lng}/${d.lat},${d.lng}`;
    window.open(url, "_blank");
  };

  const exportToWaze = (routeDest?: typeof destination) => {
    const d = routeDest || destination;
    if (!d) return;
    const url = `https://waze.com/ul?ll=${d.lat},${d.lng}&navigate=yes`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-primary-500 text-sm font-semibold tracking-[0.3em] uppercase">
          TravelSync
        </p>
        <h1 className="text-2xl font-bold text-gray-800">Export Route</h1>
      </div>

      {hasCurrentRoute && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Current Route</h2>
          <p className="mt-1 text-sm text-gray-500">
            {origin?.name} → {destination?.name}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => exportToGoogleMaps()}
              className="bg-primary-500 hover:bg-primary-500/90 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
            >
              Open in Google Maps
            </button>
            <button
              onClick={() => exportToWaze()}
              className="bg-secondary-500 hover:bg-secondary-500/90 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
            >
              Open in Waze
            </button>
          </div>
        </div>
      )}

      {savedRoutes.length > 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            Export Saved Route
          </h2>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            className="focus:border-primary-500 mt-3 w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm outline-none"
          >
            <option value="">Select a saved route...</option>
            {savedRoutes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name} ({route.summary.distanceKm.toFixed(1)} km)
              </option>
            ))}
          </select>

          {selectedRoute && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-gray-500">
                {selectedRoute.origin?.name || "N/A"} →{" "}
                {selectedRoute.destination?.name || "N/A"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    exportToGoogleMaps(
                      selectedRoute.origin,
                      selectedRoute.destination
                    )
                  }
                  className="bg-primary-500 hover:bg-primary-500/90 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
                >
                  Google Maps
                </button>
                <button
                  onClick={() => exportToWaze(selectedRoute.destination)}
                  className="bg-secondary-500 hover:bg-secondary-500/90 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
                >
                  Waze
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!hasCurrentRoute && savedRoutes.length === 0 && (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-100 p-12 text-center">
          <p className="text-lg font-semibold text-gray-800">
            No route to export
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Generate a route or save one first!
          </p>
        </div>
      )}
    </div>
  );
}
