"use client";

import {
  X,
  Calendar,
  ExternalLink,
  Sparkles,
  MapPin,
  CalendarDays,
  FileText,
  CheckCircle2,
} from "lucide-react";
import type { CollabTrip } from "@/api_layer/05_Collaboration_&_Shared_Planning/types";
import {
  getTripGoogleWebIntentUrl,
  getItemGoogleWebIntentUrl,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/GoogleCalendarSyncService";

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: CollabTrip;
  onDownloadICS?: () => void;
}

export default function GoogleCalendarSyncModal({
  isOpen,
  onClose,
  trip,
  onDownloadICS,
}: GoogleCalendarSyncModalProps) {
  if (!isOpen) return null;

  const totalItems = trip.items?.length || 0;

  const handleOpenWebIntent = () => {
    const url = getTripGoogleWebIntentUrl(trip);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-gray-800">Add to Google Calendar</h2>
                <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-700">
                  Instant
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate max-w-xs">{trip.tripName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Trip Summary Mini-Card */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">{trip.tripName}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 shadow-2xs border border-gray-200/60">
                {totalItems} {totalItems === 1 ? "Item" : "Items"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
              {trip.region && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-gray-400" />
                  {trip.region}
                </span>
              )}
              {trip.startDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} className="text-gray-400" />
                  {trip.startDate} {trip.endDate ? `~ ${trip.endDate}` : ""}
                </span>
              )}
            </div>
          </div>

          {/* 1-Click Instant Add Section */}
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/70 to-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Sparkles size={14} className="text-blue-600" />
                <span>1-Click Instant Add</span>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1">
                <CheckCircle2 size={10} />
                No Auth Needed
              </span>
            </div>
            <p className="text-xs leading-relaxed text-gray-600">
              Opens your Google Calendar with this entire trip&apos;s schedule, dates, places, and notes automatically pre-filled. Just click <b>Save</b> in Google Calendar!
            </p>

            {/* Primary Action Button */}
            <button
              onClick={handleOpenWebIntent}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer"
            >
              <Calendar size={18} />
              <span>Open & Add Full Trip to Google Calendar</span>
              <ExternalLink size={14} />
            </button>

            {/* Individual Item Add */}
            {trip.items && trip.items.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-blue-100">
                <div className="text-[11px] font-semibold text-gray-500">
                  Or add individual places to Google Calendar:
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {trip.items.map((item) => (
                    <div
                      key={item.itemId}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                    >
                      <span className="truncate max-w-[220px] text-[11px] font-medium">
                        Day {item.day}: {item.name}
                      </span>
                      <button
                        onClick={() =>
                          window.open(getItemGoogleWebIntentUrl(item, trip), "_blank", "noopener,noreferrer")
                        }
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5 cursor-pointer transition-colors active:opacity-70"
                      >
                        <span>Add</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Guide */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-[11px] text-gray-500 space-y-1">
            <div className="font-semibold text-gray-700">How it works:</div>
            <p>
              1. Click the button above to open Google Calendar in a new tab.<br />
              2. Review the pre-filled itinerary notes and schedule.<br />
              3. Click <b>Save</b> in your Google Calendar.
            </p>
          </div>

          {/* Optional ICS download link */}
          {onDownloadICS && (
            <div className="pt-2 text-center">
              <button
                onClick={onDownloadICS}
                className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition cursor-pointer active:opacity-70"
              >
                <FileText size={11} />
                <span>Download .ics file for Apple Calendar / Outlook</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
