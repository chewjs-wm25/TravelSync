"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Share2,
  UserPlus,
  FileText,
  Download,
  CalendarDays,
  MessageSquare,
  MessagesSquare,
  Paperclip,
  Smile,
  Image as ImageIcon,
  MapPin,
  X,
  Check,
  ShieldCheck,
  PanelRightOpen,
  PanelRightClose,
  Loader2,
} from "lucide-react";
import {
  can,
  ROLE_DESCRIPTIONS,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/RolePermissions";
import {
  daysRemaining,
  formatDate,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/InvitationService";
import { useCollabStore } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";

import DemoIdentitySwitcher from "./components/DemoIdentitySwitcher";
import InviteCollaboratorsPanel from "./components/InviteCollaboratorsPanel";
import PendingInvitesPanel from "./components/PendingInvitesPanel";
import MemberManagementPanel from "./components/MemberManagementPanel";
import PermissionMatrixCard from "./components/PermissionMatrixCard";
import ItineraryPermissionDemo from "./components/ItineraryPermissionDemo";
import ActivityFeed from "./components/ActivityFeed";

export default function CollaborationPage() {
  const trip = useCollabStore(
    (s) => s.trips.find((t) => t.id === s.activeTripId) ?? s.trips[0]
  );
  const currentUserId = useCollabStore((s) => s.currentUserId);
  const comments = trip?.comments ?? [];
  const addComment = useCollabStore((s) => s.addComment);
  const acceptInvite = useCollabStore((s) => s.acceptInvite);
  const rejectInvite = useCollabStore((s) => s.rejectInvite);
  const loading = useCollabStore((s) => s.loading);
  const error = useCollabStore((s) => s.error);
  const load = useCollabStore((s) => s.load);

  const me = trip?.members.find((m) => m.id === currentUserId);

  const [commentText, setCommentText] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("invite");
  });

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !trip) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        <Loader2 size={24} className="mr-2 animate-spin" />
        Loading collaboration data…
      </div>
    );
  }

  if (!trip || !me) {
    if (error) {
      return (
        <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-sm text-error">
          无法连接数据库：{error}
        </div>
      );
    }
    return null;
  }

  const canComment = can(me.role, "comment");
  const canInvite = can(me.role, "invite");
  const invite = trip.invites.find((i) => i.token === inviteToken && i.status === "pending");

  const handleSendComment = () => {
    if (!commentText.trim() || !canComment) return;
    addComment(commentText.trim());
    setCommentText("");
  };

  const handleShareLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* demo only */
    }
  };

  const handleInviteScroll = () => {
    document
      .getElementById("invite-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex gap-6">
      {/* ─── Main Content Area ─── */}
      <div className="flex-1 space-y-6">
        {/* ─── Page Header ─── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-gray-400">
              <MapPin size={13} />
              {trip.region}
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">{trip.name}</h1>
            <p className="mt-1 text-gray-500">{trip.dates}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShareLink}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-200 active:scale-[0.97]"
            >
              <Share2 size={18} />
              Share Link
            </button>
            {canInvite && (
              <button
                onClick={handleInviteScroll}
                className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-3 font-medium text-white shadow-md transition hover:bg-primary-500/80 active:scale-[0.97]"
              >
                <UserPlus size={18} />
                Invite
              </button>
            )}
          </div>
        </div>

        {/* ─── Demo Identity Switcher ─── */}
        <DemoIdentitySwitcher />

        {/* ─── Role explanation strip ─── */}
        <div className="flex items-start gap-3 rounded-2xl border border-secondary-500/30 bg-white p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-secondary-500" />
          <div className="text-xs leading-relaxed text-gray-600">
            Viewing as <b className="text-gray-800">{me.name}</b> (
            <b className="text-primary-500">{me.role}</b>):{" "}
            {ROLE_DESCRIPTIONS[me.role]}
          </div>
        </div>

        {/* ─── Grid: 8-col main + 4-col sidebar ─── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── Left: Invite + Members + Itinerary (8 cols) ── */}
          <div id="invite-panel" className="scroll-mt-24 space-y-6 lg:col-span-8">
            <InviteCollaboratorsPanel />
            <PendingInvitesPanel />
            <MemberManagementPanel />
            <ItineraryPermissionDemo />
          </div>

          {/* ── Right: Permissions + Activity + Export (4 cols) ── */}
          <div className="space-y-6 lg:col-span-4">
            <PermissionMatrixCard />
            <ActivityFeed />

            {/* ── Export Itinerary Card ── */}
            <div className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                Export Itinerary
              </p>
              <div className="space-y-3">
                <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:bg-gray-50 active:scale-[0.98]">
                  <FileText size={20} className="shrink-0 text-red-500" />
                  <span className="text-sm font-medium text-gray-800">
                    Export as PDF
                  </span>
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:bg-gray-50 active:scale-[0.98]">
                  <Download size={20} className="shrink-0 text-green-600" />
                  <span className="text-sm font-medium text-gray-800">
                    Download CSV
                  </span>
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:bg-gray-50 active:scale-[0.98]">
                  <CalendarDays size={20} className="shrink-0 text-primary-500" />
                  <span className="text-sm font-medium text-gray-800">
                    Sync to ICS
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Live Comments Sidebar (collapsible) ─── */}
      {chatOpen ? (
        <div className="hidden w-80 shrink-0 flex-col border-l border-gray-200 bg-white/80 backdrop-blur-sm xl:sticky xl:top-0 xl:flex xl:h-[calc(100vh-80px-70px)] xl:self-start">
          <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-5">
            <MessageSquare size={20} className="text-primary-500" />
            <h3 className="font-semibold text-gray-800">Live Comments</h3>
            <button
              onClick={() => setChatOpen(false)}
              className="ml-auto rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Collapse chat"
              title="Collapse chat"
            >
              <PanelRightClose size={18} />
            </button>
          </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {comments.map((c, i) => (
            <div key={c.id ?? i} className="flex gap-3">
              {c.avatar ? (
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={c.avatar}
                    alt={c.authorName}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
                  {c.authorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div
                className={`max-w-[240px] rounded-2xl px-4 py-3 ${
                  c.own
                    ? "border border-red-100 bg-red-50"
                    : "border border-gray-100 bg-[#FAF8FF]"
                }`}
              >
                <div className="mb-1 flex items-baseline justify-between gap-4">
                  <span
                    className={`text-xs font-semibold ${
                      c.own ? "text-primary-500" : "text-gray-800"
                    }`}
                  >
                    {c.authorName}
                  </span>
                  <span className="text-[10px] text-gray-400">{c.time}</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 p-4">
          {canComment ? (
            <>
              <div className="rounded-lg border border-gray-200 bg-[#FAF8FF] p-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder="Write a comment..."
                  rows={2}
                  className="w-full resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-2">
                  <button className="rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                    <Paperclip size={16} />
                  </button>
                  <button className="rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                    <Smile size={16} />
                  </button>
                  <button className="rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                    <ImageIcon size={16} />
                  </button>
                </div>
                <button
                  onClick={handleSendComment}
                  className="rounded-lg bg-primary-500 px-5 py-1.5 text-xs font-bold text-white transition hover:bg-primary-500/80 active:scale-[0.97]"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs text-gray-500">
              <ShieldCheck size={16} className="mx-auto mb-1 text-gray-400" />
              <b>{me.role}</b> role cannot post comments.
              <br />
              Switch to an Editor or Owner to chat.
            </div>
          )}
        </div>
        </div>
      ) : (
        <button
          onClick={() => setChatOpen(true)}
          className="hidden shrink-0 flex-col items-center gap-3 border-l border-gray-200 bg-white/80 py-6 text-gray-400 transition hover:bg-white hover:text-primary-500 xl:sticky xl:top-0 xl:flex xl:self-start"
          aria-label="Open chat"
          title="Open Live Comments"
        >
          <PanelRightOpen size={18} />
          <MessagesSquare size={18} />
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
            {comments.length}
          </span>
          <span className="text-[10px] font-medium tracking-widest [writing-mode:vertical-rl]">
            Chat
          </span>
        </button>
      )}

      {/* ─── Invite Link Demo Modal ─── */}
      {invite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon size={20} className="text-primary-500" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Trip Invitation
                </h3>
              </div>
              <button
                onClick={() => setInviteToken(null)}
                className="text-gray-400 transition hover:text-gray-600"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              You have been invited to join{" "}
              <b className="text-gray-800">{trip.name}</b> as{" "}
              <b className="text-primary-500">{invite.role}</b> by{" "}
              <b className="text-gray-800">{invite.invitedBy}</b>.
            </p>

            <div className="mt-4 rounded-xl border border-gray-100 bg-[#FAF8FF] p-4 text-xs text-gray-500">
              <p>Invited: {formatDate(invite.invitedAt)}</p>
              <p>
                Expires in{" "}
                <b className="text-warning">
                  {daysRemaining(invite.expiresAt)} days
                </b>{" "}
                (30-day limit)
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  acceptInvite(invite.id);
                  setInviteToken(null);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97]"
              >
                <Check size={16} />
                Accept
              </button>
              <button
                onClick={() => {
                  rejectInvite(invite.id);
                  setInviteToken(null);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 active:scale-[0.97]"
              >
                <X size={16} />
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
