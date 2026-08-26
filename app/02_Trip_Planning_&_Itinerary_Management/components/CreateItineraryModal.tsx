"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type TripRecord = {
  trip_id: string;
  trip_name: string;
  start_date: string | null;
  end_date: string | null;
};

type ItineraryRecord = {
  itinerary_id: string;
  trip_id: string;
  title: string;
  date: string;
  note?: string | null;
};

type CreateItineraryModalProps = {
  isOpen: boolean;
  trip: TripRecord | null;
  itineraries: ItineraryRecord[];
  onClose: () => void;
  onSuccess: () => void;
  onInvalidDate?: () => void;
};

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function isWithinTripWindow(
  value: string,
  trip: Pick<TripRecord, "start_date" | "end_date">
) {
  if (!trip.start_date || !trip.end_date) {
    return false;
  }

  return value >= trip.start_date && value <= trip.end_date;
}

function getLatestItineraryDate(itineraries: ItineraryRecord[]) {
  return itineraries.reduce<string | null>((latest, itinerary) => {
    if (!latest || itinerary.date > latest) {
      return itinerary.date;
    }

    return latest;
  }, null);
}

function getDefaultTitle(trip: TripRecord, itineraries: ItineraryRecord[]) {
  return `Day ${itineraries.length + 1} - ${trip.trip_name}`;
}

function getDefaultDate(trip: TripRecord, itineraries: ItineraryRecord[]) {
  const latestDate = getLatestItineraryDate(itineraries);
  if (latestDate) {
    const nextDate = addDays(latestDate, 1);
    if (trip.end_date && nextDate > trip.end_date) {
      return trip.end_date;
    }

    return nextDate;
  }

  return trip.start_date ?? "";
}

export default function CreateItineraryModal({
  isOpen,
  trip,
  itineraries,
  onClose,
  onSuccess,
  onInvalidDate,
}: CreateItineraryModalProps) {
  const [title, setTitle] = useState(() =>
    trip ? getDefaultTitle(trip, itineraries) : ""
  );
  const [date, setDate] = useState(() =>
    trip ? getDefaultDate(trip, itineraries) : ""
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !trip) {
      return;
    }

    setTitle(getDefaultTitle(trip, itineraries));
    setDate(getDefaultDate(trip, itineraries));
    setNote("");
    setErrorMessage("");

    window.setTimeout(() => {
      titleRef.current?.focus();
    }, 0);
  }, [isOpen, trip, itineraries]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const getDateValidationMessage = (candidate: string) => {
    if (!trip || !candidate) {
      return "";
    }

    if (!isWithinTripWindow(candidate, trip)) {
      return "Date must fall within trip duration";
    }

    return "";
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    const nextError = getDateValidationMessage(value);
    setErrorMessage(nextError);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trip) {
      return;
    }

    const nextError = getDateValidationMessage(date);
    if (nextError) {
      setErrorMessage(nextError);
      onInvalidDate?.();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Use server action for creating an itinerary (consistent with other create actions)
      // import createItineraryAction at top of file
      // The server action will throw on failure with a meaningful message
      // (e.g., "Invalid date!") which we surface to the user.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Server action import from a 'use server' module
      const { createItineraryAction } = await import(
        "@/app/02_Trip_Planning_&_Itinerary_Management/api/itineraryApi"
      );

      await createItineraryAction({
        tripId: trip.trip_id,
        title,
        date,
        note,
      });

      onSuccess();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create itinerary";

      if (message === "Invalid date!") {
        setErrorMessage("Date must fall within trip duration");
        onInvalidDate?.();
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !trip) {
    return null;
  }

  const dateHint =
    trip.start_date && trip.end_date
      ? `Must be between ${trip.start_date} and ${trip.end_date}.`
      : "Trip dates are required before itineraries can be created.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label="Close create itinerary modal"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl shadow-slate-900/20">
        <div className="border-b border-gray-100 bg-gradient-to-r from-[#fff7f4] via-white to-[#fdf2f0] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-[#ff6b6b] uppercase">
                Module 02
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                Create Itinerary
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Add a new day plan to your Malaysia trip workspace.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:text-gray-900"
              aria-label="Close modal"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-gray-700">
                Itinerary Title <span className="text-[#ff6b6b]">*</span>
              </span>
              <input
                ref={titleRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={60}
                placeholder="e.g. Day 2 - Batu Caves & City Tour"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition outline-none focus:border-[#ff6b6b] focus:ring-4 focus:ring-[#ff6b6b]/10"
                required
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-gray-700">
                Itinerary Date <span className="text-[#ff6b6b]">*</span>
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => handleDateChange(event.target.value)}
                min={trip.start_date || undefined}
                max={trip.end_date || undefined}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition outline-none focus:border-[#ff6b6b] focus:ring-4 focus:ring-[#ff6b6b]/10"
                required
              />
              <p className="text-xs text-gray-500">{dateHint}</p>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-gray-700">
                Itinerary Note
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Add reminders, route context, or day-specific notes"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition outline-none focus:border-[#ff6b6b] focus:ring-4 focus:ring-[#ff6b6b]/10"
              />
            </label>
          </div>

          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The selected day must stay inside the trip duration window.
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-full bg-[#ff6b6b] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff6b6b]/20 transition hover:bg-[#ff5252] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating..." : "Add Day"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}