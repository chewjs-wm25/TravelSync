"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  UserPlus,
  FileText,
  Download,
  CalendarDays,
  MessageSquare,
  MessagesSquare,
  Image as ImageIcon,
  MapPin,
  X,
  Check,
  CheckCheck,
  Send,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Mail,
  ArrowLeft,
  UserRound,
  Upload,
  FileCode,
  Key,
  AlertCircle,
} from "lucide-react";
import {
  can,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/RolePermissions";
import {
  daysRemaining,
  formatDate,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/InvitationService";
import { exportTripToJSONString } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/PlanImportExportService";
import { useCollabStore } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";
import { collabApi } from "@/api_layer/05_Collaboration_&_Shared_Planning/collab";
import type { CollabTrip } from "@/api_layer/05_Collaboration_&_Shared_Planning/types";

import InviteCollaboratorsPanel from "./components/InviteCollaboratorsPanel";
import PendingInvitesPanel from "./components/PendingInvitesPanel";
import MemberManagementPanel from "./components/MemberManagementPanel";
import SharedTripPlanEditor from "./components/SharedTripPlanEditor";
import LikePlanButton from "./components/LikePlanButton";
import ActivityFeed from "./components/ActivityFeed";
import ControlCenter from "./components/ControlCenter";
import ImportTripModal from "./components/ImportTripModal";
import ExportTripModal from "./components/ExportTripModal";
import GoogleCalendarSyncModal from "./components/GoogleCalendarSyncModal";

function formatTripDates(start?: string | null, end?: string | null): string {
  if (!start) return "";
  const s = new Date(start + "T00:00:00");
  const sStr = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!end) return `${sStr}, ${s.getFullYear()}`;
  const e = new Date(end + "T00:00:00");
  const eStr = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return sStr === eStr ? `${sStr}, ${s.getFullYear()}` : `${sStr}-${eStr}`;
}

export default function CollaborationPageClient({
  initialTripId,
  initialInvite,
  initialTrip,
  initialMeId,
}: {
  initialTripId?: string | null;
  initialInvite?: string | null;
  initialTrip?: CollabTrip | null;
  initialMeId?: string | null;
}) {
  const searchParams = useSearchParams();
  const tripParam = searchParams.get("trip") || null;
  const inviteParam = searchParams.get("invite") || null;
  const importKeyParam = searchParams.get("importKey") || null;

  // React state hooks strictly at the top level
  const [commentText, setCommentText] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(inviteParam);
  const [toast, setToast] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(Boolean(importKeyParam));
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGoogleCalendarModalOpen, setIsGoogleCalendarModalOpen] = useState(false);

  // Store hooks
  const storeTrip = useCollabStore(
    (s) => s.trips.find((t) => t.tripId === s.activeTripId) ?? s.trips[0]
  );
  const storeCurrentUserId = useCollabStore((s) => s.currentUserId);
  const storeLoading = useCollabStore((s) => s.loading);
  const addComment = useCollabStore((s) => s.addComment);
  const acceptInvite = useCollabStore((s) => s.acceptInvite);
  const rejectInvite = useCollabStore((s) => s.rejectInvite);
  const error = useCollabStore((s) => s.error);
  const load = useCollabStore((s) => s.load);
  const startPolling = useCollabStore((s) => s.startPolling);
  const stopPolling = useCollabStore((s) => s.stopPolling);
  const silentRefresh = useCollabStore((s) => s.silentRefresh);
  const syncStatus = useCollabStore((s) => s.syncStatus);
  const lastSyncedAt = useCollabStore((s) => s.lastSyncedAt);
  const triggerManualSync = useCollabStore((s) => s.triggerManualSync);
  const { isLoggedIn, user } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => setHasMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!tripParam) return;

    if (initialTrip && initialTrip.tripId === tripParam) {
      useCollabStore.setState((prev) => ({
        trips: prev.trips.length > 0 && prev.trips[0].tripId === tripParam ? prev.trips : [initialTrip],
        activeTripId: tripParam,
        loading: false,
        error: null,
        currentUserId: prev.currentUserId || initialMeId || "",
      }));
      startPolling();
    } else {
      void load(tripParam);
    }

    // 页面可见性与焦点监听：切换标签页回来时立即触发静默刷新
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        startPolling();
        void silentRefresh();
      } else {
        stopPolling();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      stopPolling();
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [tripParam, initialTrip, initialMeId, load, startPolling, stopPolling, silentRefresh]);

  useEffect(() => {
    if (!tripParam) return;
    const unsub = collabApi.subscribeToEvents(
      user?.id || storeCurrentUserId || "",
      (event) => {
        if (event.type === "trip_liked" && event.tripId === tripParam) {
          useCollabStore.setState((prev) => ({
            trips: prev.trips.map((t) =>
              t.tripId === event.tripId
                ? {
                    ...t,
                    likes: {
                      count: event.count,
                      likedByMe: event.likers.some((l) => l.id === (user?.id || storeCurrentUserId)),
                      likers: event.likers,
                    },
                  }
                : t
            ),
          }));
        }
      },
      tripParam
    );
    return () => unsub();
  }, [tripParam, user?.id, storeCurrentUserId]);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

  const trip = storeTrip ?? (initialTrip && initialTrip.tripId === tripParam ? initialTrip : null);
  const currentUserId = user?.id || storeCurrentUserId || (initialMeId ?? "");
  const loading = !trip && storeLoading;
  const comments = trip?.comments ?? [];
  const me = trip?.members.find((m) => m.id === currentUserId) ?? trip?.members[0];

  useEffect(() => {
    if (chatOpen) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatOpen, comments.length]);

  const exportPDF = () => {
    if (!trip) return;
    const content = generateExportContent(trip, "pdf");
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    win?.document.write(content);
    win?.document.close();
  };

  const exportCSV = () => {
    if (!trip) return;
    const csv = generateCSV(trip);
    downloadFile(csv, `${trip.tripName.replace(/\s+/g, "_")}_itinerary.csv`, "text/csv");
  };

  const exportICS = () => {
    if (!trip) return;
    const ics = generateICS(trip);
    downloadFile(ics, `${trip.tripName.replace(/\s+/g, "_")}_itinerary.ics`, "text/calendar");
  };

  const exportJSON = async () => {
    if (!trip) return;
    try {
      const res = await collabApi.getTripExport(trip.tripId, currentUserId);
      if (res.success && res.data) {
        const json = JSON.stringify(res.data, null, 2);
        downloadFile(json, `${trip.tripName.replace(/\s+/g, "_")}_plan.json`, "application/json");
        return;
      }
    } catch {
      // fallback
    }
    const json = exportTripToJSONString(trip);
    downloadFile(json, `${trip.tripName.replace(/\s+/g, "_")}_plan.json`, "application/json");
  };

  const generateExportContent = (t: typeof trip, _format: string) => {
    if (!t) return "";
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${t.tripName} - Itinerary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
    h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    .meta { color: #6b7280; margin-bottom: 30px; }
    .day { margin-top: 30px; page-break-inside: avoid; }
    .day-title { background: #3b82f6; color: white; padding: 10px 15px; border-radius: 8px 8px 0 0; font-weight: 600; }
    .item { border: 1px solid #e5e7eb; border-top: none; padding: 15px; background: #fafafa; }
    .item:last-child { border-radius: 0 0 8px 8px; }
    .item-title { font-weight: 600; color: #1f2937; }
    .item-note { color: #6b7280; font-size: 0.9em; margin-top: 5px; }
    .members { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
    .member { background: #eff6ff; padding: 5px 12px; border-radius: 20px; font-size: 0.85em; color: #1e40af; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>${t.tripName}</h1>
  <div class="meta">
    <p><strong>Dates:</strong> ${formatTripDates(t.startDate, t.endDate)}</p>
    <p><strong>Region:</strong> ${t.region ?? ""}</p>
    <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>
  </div>
  <div class="meta">
    <strong>Collaborators:</strong>
    <div class="members">
      ${t.members.map((m) => `<span class="member">${m.name} (${m.role})</span>`).join("")}
    </div>
  </div>
  ${
    t.items.length === 0
      ? '<p style="color: #9ca3af; text-align: center; padding: 40px;">No itinerary items yet</p>'
      : Object.entries(
          t.items.reduce((acc, item) => {
            (acc[item.day] = acc[item.day] || []).push(item);
            return acc;
          }, {} as Record<number, typeof t.items>)
        )
          .map(
            ([day, items]) => `
    <div class="day">
      <div class="day-title">Day ${day}</div>
      ${items
        .map(
          (item) => `
      <div class="item">
        <div class="item-title">${item.name}</div>
        ${item.note ? `<div class="item-note">${item.note}</div>` : ""}
      </div>`
        )
        .join("")}
    </div>`
          )
          .join("")
  }
  ${
    t.comments.length > 0
      ? `
  <div class="day" style="margin-top: 40px;">
    <div class="day-title" style="background: #8b5cf6;">Comments</div>
    ${t.comments
      .map(
        (c) => `
    <div class="item" style="background: #faf5ff; border-color: #e9d5ff;">
      <div class="item-title">${c.authorName}</div>
      <div class="item-note">${c.text}</div>
    </div>`
      )
      .join("")}
  </div>`
      : ""
  }
</body>
</html>`;
  };

  const generateCSV = (t: typeof trip) => {
    if (!t) return "";
    const headers = ["Day", "Title", "Note"];
    const rows = t.items.map((item) => [
      `Day ${item.day}`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${(item.note || "").replace(/"/g, '""')}"`,
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  };

  const generateICS = (t: typeof trip) => {
    if (!t) return "";
    const startDate = t.startDate ? new Date(t.startDate + "T00:00:00") : new Date();
    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const events = t.items
      .map((item) => {
        const eventDate = new Date(startDate);
        eventDate.setDate(startDate.getDate() + item.day - 1);
        const dtstart = eventDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        return `BEGIN:VEVENT
UID:${t.tripId}-${item.itemId}@travelsync
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
SUMMARY:${item.name}
DESCRIPTION:${item.note || "No notes"}
END:VEVENT`;
      })
      .join("\n");
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TravelSync//Itinerary Export//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events}
END:VCALENDAR`;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${filename} downloaded`);
  };

  const handleSendComment = () => {
    if (!commentText.trim() || !me || !can(me.role, "comment")) return;
    addComment(commentText.trim());
    setCommentText("");
  };

  const handleInviteScroll = () => {
    document
      .getElementById("invite-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!hasMounted) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        <Loader2 size={24} className="mr-2 animate-spin" />
        Loading collaboration data...
      </div>
    );
  }

  // ─── 1. 最高优先级：如果有 inviteToken，立即进入邀请确认/决策流程 ───
  if (inviteToken) {
    return (
      <InviteOnboardingFlow
        token={inviteToken}
        onDismiss={() => {
          setInviteToken(null);
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url.toString());
        }}
      />
    );
  }

  // ─── 2. Control Center 模式：无 ?trip ───
  const shouldShowControlCenter = !tripParam;

  if (shouldShowControlCenter) {
    if (!isLoggedIn) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-gray-500">
          <ShieldCheck size={40} className="text-primary-500/60" />
          <p className="text-sm font-medium text-gray-700">Please sign in to view and collaborate on trips.</p>
          <a
            href="/01_User_&_Account_Management"
            className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97]"
          >
            Sign In
          </a>
        </div>
      );
    }
    return <ControlCenter />;
  }

  // ─── 3. 单行程详情模式（?trip=xxx） ───
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        <Loader2 size={24} className="mr-2 animate-spin" />
        Loading collaboration data...
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-gray-800">Trip Plan Not Found</h3>
          <p className="text-xs text-gray-500 max-w-sm">
            This trip plan does not exist or has been deleted from Trip Planning.
          </p>
        </div>
        <Link
          href="/05_Collaboration_&_Shared_Planning"
          className="rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-primary-600 active:scale-[0.98]"
        >
          Return to Control Center
        </Link>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-gray-500">
        <ShieldCheck size={40} className="text-primary-500/60" />
        <p className="text-sm font-medium text-gray-700">Please sign in to view and collaborate on trips.</p>
        <a
          href="/01_User_&_Account_Management"
          className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97]"
        >
          Sign In
        </a>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        <Loader2 size={24} className="mr-2 animate-spin" />
        Loading collaboration data...
      </div>
    );
  }

  const canComment = can(me.role, "comment");
  const canInvite = can(me.role, "invite");
  const isOwner = me.role === "Owner";
  const invite = trip.invites.find((i) => i.token === inviteToken && i.status === "pending");

  return (
    <div className="flex gap-6">
      {/* ─── Main Content Area ─── */}
      <div className="flex-1 space-y-6">
        <Link
          href="/05_Collaboration_&_Shared_Planning"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          ← Back to Control Center
        </Link>
        {/* ─── Page Header ─── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-gray-400">
              <MapPin size={13} />
              {trip.region}
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">{trip.tripName}</h1>
            <p className="mt-1 text-gray-500">{formatTripDates(trip.startDate, trip.endDate)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Like Plan Button */}
            <LikePlanButton tripId={trip.tripId} size="md" showLikersPopover={true} />

            {/* 真实同步状态指示器 & 点击手动即时同步 */}
            <button
              onClick={() => void triggerManualSync()}
              disabled={syncStatus === "syncing"}
              title={
                syncStatus === "syncing"
                  ? "Syncing latest changes with server..."
                  : syncStatus === "error"
                  ? "Sync failed. Click to retry."
                  : `Synced with cloud${lastSyncedAt ? ` at ${lastSyncedAt.toLocaleTimeString()}` : ""}. Click to refresh.`
              }
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-medium border transition active:scale-[0.97] cursor-pointer ${
                syncStatus === "syncing"
                  ? "bg-blue-50 text-blue-700 border-blue-200 shadow-2xs"
                  : syncStatus === "error"
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  : "bg-green-50 text-green-700 border-green-200/80 hover:bg-green-100/60"
              }`}
            >
              {syncStatus === "syncing" ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-blue-600" />
                  <span>Syncing...</span>
                </>
              ) : syncStatus === "error" ? (
                <>
                  <AlertCircle size={14} className="text-red-500" />
                  <span>Sync Failed</span>
                </>
              ) : (
                <>
                  <Check size={14} className="text-green-600" />
                  <span>Synced</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 active:scale-[0.97]"
            >
              <Upload size={18} className="text-primary-500" />
              <span>Import Plan</span>
            </button>
            {canInvite && (
              <button
                onClick={handleInviteScroll}
                className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 font-medium text-white shadow-md transition hover:bg-primary-500/80 active:scale-[0.97]"
              >
                <UserPlus size={18} />
                Invite
              </button>
            )}
          </div>
        </div>

        {/* ─── Demo fallback notice (local DB unavailable) ─── */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-xs leading-relaxed text-warning">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <div>
              <b>Demo Mode:</b> Local database is temporarily unavailable. Displaying built-in demo data.
            </div>
          </div>
        )}

        {/* ─── Grid: 8-col main + 4-col sidebar ─── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── Left: Invite + Members + Itinerary (8 cols) ── */}
          <div id="invite-panel" className="scroll-mt-24 space-y-6 lg:col-span-8">
            <InviteCollaboratorsPanel />
            <PendingInvitesPanel isOwner={isOwner} />
            <MemberManagementPanel />
            <SharedTripPlanEditor />
          </div>

          {/* ── Right: Permissions + Activity + Export (4 cols) ── */}
          <div className="space-y-6 lg:col-span-4">
            <ActivityFeed />

            {/* ── Export Itinerary Card ── */}
            <div className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                Export Itinerary
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex w-full items-center gap-3 rounded-lg border border-primary-200 bg-gradient-to-r from-primary-50/70 to-white px-4 py-3 text-left transition hover:from-primary-50 hover:to-primary-50/40 active:scale-[0.98]"
                >
                  <Key size={20} className="shrink-0 text-primary-600" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-800">
                        Share via Plan Key
                      </span>
                      <span className="rounded-full bg-primary-100 px-1.5 py-0.2 text-[9px] font-extrabold text-primary-700">
                        No File
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 block">
                      Get a share code or link to import without downloading files
                    </span>
                  </div>
                </button>
                <button
                  onClick={exportJSON}
                  className="flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/30 px-4 py-3 text-left transition hover:bg-amber-50 active:scale-[0.98]"
                >
                  <FileCode size={20} className="shrink-0 text-amber-600" />
                  <div>
                    <span className="text-sm font-semibold text-gray-800 block">
                      Export as JSON
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Standard format, importable to any new plan
                    </span>
                  </div>
                </button>
                <button
                  onClick={exportPDF}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:bg-gray-50 active:scale-[0.98]"
                >
                  <FileText size={20} className="shrink-0 text-red-500" />
                  <span className="text-sm font-medium text-gray-800">
                    Export as PDF
                  </span>
                </button>
                <button
                  onClick={exportCSV}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:bg-gray-50 active:scale-[0.98]"
                >
                  <Download size={20} className="shrink-0 text-green-600" />
                  <span className="text-sm font-medium text-gray-800">
                    Download CSV
                  </span>
                </button>
                <button
                  onClick={() => setIsGoogleCalendarModalOpen(true)}
                  className="flex w-full items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/30 px-4 py-3 text-left transition hover:bg-blue-50 active:scale-[0.98]"
                >
                  <CalendarDays size={20} className="shrink-0 text-blue-600" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-800">
                        Sync to Google Calendar
                      </span>
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-700">
                        API
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 block">
                      Directly sync all itinerary items to your Google Calendar
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Live Comments FAB + Floating Panel ─── */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition hover:bg-primary-500/80 hover:shadow-xl active:scale-95"
          aria-label="Open chat"
          title="Open Live Comments"
        >
          <MessagesSquare size={22} />
          {comments.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {comments.length}
            </span>
          )}
        </button>
      )}

      {chatOpen && (
        <div
          className="fixed bottom-6 right-6 z-40 flex w-80 sm:w-96 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          style={{ maxHeight: "min(540px, calc(100vh - 100px))" }}
        >
          <div className="flex items-center gap-2.5 border-b border-gray-200 bg-white px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Live Comments</h3>
              <p className="text-[10px] text-gray-400">
                {comments.length} {comments.length === 1 ? "message" : "messages"}
              </p>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="ml-auto rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#efeae2]/35 px-3.5 py-3.5">
            {comments.length === 0 ? (
              <div className="flex h-full min-h-[160px] flex-col items-center justify-center py-8 text-center text-gray-400">
                <MessageSquare size={28} className="mb-2 text-gray-300" />
                <p className="text-xs font-medium text-gray-500">No comments yet</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Be the first to leave a comment!</p>
              </div>
            ) : (
              comments.map((c, i) => {
                const isMe = Boolean(
                  (currentUserId && c.authorId === currentUserId) ||
                  (me?.id && c.authorId === me.id) ||
                  (!currentUserId && !me?.id && c.own)
                );
                const authorMember = trip?.members.find((m) => m.id === c.authorId);
                const avatarUrl = c.avatar || (isMe ? me?.avatar : authorMember?.avatar);
                const displayName = isMe
                  ? (me?.name ? `${me.name.split(" ")[0]} (You)` : "You")
                  : (c.authorName || authorMember?.name || "Member");
                const initial = (
                  isMe
                    ? (me?.name?.charAt(0) || "Y")
                    : (c.authorName?.charAt(0) || authorMember?.name?.charAt(0) || "M")
                ).toUpperCase();

                if (isMe) {
                  return (
                    <div key={c.id ?? i} className="flex items-end justify-end gap-2">
                      {/* Outgoing WhatsApp bubble (Right) */}
                      <div className="relative max-w-[78%] rounded-2xl rounded-br-xs border border-[#c4ebb8] bg-[#DCF8C6] px-3.5 py-2 shadow-xs">
                        <div className="mb-0.5 flex items-baseline justify-between gap-3">
                          <span className="text-[11px] font-semibold text-emerald-800">
                            {displayName}
                          </span>
                          <span className="flex items-center gap-1 text-[9px] text-emerald-700/80">
                            {c.time}
                            <CheckCheck size={12} className="text-emerald-600" />
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-900 break-words whitespace-pre-wrap">
                          {c.text}
                        </p>
                      </div>

                      {/* Right Avatar (Myself) */}
                      {avatarUrl ? (
                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full ring-2 ring-emerald-500/40">
                          <Image
                            src={avatarUrl}
                            alt={displayName}
                            width={28}
                            height={28}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white shadow-xs">
                          {initial}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={c.id ?? i} className="flex items-end justify-start gap-2">
                    {/* Left Avatar (Other Users) */}
                    {avatarUrl ? (
                      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-gray-200">
                        <Image
                          src={avatarUrl}
                          alt={displayName}
                          width={28}
                          height={28}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[11px] font-semibold text-white shadow-xs">
                        {initial}
                      </div>
                    )}

                    {/* Incoming WhatsApp bubble (Left) */}
                    <div className="relative max-w-[78%] rounded-2xl rounded-bl-xs border border-gray-200/90 bg-white px-3.5 py-2 shadow-xs">
                      <div className="mb-0.5 flex items-baseline justify-between gap-3">
                        <span className="text-[11px] font-semibold text-emerald-700">
                          {displayName}
                        </span>
                        <span className="text-[9px] text-gray-400">{c.time}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-gray-800 break-words whitespace-pre-wrap">
                        {c.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={commentsEndRef} />
          </div>

          <div className="border-t border-gray-200 bg-white px-3.5 py-2.5">
            {canComment ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-emerald-500">
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
                    rows={1}
                    className="w-full resize-none bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
                  />
                </div>
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Send comment"
                  aria-label="Send comment"
                >
                  <Send size={14} />
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-center text-[11px] text-gray-500">
                <b>{me?.role || "Viewer"}</b> role cannot post comments.
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* ─── Export & Share Plan Modal ─── */}
      {trip && (
        <ExportTripModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          tripId={trip.tripId}
          tripName={trip.tripName}
          onDownloadJSON={() => void exportJSON()}
        />
      )}

      {/* ─── Import Trip Plan Modal ─── */}
      <ImportTripModal
        isOpen={isImportModalOpen}
        initialKey={importKeyParam || undefined}
        onClose={() => {
          setIsImportModalOpen(false);
          if (typeof window !== "undefined" && window.location.search.includes("importKey")) {
            const url = new URL(window.location.href);
            url.searchParams.delete("importKey");
            window.history.replaceState({}, "", url.toString());
          }
        }}
        onSuccess={(newTripId) => {
          setIsImportModalOpen(false);
          window.location.href = `/05_Collaboration_&_Shared_Planning?trip=${encodeURIComponent(newTripId)}`;
        }}
      />

      {/* ─── Google Calendar Direct Sync Modal ─── */}
      {trip && (
        <GoogleCalendarSyncModal
          isOpen={isGoogleCalendarModalOpen}
          onClose={() => setIsGoogleCalendarModalOpen(false)}
          trip={trip}
          onDownloadICS={exportICS}
        />
      )}
    </div>
  );
}

/** 邀请确认与入职完整决策流程 */
function InviteOnboardingFlow({
  token,
  onDismiss,
}: {
  token: string;
  onDismiss: () => void;
}) {
  const { isLoggedIn, user, syncUser, logout } = useAuthStore();
  const [inviteData, setInviteData] = useState<{
    id: string;
    token: string;
    email: string;
    role: string;
    tripId: string;
    tripName: string;
    tripRegion: string;
    invitedBy: string;
    expiresAt: string;
    accountExists: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [viewState, setViewState] = useState<"decision" | "login" | "register" | "declined">("decision");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // 表单状态
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const pwChecks = {
    len: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z\d]/.test(password),
  };
  const pwValid = Object.values(pwChecks).every(Boolean);

  useEffect(() => {
    fetch(`/05_Collaboration_&_Shared_Planning/api/collab/invites/lookup?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = (await res.json()) as { success: boolean; invite?: typeof inviteData; error?: string };
        if (data.success && data.invite) {
          setInviteData(data.invite);
        } else {
          setFetchError(data.error || "Invalid or expired invitation");
        }
      })
      .catch(() => setFetchError("Failed to load invitation"))
      .finally(() => setLoading(false));
  }, [token]);

  // 以当前登录账号接受
  const handleAcceptLoggedIn = async () => {
    if (!inviteData) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(
        `/05_Collaboration_&_Shared_Planning/api/collab/invites/${encodeURIComponent(inviteData.id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted", userId: user?.id }),
        }
      );
      const data = (await res.json()) as { success: boolean; tripId?: string; error?: string };
      if (data.success) {
        const destTrip = data.tripId || inviteData.tripId;
        window.location.href = `/05_Collaboration_&_Shared_Planning?trip=${encodeURIComponent(destTrip)}`;
      } else {
        setSubmitError(data.error || "Failed to accept invitation");
      }
    } catch {
      setSubmitError("Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  };

  // 拒绝邀请
  const handleDecline = async () => {
    if (!inviteData) return;
    setSubmitting(true);
    try {
      await fetch(
        `/05_Collaboration_&_Shared_Planning/api/collab/invites/${encodeURIComponent(inviteData.id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected" }),
        }
      );
      setViewState("declined");
    } catch {
      setViewState("declined");
    } finally {
      setSubmitting(false);
    }
  };

  // 切换账号：退出当前登录并进入受邀邮箱的登录/注册
  const handleSwitchAccount = async () => {
    await logout();
    if (inviteData?.accountExists) {
      setViewState("login");
    } else {
      setViewState("register");
    }
  };

  // 现有账号登录并接受
  // 现有账号登录并接受
  const handleLoginSubmit = async () => {
    if (!inviteData || !password) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/01_User_&_Account_Management/account-actions?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: inviteData.email, password }),
      });
      const data = (await res.json()) as { success: boolean; user?: { id: string; username: string; fullName: string; profilePicture?: string }; error?: string; message?: string };
      if (!data.success || !data.user) {
        setSubmitError(data.error || data.message || "Invalid password or email");
        setSubmitting(false);
        return;
      }
      syncUser({
        id: data.user.id,
        name: data.user.fullName || data.user.username,
        avatarUrl: data.user.profilePicture,
      });

      // 接受邀请
      const acceptRes = await fetch(
        `/05_Collaboration_&_Shared_Planning/api/collab/invites/${encodeURIComponent(inviteData.id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted", userId: data.user.id }),
        }
      );
      const acceptData = (await acceptRes.json()) as { success: boolean; tripId?: string; error?: string; message?: string };
      if (!acceptData.success) {
        setSubmitError(acceptData.message || acceptData.error || "Failed to accept invite");
        return;
      }
      const destTrip = acceptData.tripId || inviteData.tripId;
      window.location.href = `/05_Collaboration_&_Shared_Planning?trip=${encodeURIComponent(destTrip)}`;
    } catch {
      setSubmitError("Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  // 注册新账号并加入
  const handleRegisterSubmit = async () => {
    if (!username || !password || !fullName || !inviteData) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/05_Collaboration_&_Shared_Planning/api/collab/invites/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username, password, fullName }),
      });
      const data = (await res.json()) as {
        success: boolean;
        tripId?: string;
        user?: { id: string; username: string; fullName: string; profilePicture?: string };
        error?: string;
        message?: string;
      };
      if (data.success && data.user) {
        syncUser({
          id: data.user.id,
          name: data.user.fullName || data.user.username,
          avatarUrl: data.user.profilePicture,
        });
        const destTrip = data.tripId || inviteData.tripId;
        window.location.href = `/05_Collaboration_&_Shared_Planning?trip=${encodeURIComponent(destTrip)}`;
      } else {
        setSubmitError(data.message || data.error || "Registration failed");
      }
    } catch {
      setSubmitError("Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 size={28} className="mr-2 animate-spin text-primary-500" />
        Loading invitation details…
      </div>
    );
  }

  if (fetchError || !inviteData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <ShieldCheck size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Invalid Invitation</h2>
          <p className="mt-2 text-sm text-gray-500">{fetchError}</p>
          <button
            onClick={onDismiss}
            className="mt-6 w-full rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-500/90 active:scale-[0.98]"
          >
            Go to Collaboration
          </button>
        </div>
      </div>
    );
  }

  if (viewState === "declined") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <X size={28} className="text-gray-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Invitation Declined</h2>
          <p className="mt-2 text-sm text-gray-500">
            You declined the invitation to join <b>{inviteData.tripName}</b>.
          </p>
          <button
            onClick={onDismiss}
            className="mt-6 w-full rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-500/90 active:scale-[0.98]"
          >
            Go to Collaboration
          </button>
        </div>
      </div>
    );
  }

  // ─── 子视图：输入密码登录 ───
  if (viewState === "login") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
          <button
            onClick={() => setViewState("decision")}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft size={14} /> Back to Invitation
          </button>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500/10">
              <UserRound size={24} className="text-primary-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Sign in to Accept</h2>
            <p className="mt-1 text-xs text-gray-500">
              An account exists for <b>{inviteData.email}</b>. Sign in to join <b>{inviteData.tripName}</b>.
            </p>
          </div>

          {submitError && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
              {submitError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email
              </label>
              <input
                disabled
                value={inviteData.email}
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoginSubmit()}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-200 bg-[#FAF8FF] px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="mt-1 text-xs text-primary-500"
              >
                {showPassword ? "Hide" : "Show"} password
              </button>
            </div>
            <button
              onClick={handleLoginSubmit}
              disabled={submitting || !password}
              className="w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white transition hover:bg-primary-500/90 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Signing in & Joining…" : "Sign in & Accept Invitation"}
            </button>
            <div className="text-center">
              <button
                onClick={() => setViewState("register")}
                className="text-xs text-gray-500 hover:text-primary-500"
              >
                Need to create a new account instead?
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── 子视图：注册新账号 ───
  if (viewState === "register") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
          <button
            onClick={() => setViewState("decision")}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft size={14} /> Back to Invitation
          </button>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500/10">
              <Mail size={24} className="text-primary-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Register &amp; Accept</h2>
            <p className="mt-1 text-xs text-gray-500">
              Create an account with <b>{inviteData.email}</b> to join <b>{inviteData.tripName}</b> as <b className="text-primary-500">{inviteData.role}</b>.
            </p>
          </div>

          {submitError && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
              {submitError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email Address (from Invitation)
              </label>
              <input
                disabled
                value={inviteData.email}
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="choose a username"
                className="w-full rounded-xl border border-gray-200 bg-[#FAF8FF] px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              {username.length > 0 && (
                <p className={`mt-1 text-[11px] ${/^[a-z0-9_]{3,24}$/.test(username) ? "text-green-600" : "text-gray-400"}`}>
                  {/^[a-z0-9_]{3,24}$/.test(username) ? "✓ Valid username" : "○ 3-24 chars: lowercase letters, numbers, _"}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !submitting && username && pwValid && fullName && handleRegisterSubmit()}
                placeholder="your full name"
                className="w-full rounded-xl border border-gray-200 bg-[#FAF8FF] px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !submitting && username && pwValid && fullName && handleRegisterSubmit()}
                placeholder="create a strong password"
                className="w-full rounded-xl border border-gray-200 bg-[#FAF8FF] px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="mt-1 text-xs text-primary-500"
              >
                {showPassword ? "Hide" : "Show"} password
              </button>
              {password.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  {(["len", "upper", "lower", "digit", "special"] as const).map((k) => (
                    <span key={k} className={pwChecks[k] ? "text-green-600" : "text-gray-400"}>
                      {pwChecks[k] ? "✓" : "○"} {k === "len" ? "8+ chars" : k === "upper" ? "Uppercase" : k === "lower" ? "Lowercase" : k === "digit" ? "Number" : "Special char"}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleRegisterSubmit}
              disabled={submitting || !username || !pwValid || !fullName}
              className="w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white transition hover:bg-primary-500/90 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Creating Account & Joining…" : "Create Account & Accept"}
            </button>
            <div className="text-center">
              <button
                onClick={() => setViewState("login")}
                className="text-xs text-gray-500 hover:text-primary-500"
              >
                Already registered? Sign in instead
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── 主视图：邀请意向决策卡片 ───
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10">
            <Mail size={30} className="text-primary-500" />
          </div>
          <span className="rounded-full bg-primary-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-500">
            Trip Invitation
          </span>
          <h2 className="mt-3 text-2xl font-bold text-gray-800">You&apos;re Invited to Collaborate!</h2>
          <p className="mt-2 text-sm text-gray-500">
            <b>{inviteData.invitedBy}</b> invited you to collaborate on
          </p>
          <div className="my-3 rounded-2xl border border-gray-100 bg-[#FAF8FF] p-4 text-left">
            <p className="text-base font-bold text-gray-800">{inviteData.tripName}</p>
            {inviteData.tripRegion && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={12} /> {inviteData.tripRegion}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${inviteData.role === "Editor" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"}`}>
                Role: {inviteData.role}
              </span>
              <span className="text-xs text-gray-400">
                {inviteData.role === "Editor" ? "Can edit itinerary & post comments" : "Read-only access"}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Sent to: <b className="text-gray-600">{inviteData.email}</b> · Expires in{" "}
            <b className="text-warning">{daysRemaining(new Date(inviteData.expiresAt).getTime())} days</b>
          </p>
        </div>

        {submitError && (
          <div className="mb-5 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
            {submitError}
          </div>
        )}

        {/* ─── 登录状态分支 ─── */}
        {isLoggedIn && user ? (
          <div className="space-y-4">
            {/* 如果当前已登录，给出显式提示 */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <p className="font-bold flex items-center gap-1.5">
                <span>⚠️</span> Current Session Notice
              </p>
              <p className="mt-1 leading-relaxed">
                You are currently signed in as <b>{user.name}</b>. This invitation was addressed to <b>{inviteData.email}</b>.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleAcceptLoggedIn}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-500/90 active:scale-[0.98] disabled:opacity-60"
              >
                <Check size={16} />
                Accept as {user.name}
              </button>

              <button
                onClick={handleSwitchAccount}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-6 py-2.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 active:scale-[0.98]"
              >
                Switch Account ({inviteData.accountExists ? `Sign in as ${inviteData.email}` : `Register as ${inviteData.email}`})
              </button>

              <button
                onClick={handleDecline}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50 hover:text-red-600"
              >
                <X size={14} />
                Decline Invitation
              </button>
            </div>
          </div>
        ) : (
          /* ─── 未登录分支 ─── */
          <div className="space-y-3">
            <button
              onClick={() => setViewState(inviteData.accountExists ? "login" : "register")}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-500/90 active:scale-[0.98]"
            >
              <Check size={16} />
              Accept Invitation
            </button>

            <button
              onClick={handleDecline}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-6 py-3 text-xs font-medium text-gray-500 transition hover:bg-gray-50 hover:text-red-600"
            >
              <X size={14} />
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
