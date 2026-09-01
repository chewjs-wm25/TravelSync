"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  MapPin,
  Users,
  ShieldCheck,
  Share2,
  Lock,
  RefreshCw,
  CalendarDays,
  Upload,
  Download,
  FileCode,
} from "lucide-react";
import { useCollabStore } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";
import { collabApi } from "@/api_layer/05_Collaboration_&_Shared_Planning/collab";
import type { TripShareSummary } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/TripShareService";
import LikePlanButton from "./LikePlanButton";
import ImportTripModal from "./ImportTripModal";

function formatDates(start?: string | null, end?: string | null): string {
  if (!start) return "No dates";
  const s = new Date(start + "T00:00:00");
  const sStr = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!end) return `${sStr}, ${s.getFullYear()}`;
  const e = new Date(end + "T00:00:00");
  const eStr = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return sStr === eStr ? `${sStr}, ${s.getFullYear()}` : `${sStr} — ${eStr}`;
}

function TripCard({
  summary,
  onToggle,
  onOpen,
  onExportJSON,
}: {
  summary: TripShareSummary;
  onToggle?: (tripId: string, next: boolean) => void;
  onOpen: (tripId: string) => void;
  onExportJSON: (tripId: string, tripName: string) => void;
}) {
  const isOwner = summary.myRole === "Owner";
  const [confirmPrivate, setConfirmPrivate] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (next: boolean) => {
    if (!onToggle) return;
    if (!isOwner) return;
    if (!next) {
      setConfirmPrivate(true);
      return;
    }
    setToggling(true);
    await onToggle(summary.tripId, true);
    setToggling(false);
  };

  const confirmKick = async () => {
    if (!onToggle) return;
    setToggling(true);
    await onToggle(summary.tripId, false);
    setToggling(false);
    setConfirmPrivate(false);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-800">{summary.tripName}</h3>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
            <CalendarDays size={12} />
            <span>{formatDates(summary.startDate, summary.endDate)}</span>
          </div>
          {summary.region && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
              <MapPin size={11} />
              <span className="truncate">{summary.region}</span>
            </div>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${
            summary.isShared ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          {summary.isShared ? "Shared" : "Private"}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1">
          <Users size={12} />
          {summary.memberCount} members
        </span>
        {summary.pendingInviteCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-600">
            {summary.pendingInviteCount} pending
          </span>
        )}
        {summary.myRole && (
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
              summary.myRole === "Owner"
                ? "bg-primary-500/10 text-primary-500"
                : summary.myRole === "Editor"
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-50 text-gray-500"
            }`}
          >
            {summary.myRole}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <LikePlanButton tripId={summary.tripId} size="sm" showLikersPopover={false} />
        <button
          onClick={() => onOpen(summary.tripId)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-500/90 active:scale-[0.98]"
        >
          <span>Open</span>
        </button>
        <button
          onClick={() => onExportJSON(summary.tripId, summary.tripName)}
          className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-primary-500"
          title="Export as JSON"
          aria-label="Export as JSON"
        >
          <Download size={14} />
        </button>
      </div>

      {isOwner && onToggle && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-100 bg-[#FAF8FF] px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
            {summary.isShared ? (
              <Share2 size={12} className="text-emerald-500" />
            ) : (
              <Lock size={12} className="text-gray-400" />
            )}
            {summary.isShared ? "Sharing enabled" : "Private only"}
          </span>
          <button
            disabled={toggling}
            onClick={() => handleToggle(!summary.isShared)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
              summary.isShared ? "bg-emerald-500" : "bg-gray-300"
            } ${toggling ? "opacity-60" : ""}`}
            aria-label="Toggle share"
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                summary.isShared ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      )}

      {confirmPrivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h4 className="text-sm font-semibold text-gray-800">Switch to Private?</h4>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              This will <b className="text-red-600">immediately remove all collaborators</b> and
              expire pending invites. They will lose access instantly. This cannot be undone without
              re-inviting.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                disabled={toggling}
                onClick={() => setConfirmPrivate(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={toggling}
                onClick={confirmKick}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
              >
                {toggling ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Private
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ControlCenter() {
  const controlCenter = useCollabStore((s) => s.controlCenter);
  const controlLoading = useCollabStore((s) => s.controlLoading);
  const controlError = useCollabStore((s) => s.controlError);
  const loadControlCenter = useCollabStore((s) => s.loadControlCenter);
  const toggleShare = useCollabStore((s) => s.toggleShare);
  const { isLoggedIn, user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    void loadControlCenter();
  }, [loadControlCenter, user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadControlCenter();
    setRefreshing(false);
    showToast("Trips refreshed");
  };

  const handleToggle = async (tripId: string, isShared: boolean) => {
    const res = await toggleShare(tripId, isShared);
    if (!res.success) {
      window.alert(res.message ?? "Failed to toggle share");
    } else {
      showToast(isShared ? "Collaboration sharing enabled" : "Switched to Private mode");
    }
  };

  const handleOpenSameTab = (tripId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("trip", tripId);
    window.location.href = url.toString();
  };

  const handleExportJSON = async (tripId: string, tripName: string) => {
    try {
      const res = await collabApi.getTripExport(tripId, user?.id);
      if (res.success && res.data) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(tripName || "trip").replace(/\s+/g, "_")}_plan.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Exported "${tripName}" as JSON`);
      } else {
        showToast(res.message || "Failed to export trip");
      }
    } catch (err) {
      showToast("Export failed: " + (err instanceof Error ? err.message : "Error"));
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-gray-500">
        <ShieldCheck size={40} className="text-primary-500/60" />
        <p className="text-sm font-medium text-gray-700">
          Please sign in to view and collaborate on trips.
        </p>
        <a
          href="/01_User_&_Account_Management"
          className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97]"
        >
          Sign In
        </a>
      </div>
    );
  }

  if (controlLoading && !controlCenter) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        <Loader2 size={20} className="mr-2 animate-spin" />
        Loading your trips…
      </div>
    );
  }

  const owned = controlCenter?.owned ?? [];
  const joined = controlCenter?.joined ?? [];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Collaboration Control Center
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage, share, export, and import your travel plans across the team.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-95"
          >
            <Upload size={14} />
            <span>Import Plan</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {controlError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
          {controlError}
        </div>
      )}

      {/* Section: My Plans */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            My Plans
          </h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
            {owned.length}
          </span>
        </div>

        {owned.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center space-y-3">
            <p className="text-sm font-medium text-gray-600">You have no trips yet.</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Create a trip in Trip Planning or import an existing JSON trip plan to get started.
            </p>
            <div className="flex items-center justify-center gap-2.5 pt-1">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-500/90"
              >
                <Upload size={13} />
                <span>Import Trip Plan</span>
              </button>
              <a
                href="/02_Trip_Planning_&_Itinerary_Management"
                className="inline-flex rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Go to Trip Planning
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {owned.map((s) => (
              <TripCard
                key={s.tripId}
                summary={s}
                onToggle={handleToggle}
                onOpen={handleOpenSameTab}
                onExportJSON={handleExportJSON}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section: Shared with me */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Shared with me
          </h2>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
            {joined.length}
          </span>
        </div>
        {joined.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-xs text-gray-400">
            No shared trips yet. When someone invites you, accepted trips will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {joined.map((s) => (
              <TripCard
                key={s.tripId}
                summary={s}
                onOpen={handleOpenSameTab}
                onExportJSON={handleExportJSON}
              />
            ))}
          </div>
        )}
      </section>

      {/* Tips footer */}
      <div className="rounded-2xl border border-gray-100 bg-[#FFFBF0] p-4 text-xs leading-relaxed text-gray-500">
        <b className="text-gray-700">Tip:</b> You can export any trip plan as a standard{" "}
        <code className="text-[11px] font-semibold text-amber-700 bg-amber-100/50 px-1 py-0.5 rounded">.json</code> file
        using the download button on any card, or import plans from other users into your own workspace using <b>Import Plan</b>.
      </div>

      {/* Import Modal */}
      <ImportTripModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          void loadControlCenter();
        }}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

