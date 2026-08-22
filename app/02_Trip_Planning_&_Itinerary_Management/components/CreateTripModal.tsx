"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { createTripAction } from "@/app/02_Trip_Planning_&_Itinerary_Management/api/tripApi";
import { discoveryService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";
import type { SuggestionItem } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/types";

type CreateTripModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateTripModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTripModalProps) {
  const [tripName, setTripName] = useState("");
  const [tripNote, setTripNote] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const tripNameRef = useRef<HTMLInputElement>(null);

  // State suggestions (from module 03 suggestions)
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
  const suggestionTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setTripName("");
      setTripNote("");
      setStartDate("");
      setEndDate("");
      setErrorMessage("");
      setStateSuggestions([]);
      tripNameRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [isOpen]);

  // Debounced state suggestion based on tripName using module 03 DiscoveryService
  useEffect(() => {
    if (suggestionTimer.current) {
      window.clearTimeout(suggestionTimer.current);
      suggestionTimer.current = null;
    }

    const trimmed = tripName.trim();
    if (!trimmed) {
      setStateSuggestions([]);
      return;
    }

    suggestionTimer.current = window.setTimeout(() => {
      void discoveryService
        .getSuggestions(trimmed)
        .then((items: SuggestionItem[]) => {
          // parse state from formatted string, e.g. "Batu Caves, Selangor, Malaysia"
          const states = new Set<string>();
          for (const it of items) {
            const parts = (it.formatted || "").split(",").map((p) => p.trim()).filter(Boolean);
            if (parts.length >= 2) {
              // take the segment before the last (country)
              const candidate = parts[parts.length - 2];
              if (candidate && candidate.toLowerCase() !== "malaysia") {
                states.add(candidate);
              }
            }
          }
          setStateSuggestions(Array.from(states).slice(0, 5));
        })
        .catch(() => setStateSuggestions([]));
    }, 350) as unknown as number;

    return () => {
      if (suggestionTimer.current) {
        window.clearTimeout(suggestionTimer.current);
        suggestionTimer.current = null;
      }
    };
  }, [tripName]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await createTripAction({
        userId: "usr_demo",
        tripName,
        tripNote,
        startDate,
        endDate,
      });

      onSuccess();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create trip"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label="Close create trip modal"
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
                Create Trip
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Start a Malaysia-only trip workspace and capture the first
                notes.
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
                Trip Name <span className="text-[#ff6b6b]">*</span>
              </span>
              <div className="space-y-2">
              <input
                ref={tripNameRef}
                value={tripName}
                onChange={(event) => setTripName(event.target.value)}
                maxLength={100}
                placeholder="e.g. Langkawi Island Escape"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition outline-none focus:border-[#ff6b6b] focus:ring-4 focus:ring-[#ff6b6b]/10"
                required
              />

              {stateSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {stateSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        // apply suggested state into trip note if empty, otherwise append
                        setTripNote((prev) =>
                          prev.trim().length === 0 ? s : `${prev} — ${s}`
                        );
                      }}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

               </div>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-gray-700">
                Destination / Note
              </span>
              <textarea
                value={tripNote}
                onChange={(event) => setTripNote(event.target.value)}
                rows={4}
                placeholder="Short summary, destination ideas, or Malaysia travel context"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition outline-none focus:border-[#ff6b6b] focus:ring-4 focus:ring-[#ff6b6b]/10"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Start Date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={endDate || undefined}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition outline-none focus:border-[#ff6b6b] focus:ring-4 focus:ring-[#ff6b6b]/10"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                End Date
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={startDate || undefined}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition outline-none focus:border-[#ff6b6b] focus:ring-4 focus:ring-[#ff6b6b]/10"
              />
            </label>
          </div>

          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Malaysia scope only. Keep the note aligned to destinations and ideas
            within Malaysia.
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
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-full bg-[#ff6b6b] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff6b6b]/20 transition hover:bg-[#ff5252] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating Trip..." : "Create Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
