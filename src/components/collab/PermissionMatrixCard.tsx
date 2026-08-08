"use client";

import { ShieldCheck, Check, X } from "lucide-react";
import {
  PERMISSION_LABELS,
  PERMISSION_MATRIX,
  type CollabRole,
} from "@/src/lib/client/collab/RolePermissions";
import { useCollabStore } from "@/src/store/collab/CollabStore";

const ROLES: CollabRole[] = ["Owner", "Editor", "Viewer"];

export default function PermissionMatrixCard() {
  const trip = useCollabStore((s) =>
    s.trips.find((t) => t.id === s.activeTripId)
  );
  const currentUserId = useCollabStore((s) => s.currentUserId);
  const me = trip?.members.find((m) => m.id === currentUserId);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center gap-3">
        <ShieldCheck size={20} className="text-secondary-500" />
        <h3 className="font-semibold text-gray-800">Role Permissions</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr>
              <th className="pb-2 text-left text-xs font-semibold text-gray-500">
                Capability
              </th>
              {ROLES.map((r) => (
                <th
                  key={r}
                  className={`pb-2 text-center text-xs font-semibold ${
                    me?.role === r ? "text-primary-500" : "text-gray-500"
                  }`}
                >
                  {r}
                  {me?.role === r && (
                    <span className="mt-0.5 block rounded bg-red-50 px-1 text-[9px] font-bold text-primary-500">
                      You
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MATRIX.map((row) => (
              <tr key={row.permission} className="border-t border-gray-100">
                <td className="py-2.5 pr-2 text-xs font-medium text-gray-700">
                  {PERMISSION_LABELS[row.permission]}
                </td>
                {ROLES.map((r) => (
                  <td
                    key={r}
                    className={`py-2.5 text-center ${
                      me?.role === r ? "bg-red-50/40" : ""
                    }`}
                  >
                    {row.roles[r] ? (
                      <Check size={16} className="mx-auto text-success" />
                    ) : (
                      <X size={16} className="mx-auto text-gray-300" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
