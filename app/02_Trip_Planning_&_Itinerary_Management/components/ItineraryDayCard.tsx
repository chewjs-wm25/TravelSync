import type { ItineraryRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";

type ItineraryDayCardProps = {
  itinerary: ItineraryRecord;
  index: number;
};

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

export function ItineraryDayCard({ itinerary, index }: ItineraryDayCardProps) {
  return (
    <div className="flex flex-col rounded-[1.75rem] border border-gray-200 bg-gray-50/70 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#ff6b6b] uppercase">
            Day {index + 1}
          </p>
          <h3 className="mt-2 text-lg font-bold text-gray-900">
            {itinerary.title}
          </h3>
        </div>

        <div className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
          {formatTimelineDate(itinerary.date)}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-600">
        Scheduled for {formatTimelineDate(itinerary.date)} and ready for the
        next plan step.
      </div>
    </div>
  );
}
