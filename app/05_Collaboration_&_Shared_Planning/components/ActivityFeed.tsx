"use client";

import { History } from "lucide-react";
import { useCollabStore } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";

function timeAgo(at: number): string {
  const diff = Date.now() - at;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ActivityFeed() {
  const trip = useCollabStore((s) =>
    s.trips.find((t) => t.id === s.activeTripId) ?? s.trips[0]
  );
  if (!trip) return null;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center gap-3">
        <History size={20} className="text-primary-500" />
        <h3 className="font-semibold text-gray-800">Recent Activity</h3>
      </div>
      <ol className="relative space-y-4 border-l border-gray-200 pl-5">
        {trip.activity.slice(0, 8).map((entry) => (
          <li key={entry.id} className="relative">
            <span className="absolute top-1.5 -left-[26px] h-2 w-2 rounded-full border-2 border-white bg-primary-500" />
            <p className="text-xs leading-relaxed text-gray-700">
              <span className="font-semibold text-gray-800">{entry.actor}</span>{" "}
              {entry.action}
            </p>
            <p className="text-[10px] text-gray-400">{timeAgo(entry.at)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}