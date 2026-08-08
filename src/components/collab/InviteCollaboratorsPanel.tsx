"use client";

import { useState } from "react";
import { Mail, Send, ShieldCheck } from "lucide-react";
import {
  can,
  ROLE_LABELS,
} from "@/src/lib/client/collab/RolePermissions";
import { useCollabStore, type InviteRole } from "@/src/store/collab/CollabStore";
import { sendInviteEmail } from "@/src/lib/client/collab/EmailService";
import { daysRemaining } from "@/src/lib/client/collab/InvitationService";

const ROLE_OPTIONS: InviteRole[] = ["Editor", "Viewer"];

export default function InviteCollaboratorsPanel() {
  const trip = useCollabStore((s) =>
    s.trips.find((t) => t.id === s.activeTripId)
  );
  const currentUserId = useCollabStore((s) => s.currentUserId);
  const inviteCollaborator = useCollabStore((s) => s.inviteCollaborator);

  const me = trip?.members.find((m) => m.id === currentUserId);
  const canInvite = can(me?.role ?? "Viewer", "invite");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("Editor");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  if (!trip || !me) return null;

  const handleSend = async () => {
    const res = inviteCollaborator(email, role);
    if (!res.ok || !res.invite) {
      setNotice({ ok: false, text: res.message ?? "Could not send invite." });
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    setSending(true);
    setNotice({ ok: true, text: "Invitation created — sending email…" });

    const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${res.invite.token}`;
    const mailRes = await sendInviteEmail({
      inviteeEmail: res.invite.email,
      role,
      tripName: trip.name,
      inviteLink,
      invitedBy: me.name,
      expiresInDays: daysRemaining(res.invite.expiresAt),
    });
    setSending(false);

    setNotice({
      ok: mailRes.ok,
      text: mailRes.ok
        ? `Invitation email sent to ${res.invite.email}.`
        : `${mailRes.message} Copy the link to share manually.`,
    });
    if (mailRes.ok) setEmail("");
    setTimeout(() => setNotice(null), 6000);
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="mb-6 flex items-center gap-3">
        <Mail size={20} className="text-primary-500" />
        <h2 className="text-xl font-semibold text-gray-800">
          Invite Collaborators
        </h2>
      </div>

      {canInvite ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="colleague@email.com"
                className="w-full rounded-lg border border-gray-200 bg-[#FAF8FF] px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div className="w-full sm:w-36">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Role
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as InviteRole)}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-[#FAF8FF] px-4 py-3 pr-10 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
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
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 rounded-lg bg-primary-500 px-8 py-3 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              {sending ? "Sending…" : "Send"}
            </button>
          </div>

          <div className="mt-4 space-y-1.5">
            {ROLE_OPTIONS.map((r) => (
              <p key={r} className="flex items-start gap-2 text-xs text-gray-500">
                <span
                  className={`mt-0.5 rounded px-1.5 py-0.5 font-semibold ${
                    r === "Editor"
                      ? "bg-secondary-500/10 text-secondary-500"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {r}
                </span>
                <span>
                  {r === "Editor"
                    ? "Can create / modify / delete itinerary details and post comments."
                    : "Read-only access to the trip and itinerary."}
                </span>
              </p>
            ))}
          </div>

          {notice && (
            <p
              className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium ${
                notice.ok
                  ? "bg-success/10 text-success"
                  : "bg-error/10 text-error"
              }`}
            >
              {notice.text}
            </p>
          )}
        </>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-[#FAF8FF] p-4">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Only the trip Owner can invite collaborators.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              You are viewing as <b>{me.name}</b> ({me.role}). Use the demo
              switcher above to act as the Owner.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
