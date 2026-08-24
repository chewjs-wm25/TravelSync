"use client";

import Image from "next/image";
import { Users, UserRound } from "lucide-react";
import { useCollabStore } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";

/**
 * Demo-only control: switch which member the UI is "acting as".
 * Lets you experience the permission differences between Owner / Editor / Viewer.
 */
export default function DemoIdentitySwitcher() {
  const trip = useCollabStore((s) =>
    s.trips.find((t) => t.id === s.activeTripId) ?? s.trips[0]
  );
  const currentUserId = useCollabStore((s) => s.currentUserId);
  const setCurrentUser = useCollabStore((s) => s.setCurrentUser);

  if (!trip) return null;

  return (
    <div className="rounded-2xl border-2 border-dashed border-secondary-500/40 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users size={16} className="text-secondary-500" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Demo · View as
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {trip.members.map((m) => {
          const active = m.id === currentUserId;
          return (
            <button
              key={m.id}
              onClick={() => setCurrentUser(m.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] ${
                active
                  ? "border-secondary-500 bg-secondary-500 text-white shadow-md"
                  : "border-gray-200 bg-white text-gray-500 hover:border-secondary-500 hover:text-secondary-500"
              }`}
            >
              {m.avatar ? (
                <span className="relative h-5 w-5 overflow-hidden rounded-full">
                  <Image src={m.avatar} alt={m.name} fill sizes="20px" />
                </span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/30">
                  <UserRound size={12} />
                </span>
              )}
              {m.name.split(" ")[0]} · {m.role}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-gray-400">
        Switch identity to preview role-based permissions in real time.
      </p>
    </div>
  );
}