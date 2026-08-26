"use client";

import { useState } from "react";
import {
  CalendarDays,
  Plus,
  Trash2,
  Lock,
  Pencil,
} from "lucide-react";
import {
  can,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/RolePermissions";
import { useCollabStore } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";

export default function ItineraryPermissionDemo() {
  const trip = useCollabStore((s) =>
    s.trips.find((t) => t.tripId === s.activeTripId) ?? s.trips[0]
  );
  const currentUserId = useCollabStore((s) => s.currentUserId);
  const addItem = useCollabStore((s) => s.addItem);
  const removeItem = useCollabStore((s) => s.removeItem);

  const me = trip?.members.find((m) => m.id === currentUserId);
  const canEdit = can(me?.role ?? "Viewer", "editItinerary");

  const [day, setDay] = useState(1);
  const [title, setTitle] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  if (!trip || !me) return null;

  const grouped = trip.items.reduce<Record<number, typeof trip.items>>(
    (acc, item) => {
      (acc[item.day] = acc[item.day] ?? []).push(item);
      return acc;
    },
    {}
  );
  const days = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  const handleAdd = () => {
    if (!title.trim()) return;
    addItem(day, title.trim());
    setTitle("");
    setNotice(`Added to Day ${day} by ${me.name}`);
    setTimeout(() => setNotice(null), 2500);
  };

  const handleRemove = (id: string, itemTitle: string) => {
    removeItem(id);
    setNotice(`Removed "${itemTitle}" (${me.name})`);
    setTimeout(() => setNotice(null), 2500);
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-800">
          <CalendarDays size={20} className="text-primary-500" />
          Shared Itinerary
        </h2>
        <span
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
            canEdit
              ? "bg-success/10 text-success"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {canEdit ? <Pencil size={12} /> : <Lock size={12} />}
          {canEdit ? "Editable" : "Read-only"} · {me.role}
        </span>
      </div>

      {/* Add-item control only when permitted */}
      {canEdit && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-gray-100 bg-[#FAF8FF] p-4 sm:flex-row">
          <div className="flex-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add a new itinerary item..."
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-24 appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-primary-500"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97]"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>
      )}

      {days.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          No itinerary items yet.
        </p>
      ) : (
        <div className="space-y-4">
          {days.map((d) => (
            <div key={d}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Day {d}
              </p>
              <div className="space-y-2">
                {grouped[d].map((item) => (
                  <div
                    key={item.itemId}
                    className="group flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3 transition hover:border-gray-200"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.name}
                      </p>
                      {item.note && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {item.note}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleRemove(item.itemId, item.name)}
                        className="text-gray-300 transition hover:text-error"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!canEdit && (
        <p className="mt-4 rounded-xl bg-[#FAF8FF] px-4 py-3 text-xs text-gray-500">
          <b>Viewer</b> role has read-only access. Switch to an <b>Editor</b> or{" "}
          <b>Owner</b> in the demo switcher to add / remove itinerary items.
        </p>
      )}

      {notice && (
        <div className="pointer-events-none fixed top-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-2xl">
          {notice}
        </div>
      )}
    </div>
  );
}