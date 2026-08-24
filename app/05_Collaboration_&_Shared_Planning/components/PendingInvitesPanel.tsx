"use client";

import { useState } from "react";
import {
  Mail,
  Hourglass,
  X,
  Check,
  Copy,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  can,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/RolePermissions";
import {
  daysRemaining,
  formatDate,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/InvitationService";
import {
  useCollabStore,
  type CollabInvite,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";

export default function PendingInvitesPanel() {
  const trip = useCollabStore((s) =>
    s.trips.find((t) => t.id === s.activeTripId) ?? s.trips[0]
  );
  const currentUserId = useCollabStore((s) => s.currentUserId);
  const cancelInvite = useCollabStore((s) => s.cancelInvite);
  const acceptInvite = useCollabStore((s) => s.acceptInvite);
  const rejectInvite = useCollabStore((s) => s.rejectInvite);
  const expirePendingInvites = useCollabStore((s) => s.expirePendingInvites);

  const me = trip?.members.find((m) => m.id === currentUserId);
  const isOwner = can(me?.role ?? "Viewer", "cancelInvite");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!trip) return null;

  const invites = trip.invites;
  const pending = invites.filter((i) => i.status === "pending");
  const nonPending = invites.filter((i) => i.status !== "pending");

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

  const copyLink = async (invite: CollabInvite) => {
    const url = `${window.location.origin}/05_Collaboration_&_Shared_Planning?invite=${invite.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(invite.id);
      showToast("Invite link copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast(url);
    }
  };

  const simulateExpiry = () => {
    expirePendingInvites();
    showToast("30 days passed — expired invitations were auto-removed");
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Hourglass size={20} className="text-primary-500" />
          <h2 className="text-xl font-semibold text-gray-800">
            Pending Invitations
          </h2>
        </div>
        {pending.length > 0 && (
          <button
            onClick={simulateExpiry}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-warning hover:text-warning"
            title="Demo: skip ahead 30 days to show auto-expiry"
          >
            <RefreshCw size={13} />
            Simulate 30-day expiry
          </button>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-[#FAF8FF] p-6 text-center">
          <p className="text-sm font-medium text-gray-800">
            No pending invitations
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Invitations automatically expire and are removed after{" "}
            <b>30 days</b> if not accepted.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((invite) => {
            const daysLeft = daysRemaining(invite.expiresAt);
            const critical = daysLeft <= 7;
            return (
              <div
                key={invite.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500/10">
                    <Mail size={18} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{invite.email}</p>
                    <p className="text-xs text-gray-500">
                      Invited as {invite.role} · {formatDate(invite.invitedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      critical ? "bg-warning/10 text-warning" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                  </span>

                  <button
                    onClick={() => copyLink(invite)}
                    className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-50"
                    title="Copy invite link (demo)"
                  >
                    {copiedId === invite.id ? (
                      <Check size={13} className="text-success" />
                    ) : (
                      <Copy size={13} />
                    )}
                    Copy link
                  </button>

                  <button
                    onClick={() => {
                      acceptInvite(invite.id);
                      showToast(`${invite.email} accepted the invitation`);
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success transition hover:bg-success/20"
                    title="Demo: simulate the invitee accepting"
                  >
                    <Check size={13} />
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      rejectInvite(invite.id);
                      showToast(`${invite.email} declined the invitation`);
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-50"
                    title="Demo: simulate the invitee declining"
                  >
                    <X size={13} />
                    Decline
                  </button>

                  {isOwner && (
                    <button
                      onClick={() => {
                        cancelInvite(invite.id);
                        showToast(`Invitation to ${invite.email} cancelled`);
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-error/30 bg-error/5 px-2.5 py-1 text-xs font-semibold text-error transition hover:bg-error/10"
                      title="Cancel this invitation"
                    >
                      <Trash2 size={13} />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {nonPending.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            History
          </p>
          <div className="space-y-2">
            {nonPending.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between text-xs text-gray-500"
              >
                <span>{invite.email}</span>
                <span
                  className={`rounded px-2 py-0.5 font-semibold ${
                    invite.status === "accepted"
                      ? "bg-success/10 text-success"
                      : invite.status === "rejected"
                        ? "bg-gray-100 text-gray-500"
                        : "bg-warning/10 text-warning"
                  }`}
                >
                  {invite.status === "accepted"
                    ? "Accepted"
                    : invite.status === "rejected"
                      ? "Declined"
                      : "Expired (auto-removed)"}
                </span>
              </div>
            ))}
          </div>
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