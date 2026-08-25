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
  Loader2,
  RefreshCw,
  Mail,
  Copy,
  AlertCircle,
} from "lucide-react";
import {
  can,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/RolePermissions";
import {
  daysRemaining,
  formatDate,
} from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/InvitationService";
import { useCollabStore } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";
import { useAuthStore } from "@/app/DEV-ACCOUNT-STATE/authUser";

import InviteCollaboratorsPanel from "./components/InviteCollaboratorsPanel";
import PendingInvitesPanel from "./components/PendingInvitesPanel";
import MemberManagementPanel from "./components/MemberManagementPanel";
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

  const { isLoggedIn } = useAuthStore();

  // 邀请注册流程：有 invite token 且未登录 → 显示注册表单
  if (!isLoggedIn && inviteToken) {
    return <InviteRegistrationFlow token={inviteToken} />;
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-gray-500">
        <ShieldCheck size={40} className="text-primary-500/60" />
        <p className="text-sm">请先登录以查看协作行程。</p>
        <a
          href="/01_User_&_Account_Management"
          className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97]"
        >
          前往登录
        </a>
      </div>
    );
  }

  if (!trip || !me) return null;

  const canComment = can(me.role, "comment");
  const canInvite = can(me.role, "invite");
  const isOwner = me.role === "Owner";
  const invite = trip.invites.find((i) => i.token === inviteToken && i.status === "pending");

  const handleSendComment = () => {
    if (!commentText.trim() || !canComment) return;
    addComment(commentText.trim());
    setCommentText("");
  };

  const handleInviteScroll = () => {
    document
      .getElementById("invite-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleShareLink = async () => {
    const tripId = trip.id;
    const url = `${window.location.origin}/05_Collaboration_&_Shared_Planning?trip=${tripId}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Trip share link copied!");
    } catch {
      showToast(url);
    }
  };

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

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
    downloadFile(csv, `${trip.name.replace(/\s+/g, "_")}_itinerary.csv`, "text/csv");
  };

  const exportICS = () => {
    if (!trip) return;
    const ics = generateICS(trip);
    downloadFile(ics, `${trip.name.replace(/\s+/g, "_")}_itinerary.ics`, "text/calendar");
  };

  const generateExportContent = (t: typeof trip, _format: string) => {
    if (!t) return "";
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${t.name} - Itinerary</title>
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
  <h1>${t.name}</h1>
  <div class="meta">
    <p><strong>Dates:</strong> ${t.dates}</p>
    <p><strong>Region:</strong> ${t.region}</p>
    <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>
  </div>
  <div class="meta">
    <strong>Collaborators:</strong>
    <div class="members">
      ${t.members.map(m => `<span class="member">${m.name} (${m.role})</span>`).join("")}
    </div>
  </div>
  ${t.items.length === 0 ? '<p style="color: #9ca3af; text-align: center; padding: 40px;">No itinerary items yet</p>' : 
    Object.entries(
      t.items.reduce((acc, item) => {
        (acc[item.day] = acc[item.day] || []).push(item);
        return acc;
      }, {} as Record<number, typeof t.items>)
    ).map(([day, items]) => `
    <div class="day">
      <div class="day-title">Day ${day}</div>
      ${items.map(item => `
      <div class="item">
        <div class="item-title">${item.title}</div>
        ${item.note ? `<div class="item-note">${item.note}</div>` : ""}
      </div>`).join("")}
    </div>`).join("")}
  ${t.comments.length > 0 ? `
  <div class="day" style="margin-top: 40px;">
    <div class="day-title" style="background: #8b5cf6;">Comments</div>
    ${t.comments.map(c => `
    <div class="item" style="background: #faf5ff; border-color: #e9d5ff;">
      <div class="item-title">${c.authorName}</div>
      <div class="item-note">${c.text}</div>
    </div>`).join("")}
  </div>` : ""}
</body>
</html>`;
  };

  const generateCSV = (t: typeof trip) => {
    if (!t) return "";
    const headers = ["Day", "Title", "Note"];
    const rows = t.items.map(item => [
      `Day ${item.day}`,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${(item.note || "").replace(/"/g, '""')}"`
    ]);
    return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  };

  const generateICS = (t: typeof trip) => {
    if (!t) return "";
    const parseDate = (dateStr: string) => {
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) return new Date(+match[3], +match[1] - 1, +match[2]);
      return new Date();
    };
    const startDate = parseDate(t.dates.split("–")[0].split("-")[0].trim());
    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const events = t.items.map((item, idx) => {
      const eventDate = new Date(startDate);
      eventDate.setDate(startDate.getDate() + item.day - 1);
      const dtstart = eventDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      return `BEGIN:VEVENT
UID:${t.id}-${item.id}@travelsync
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
SUMMARY:${item.title}
DESCRIPTION:${item.note || "No notes"}
END:VEVENT`;
    }).join("\n");
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
            {/* 同步状态指示器 */}
            <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600">
              <RefreshCw size={14} />
              <span>Synced</span>
            </div>
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

        {/* ─── Demo fallback notice (local DB unavailable) ─── */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-xs leading-relaxed text-warning">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <div>
              <b>演示模式：</b>本地数据库暂不可用，当前展示内置演示数据，写入操作不可用。
              在项目根目录运行 <code className="rounded bg-warning/20 px-1">npm run dev</code> 会自动初始化真实数据库。
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
            <ItineraryPermissionDemo />
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
                  onClick={exportICS}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:bg-gray-50 active:scale-[0.98]"
                >
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
        <div className="fixed bottom-6 right-6 z-40 flex w-80 flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl" style={{ maxHeight: "min(520px, calc(100vh - 120px))" }}>
          <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
            <MessageSquare size={18} className="text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-800">Live Comments</h3>
            <span className="ml-1 rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-bold text-primary-500">
              {comments.length}
            </span>
            <button
              onClick={() => setChatOpen(false)}
              className="ml-auto rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {comments.map((c, i) => (
              <div key={c.id ?? i} className="flex gap-2.5">
                {c.avatar ? (
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={c.avatar}
                      alt={c.authorName}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white">
                    {c.authorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className={`max-w-[220px] rounded-xl px-3 py-2 ${
                    c.own
                      ? "border border-red-100 bg-red-50"
                      : "border border-gray-100 bg-[#FAF8FF]"
                  }`}
                >
                  <div className="mb-0.5 flex items-baseline justify-between gap-3">
                    <span
                      className={`text-[11px] font-semibold ${
                        c.own ? "text-primary-500" : "text-gray-800"
                      }`}
                    >
                      {c.authorName}
                    </span>
                    <span className="text-[9px] text-gray-400">{c.time}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-700">{c.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 px-4 py-3">
            {canComment ? (
              <>
                <div className="rounded-lg border border-gray-200 bg-[#FAF8FF] p-2.5">
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
                    className="w-full resize-none bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
                  />
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <button
                    onClick={handleSendComment}
                    className="rounded-lg bg-primary-500 px-4 py-1.5 text-[11px] font-bold text-white transition hover:bg-primary-500/80 active:scale-95"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-center text-[11px] text-gray-500">
                <b>{me.role}</b> role cannot post comments.
              </div>
            )}
          </div>
        </div>
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

      {toast && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

/** 邀请注册流程：未登录用户打开邀请链接时显示 */
function InviteRegistrationFlow({ token }: { token: string }) {
  const [inviteData, setInviteData] = useState<{
    email: string;
    role: string;
    tripName: string;
    tripRegion: string;
    invitedBy: string;
    expiresAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
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
        const data = await res.json() as { ok: boolean; invite?: typeof inviteData; error?: string };
        if (data.ok && data.invite) setInviteData(data.invite);
        else setFetchError(data.error || "Invalid invitation");
      })
      .catch(() => setFetchError("Failed to load invitation"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!username || !password || !fullName) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/05_Collaboration_&_Shared_Planning/api/collab/invites/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username, password, fullName }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        window.location.href = "/05_Collaboration_&_Shared_Planning";
      } else {
        setSubmitError(data.error || "Registration failed");
      }
    } catch {
      setSubmitError("Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        <Loader2 size={24} className="mr-2 animate-spin" />
        Loading invitation…
      </div>
    );
  }

  if (fetchError && !inviteData) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-gray-500">
        <ShieldCheck size={40} className="text-red-400/60" />
        <p className="text-sm">{fetchError}</p>
        <a
          href="/05_Collaboration_&_Shared_Planning"
          className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97]"
        >
          Back to Collaboration
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10">
            <Mail size={28} className="text-primary-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">You&apos;re Invited!</h2>
          <p className="mt-2 text-sm text-gray-500">
            <b>{inviteData?.invitedBy}</b> invited you to join
          </p>
          <p className="text-lg font-semibold text-gray-800">{inviteData?.tripName}</p>
          <p className="text-xs text-gray-400">{inviteData?.tripRegion}</p>
          <p className="mt-2 text-sm text-gray-500">
            as <b className="text-primary-500">{inviteData?.role}</b>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Invited to: <b>{inviteData?.email}</b>
          </p>
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-xl bg-primary-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97]"
          >
            Register &amp; Accept
          </button>
        ) : (
          <div className="space-y-4">
            {submitError && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{submitError}</p>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                required
                className="w-full rounded-lg border border-gray-200 bg-[#FAF8FF] px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="choose a username"
              />
              {username.length > 0 && (
                <p className={`mt-1 text-[11px] ${/^[a-z0-9_]{3,24}$/.test(username) ? "text-green-600" : "text-gray-400"}`}>
                  {/^[a-z0-9_]{3,24}$/.test(username) ? "✓ Valid username" : "○ 3-24 chars: lowercase letters, numbers, _"}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 bg-[#FAF8FF] px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="your full name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 bg-[#FAF8FF] px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="create a strong password"
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
              onClick={handleSubmit}
              disabled={submitting || !username || !pwValid || !fullName}
              className="w-full rounded-xl bg-primary-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating Account…" : "Create Account & Join"}
            </button>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          Already have an account?{" "}
          <a href="/01_User_&_Account_Management" className="text-primary-500 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
