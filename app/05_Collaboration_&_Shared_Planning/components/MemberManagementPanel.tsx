"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Users,
  MoreVertical,
  LogOut,
  ShieldCheck,
  Trash2,
  UserRound,
  Check,
} from "lucide-react";
import {
  can,
  type CollabRole,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/RolePermissions";
import {
  useCollabStore,
  type CollabMember,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";
import RoleBadge from "./RoleBadge";

const ROLE_OPTIONS: Exclude<CollabRole, "Owner">[] = ["Editor", "Viewer"];

export default function MemberManagementPanel() {
  const trip = useCollabStore((s) =>
    s.trips.find((t) => t.id === s.activeTripId) ?? s.trips[0]
  );
  const currentUserId = useCollabStore((s) => s.currentUserId);
  const changeRole = useCollabStore((s) => s.changeRole);
  const removeMember = useCollabStore((s) => s.removeMember);
  const leaveTrip = useCollabStore((s) => s.leaveTrip);

  const me = trip?.members.find((m) => m.id === currentUserId);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!trip || !me) return null;

  const isOwner = can(me.role, "changeRole");
  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

  const onlineCount = trip.members.filter((m) => m.online).length;

  const handleRoleChange = (member: CollabMember, role: Exclude<CollabRole, "Owner">) => {
    changeRole(member.id, role);
    setMenuOpenId(null);
    setMenuPos(null);
    showToast(`${member.name} is now ${role}`);
  };

  const handleRemove = (member: CollabMember) => {
    removeMember(member.id);
    setMenuOpenId(null);
    setMenuPos(null);
    showToast(`${member.name} was removed from the trip`);
  };

  const openMenu = (member: CollabMember, e: React.MouseEvent<HTMLButtonElement>) => {
    if (menuOpenId === member.id) {
      setMenuOpenId(null);
      setMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuOpenId(member.id);
    setMenuPos({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  };

  const closeMenu = () => {
    setMenuOpenId(null);
    setMenuPos(null);
  };

  const handleLeave = () => {
    leaveTrip();
    showToast("You left the trip");
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between border-b border-gray-100 px-8 py-5">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-800">
          <Users size={20} className="text-primary-500" />
          Members & Roles
        </h2>
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-primary-500">
          {onlineCount} Online
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {trip.members.map((m) => {
          const isSelf = m.id === me.id;
          const isCurrentOwner = can(me.role, "changeRole");
          const showMenu = isCurrentOwner && m.role !== "Owner";
          return (
            <div
              key={m.id}
              className="flex items-center justify-between px-8 py-5"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 shrink-0">
                  {m.avatar ? (
                    <Image
                      src={m.avatar}
                      alt={m.name}
                      fill
                      sizes="48px"
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary-500/10">
                      <UserRound size={22} className="text-primary-500" />
                    </div>
                  )}
                  {m.online && (
                    <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>
                <div>
                  <p className="flex items-center gap-2 font-semibold text-gray-800">
                    {m.name}
                    {isSelf && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{m.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <RoleBadge role={m.role} />

                {showMenu && (
                  <div className="relative">
                    <button
                      onClick={(e) => openMenu(m, e)}
                      className="text-gray-400 transition hover:text-gray-600"
                      aria-label={`Manage ${m.name}`}
                    >
                      <MoreVertical size={18} />
                    </button>

                    {menuOpenId === m.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={closeMenu}
                        />
                        <div
                          className="fixed z-50 w-44 rounded-xl border border-gray-100 bg-white p-1.5 shadow-2xl"
                          style={{
                            top: menuPos?.top ?? 0,
                            right: menuPos?.right ?? 16,
                          }}
                        >
                          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Assign role
                          </p>
                          {ROLE_OPTIONS.map((role) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(m, role)}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition hover:bg-gray-50 ${
                                m.role === role
                                  ? "text-primary-500"
                                  : "text-gray-600"
                              }`}
                            >
                              {role}
                              {m.role === role && <Check size={14} />}
                            </button>
                          ))}
                          <div className="my-1 h-px bg-gray-100" />
                          <button
                            onClick={() => handleRemove(m)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-error transition hover:bg-error/5"
                          >
                            <Trash2 size={14} />
                            Remove member
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {isSelf && m.role !== "Owner" && (
                  <button
                    onClick={handleLeave}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-error hover:text-error"
                  >
                    <LogOut size={14} />
                    Leave
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isOwner && (
        <div className="flex items-center gap-2 border-t border-gray-100 bg-[#FAF8FF] px-8 py-3 text-xs text-gray-500">
          <ShieldCheck size={14} className="shrink-0 text-gray-400" />
          Only the trip Owner can change roles or remove members. Switch to the
          Owner in the demo switcher to try it.
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed top-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}