"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

export type TripCardProps = {
  tripId: string;
  name: string;
  image?: string;
  startDate: string | null;
  endDate: string | null;
  locationsCount: number;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
};

export default function TripCard({
  tripId,
  name,
  image,
  startDate,
  endDate,
  locationsCount,
  onEdit,
  onDelete,
}: TripCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasDates = Boolean(startDate && endDate);
  const initial = name.trim().charAt(0).toUpperCase() || "T";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isDeleteDialogOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isDeleteDialogOpen]);

  const closeDeleteDialog = () => {
    if (isDeleting) {
      return;
    }

    setIsDeleteDialogOpen(false);
    setErrorMessage("");
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await onDelete();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to remove trip"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    setIsOpen(false);
    onEdit?.();
  };

  const handleCardNavigate = () => {
    router.push("/02_Trip_Planning_&_Itinerary_Management/" + tripId);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardNavigate();
    }
  };

  return (
    <>
      {isDeleteDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close delete trip dialog"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={closeDeleteDialog}
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl shadow-slate-900/20">
            <div className="border-b border-gray-100 bg-gradient-to-r from-[#fff7f4] via-white to-[#fdf2f0] px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ff6b6b]">
                Confirm action
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                Delete Trip
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                This will remove <span className="font-semibold text-gray-900">{name}</span> from your trip list.
              </p>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This action cannot be undone.
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:opacity-60"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting || !onDelete}
                  className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isDeleting ? "Removing Trip..." : "Delete Trip"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        role="link"
        tabIndex={0}
        aria-label={"Open itinerary for " + name}
        onClick={handleCardNavigate}
        onKeyDown={handleCardKeyDown}
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#ff6b6b]/30 hover:shadow-xl active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b6b] focus-visible:ring-offset-2"
      >
        <div className="relative h-48 w-full overflow-hidden bg-gray-200">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-end bg-gradient-to-br from-amber-100 via-rose-100 to-cyan-100 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/75 text-2xl font-bold text-[#ff6b6b] shadow-sm backdrop-blur-sm">
                {initial}
              </div>
            </div>
          )}

          <div ref={dropdownRef} className="absolute right-3 top-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen((prev) => !prev);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-gray-900 active:scale-90"
              aria-label="Trip options"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {isOpen && (
              <div className="absolute right-0 top-10 z-10 w-40 rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEdit();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen(false);
                    router.push(
                      `/05_Collaboration_&_Shared_Planning?trip=${encodeURIComponent(tripId)}`
                    );
                  }}
                  title="Open this trip in Shared Planning"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200"
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
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen(false);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  disabled={!onDelete}
                >
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
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between p-4">
          <h3 className="text-lg font-bold text-gray-800">{name}</h3>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500">
            {hasDates ? (
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
                  {startDate} - {endDate}
                </span>
              </div>
            ) : (
              <span className="text-gray-400">Dates pending</span>
            )}

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                {locationsCount} Locations
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
