"use client";

import { useTripNavigationStore } from "@/app/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore";

export default function SavedRoutesClient() {
  const { savedRoutes, loadSavedRoute, deleteSavedRoute } = useTripNavigationStore((state) => ({
    savedRoutes: state.savedRoutes,
    loadSavedRoute: state.loadSavedRoute,
    deleteSavedRoute: state.deleteSavedRoute,
  }));

  return (
    <div className="space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-primary-500 text-sm font-semibold tracking-[0.3em] uppercase">
          TravelSync
        </p>
        <h1 className="text-2xl font-bold text-gray-800">Saved Routes</h1>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Saved routes are stored locally in this browser session.
        </p>
        {savedRoutes.length ? (
          <div className="mt-4 space-y-3">
            {savedRoutes.map((route) => (
              <div
                key={route.id}
                className="rounded-2xl border border-gray-200 bg-gray-100 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-800">
                      {route.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {route.summary.distanceKm.toFixed(1)} km • {route.summary.timeMinutes} min • {route.optimizationMode}
                    </p>
                  </div>
                  <span className="bg-secondary-500 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.2em] text-white uppercase">
                    {route.vehicleType}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => loadSavedRoute(route.id)}
                    className="rounded-2xl bg-primary-500 px-3 py-1 text-sm font-semibold text-white hover:bg-primary-600"
                  >
                    Load route
                  </button>
                  <button
                    onClick={() => deleteSavedRoute(route.id)}
                    className="rounded-2xl border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-100 p-8 text-center text-sm text-gray-500">
            No saved routes yet. Create one from the planner page.
          </div>
        )}
      </div>
    </div>
  );
}
