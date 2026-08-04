import React from "react";

// Mock Data for User's Saved Collections
const userTrips = [
  {
    id: "1",
    name: "Alor Setar Trip",
    image:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80",
    startDate: "12 Oct 2026",
    endDate: "15 Oct 2026",
    locationsCount: 6,
  },
  {
    id: "2",
    name: "Kuching Trip",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
    startDate: "01 Nov 2026",
    endDate: "05 Nov 2026",
    locationsCount: 9,
  },
  {
    id: "3",
    name: "Penang Heritage Tour",
    image:
      "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80",
    startDate: null,
    endDate: null,
    locationsCount: 4,
  },
];

// Mock Data for Suggested Trips (Updated Melaka Image)
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

export default function PlanningPage() {
  return (
    <div className="space-y-10 pb-12">
      {/* 1. Search Bar (Top Middle Section) */}
      <section className="flex justify-center">
        <div className="relative w-full max-w-xl">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search trip name..."
            className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-800 shadow-sm focus:border-[#ff6b6b] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20"
          />
        </div>
      </section>

      {/* 2 & 3. Subtitle & Create Trip Button Row + Collections Cards */}
      <section className="space-y-6">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-gray-800">
            Trip collection
          </h2>
          <button className="flex items-center gap-2 rounded-xl bg-[#ff6b6b] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#ff5252]">
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

        {/* Collections Cards Carousel / Grid */}
        {userTrips.length === 0 ? (
          /* Fallback Display if no trips found */
          <div className="flex h-48 w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white transition-all hover:border-[#ff6b6b] hover:bg-gray-50">
            <span className="text-lg font-semibold text-[#ff6b6b]">
              + Plan A New Trip
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {userTrips.map((trip) => {
              const hasDates = Boolean(trip.startDate && trip.endDate);

              return (
                <div
                  key={trip.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
                >
                  {/* Trip Card Top Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-gray-200">
                    <img
                      src={trip.image}
                      alt={trip.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Action Dropdown Menu Button */}
                    <div className="group/dropdown absolute right-3 top-3">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-700 backdrop-blur-sm transition-colors hover:bg-white hover:text-gray-900 shadow-sm"
                        aria-label="Trip options"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>

                      {/* Dropdown Menu (Reveals on Hover/Focus for UI Mockup) */}
                      <div className="absolute right-0 top-10 hidden w-40 rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg group-hover/dropdown:block z-10">
                        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100">
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Rename
                        </button>
                        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100">
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
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Change Image
                        </button>
                        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100">
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
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                          </svg>
                          Share
                        </button>
                        <hr className="my-1 border-gray-100" />
                        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                          <svg
                            className="h-4 w-4 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Trip Card Content */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    {/* Trip Name Display */}
                    <h3 className="text-lg font-bold text-gray-800">
                      {trip.name}
                    </h3>

                    {/* Travel Date & Selected Location Number Indicators */}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      {hasDates ? (
                        <>
                          <div className="flex items-center gap-1">
                            <svg
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>
                              {trip.startDate} - {trip.endDate}
                            </span>
                          </div>
                          {/* Location count placed slight right */}
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                            {trip.locationsCount} Locations
                          </span>
                        </>
                      ) : (
                        /* Location indicator takes over if date not found */
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                          {trip.locationsCount} Locations selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Action Card to Add Trip */}
            <div className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 transition-all hover:border-[#ff6b6b] hover:bg-red-50/20">
              <span className="text-base font-semibold text-[#ff6b6b]">
                + Plan A New Trip
              </span>
            </div>
          </div>
        )}
      </section>

      <hr className="border-gray-200" />

      {/* 4. Trip Suggestion List */}
      <section className="space-y-6">
        {/* Subtitle Wording with Refresh Button */}
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

        {/* Suggestion List Cards / Carousel */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {suggestedTrips.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
            >
              {/* Image set by owner */}
              <div className="h-44 w-full bg-gray-200">
                <img
                  src={suggestion.image}
                  alt={suggestion.name}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {suggestion.name}
                  </h3>
                  {/* Description / Owner Notes */}
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    {suggestion.description}
                  </p>
                </div>

                {/* Owner Information */}
                <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-3">
                  <img
                    src={suggestion.owner.avatar}
                    alt={suggestion.owner.username}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    {suggestion.owner.username}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}