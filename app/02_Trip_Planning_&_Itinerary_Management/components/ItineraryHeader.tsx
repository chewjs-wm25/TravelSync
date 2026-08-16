import Link from "next/link";

type ItineraryHeaderProps = {
  tripTitle: string;
  tripStart: string | null;
  tripEnd: string | null;
  onCreate: () => void;
  canCreate: boolean;
  isLoading: boolean;
};

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) {
    return "No travel dates set";
  }

  if (start && end) {
    return `${start} - ${end}`;
  }

  return start ?? end ?? "No travel dates set";
}

export function ItineraryHeader({
  tripTitle,
  tripStart,
  tripEnd,
  onCreate,
  canCreate,
  isLoading,
}: ItineraryHeaderProps) {
  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/02_Trip_Planning_&_Itinerary_Management"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
        >
          <svg
            className="h-4 w-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to trips
        </Link>
      </div>

      <div className="relative flex min-h-[170px] flex-col justify-between rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-[#ff6b6b] uppercase">
            Module 02
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
            {tripTitle}
          </h1>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <svg
              className="h-4 w-4 text-[#ff6b6b]"
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
            <span>{formatDateRange(tripStart, tripEnd)}</span>
          </div>

          <button
            type="button"
            onClick={onCreate}
            disabled={!canCreate || isLoading}
            className="inline-flex items-center gap-2 rounded-full bg-[#ff6b6b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff6b6b]/20 transition hover:bg-[#ff5252] disabled:cursor-not-allowed disabled:opacity-60"
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
            Add Itinerary
          </button>
        </div>
      </div>
    </div>
  );
}
