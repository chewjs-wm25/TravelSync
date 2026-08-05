'use client';

import { useTripNavigationStore } from '@/app/04_Travel_Logistics_&_Map_Route_Planning/useTripNavigationStore';

export default function SavedRoutesClient() {
  const savedRoutes = useTripNavigationStore((state) => state.savedRoutes);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">TravelSync</p>
        <h1 className="text-2xl font-bold text-slate-900">Saved Routes</h1>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Saved routes are stored locally in this browser session.</p>
        {savedRoutes.length ? (
          <div className="mt-4 space-y-3">
            {savedRoutes.map((route) => (
              <div key={route.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">{route.name}</h2>
                    <p className="text-sm text-slate-500">
                      {route.summary.distanceKm.toFixed(1)} km • {route.summary.timeMinutes} min
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    {route.vehicleType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No saved routes yet. Create one from the planner page.
          </div>
        )}
      </div>
    </div>
  );
}
