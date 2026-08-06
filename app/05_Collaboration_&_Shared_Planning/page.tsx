"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Mail,
  Link2,
  UserPlus,
  FileText,
  Download,
  CalendarDays,
  MessageSquare,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Send,
  MoreVertical,
  Share2,
} from "lucide-react";

const MEMBERS = [
  {
    name: "Marcus Chen",
    email: "marcus@travelsync.com",
    role: "Owner",
    avatar: "/images/collab/avatar-marcus.png",
    online: true,
  },
  {
    name: "Elena Rodriguez",
    email: "elena.r@globetrot.co",
    role: "Editor",
    avatar: "/images/collab/avatar-elena.png",
    online: true,
  },
  {
    name: "Jordan Smyth",
    email: "jsmyth.finance@org.com",
    role: "Viewer",
    avatar: "/images/collab/avatar-jordan.png",
    online: false,
  },
];

const COMMENTS = [
  {
    name: "Marcus",
    avatar: "/images/collab/comment-marcus.png",
    time: "10:42 AM",
    text: "I've updated the train schedule for the Kyoto segment.",
    own: false,
  },
  {
    name: "Elena",
    avatar: "/images/collab/comment-elena.png",
    time: "10:45 AM",
    text: "Perfect! Just checked the PDF export.",
    own: true,
  },
];

const ROLE_OPTIONS = ["Editor", "Viewer"] as const;

export default function CollaborationPage() {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(COMMENTS);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("Editor");

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    setComments([
      ...comments,
      {
        name: "You",
        avatar: "",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: commentText,
        own: true,
      },
    ]);
    setCommentText("");
  };

  const handleInvite = () => {
    if (!email.trim()) return;
    alert(`Invite sent to ${email} as ${role}`);
    setEmail("");
  };

  return (
    <div className="flex gap-6">
      {/* ─── Main Content Area ─── */}
      <div className="flex-1 space-y-6">
        {/* ─── Page Header ─── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Collaboration Center
            </h1>
            <p className="mt-1 text-gray-500">
              Japanese Alps Expedition • Oct 12-24, 2024
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-200 active:scale-[0.97]">
              <Share2 size={18} />
              Share Link
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-3 font-medium text-white shadow-md transition hover:bg-primary-500/80 active:scale-[0.97]">
              <UserPlus size={18} />
              Invite
            </button>
          </div>
        </div>

        {/* ─── Grid: 8-col main + 4-col sidebar ─── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── Left: Invite + Members (8 cols) ── */}
          <div className="space-y-6 lg:col-span-8">
            {/* ── Invite Collaborators Card ── */}
            <div className="rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <div className="mb-6 flex items-center gap-3">
                <Mail size={20} className="text-primary-500" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Invite Collaborators
                </h2>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-gray-200 bg-[#FAF8FF] px-4 py-3 pr-10 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
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
                  onClick={handleInvite}
                  className="rounded-lg bg-primary-500 px-8 py-3 text-sm font-medium text-white transition hover:bg-primary-500/80 active:scale-[0.97]"
                >
                  Send
                </button>
              </div>
            </div>

            {/* ── Active Members Card ── */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between border-b border-gray-100 px-8 py-5">
                <h2 className="text-xl font-semibold text-gray-800">
                  Active Members
                </h2>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-primary-500">
                  4 Active Now
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {MEMBERS.map((m) => (
                  <div
                    key={m.email}
                    className="flex items-center justify-between px-8 py-5"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative h-12 w-12 shrink-0">
                        <Image
                          src={m.avatar}
                          alt={m.name}
                          fill
                          sizes="48px"
                          className="rounded-full object-cover"
                        />
                        {m.online && (
                          <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                        )}
                      </div>
                      {/* Info */}
                      <div>
                        <p className="font-semibold text-gray-800">
                          {m.name}
                        </p>
                        <p className="text-sm text-gray-500">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Role badge */}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          m.role === "Owner"
                            ? "bg-red-50 text-primary-500"
                            : "border border-gray-200 text-gray-500"
                        }`}
                      >
                        {m.role}
                      </span>
                      <button className="text-gray-400 transition hover:text-gray-600">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Export + Image (4 cols) ── */}
          <div className="space-y-6 lg:col-span-4">
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

            {/* ── Image Card ── */}
            <div className="relative h-48 overflow-hidden rounded-2xl">
              <Image
                src="/images/collab/mount-yarigatake.png"
                alt="Mount Yarigatake Hike"
                fill
                sizes="(max-width: 1024px) 100vw, 25vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute right-0 bottom-0 left-0 p-6">
                <p className="text-lg font-semibold text-white">
                  Mount Yarigatake Hike
                </p>
                <p className="mt-1 text-sm text-white/80">
                  Section 4 • Day 6
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Live Comments Sidebar (320px) ─── */}
      <div className="hidden w-80 shrink-0 border-l border-gray-200 bg-white/80 backdrop-blur-sm xl:flex xl:flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-5">
          <MessageSquare size={20} className="text-primary-500" />
          <h3 className="font-semibold text-gray-800">Live Comments</h3>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {comments.map((c, i) => (
            <div key={i} className="flex gap-3">
              {c.avatar ? (
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={c.avatar}
                    alt={c.name}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
                  Y
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
                    {c.name}
                  </span>
                  <span className="text-[10px] text-gray-400">{c.time}</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
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
        </div>
      </div>
    </div>
  );
}
