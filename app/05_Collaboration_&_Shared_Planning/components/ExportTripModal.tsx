"use client";

import { useState, useEffect } from "react";
import {
  X,
  Key,
  Download,
  Copy,
  Check,
  FileCode,
  Share2,
  Loader2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { collabApi } from "@/api_layer/05_Collaboration_&_Shared_Planning/collab";

interface ExportTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  onDownloadJSON: (tripId: string, tripName: string) => void;
}

export default function ExportTripModal({
  isOpen,
  onClose,
  tripId,
  tripName,
  onDownloadJSON,
}: ExportTripModalProps) {
  const [activeTab, setActiveTab] = useState<"key" | "json">("key");
  const [shareKey, setShareKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen || !tripId) return;

    let isCurrent = true;

    void (async () => {
      setLoadingKey(true);
      try {
        const res = await collabApi.createPlanShareKey(tripId);
        if (!isCurrent) return;
        if (res.success && res.shareKey) {
          setShareKey(res.shareKey);
          setErrorMsg(null);
        } else {
          setErrorMsg(res.message || "Failed to generate share key.");
        }
      } catch (err) {
        if (isCurrent) {
          setErrorMsg(err instanceof Error ? err.message : "Error generating key");
        }
      } finally {
        if (isCurrent) {
          setLoadingKey(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [isOpen, tripId]);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareKey
    ? `${origin}/05_Collaboration_&_Shared_Planning?importKey=${encodeURIComponent(shareKey)}`
    : "";

  const handleCopyKey = async () => {
    if (!shareKey) return;
    try {
      await navigator.clipboard.writeText(shareKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Share & Export Plan</h2>
              <p className="text-xs text-gray-500 truncate max-w-xs">{tripName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 p-2 gap-1.5">
          <button
            onClick={() => setActiveTab("key")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition active:scale-[0.98] ${
              activeTab === "key"
                ? "bg-white text-primary-500 shadow-xs border border-gray-200/60"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            <Key size={14} />
            <span>Share via Key / Token</span>
            <span className="rounded-full bg-primary-500/10 px-1.5 py-0.2 text-[9px] font-bold text-primary-500">
              No File
            </span>
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition active:scale-[0.98] ${
              activeTab === "json"
                ? "bg-white text-primary-500 shadow-xs border border-gray-200/60"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            <FileCode size={14} />
            <span>JSON File Download</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "key" ? (
            /* Tab 1: Share Key */
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-500/10 to-white p-5 text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-2.5 py-1 text-[11px] font-semibold text-primary-500">
                  <Sparkles size={12} />
                  <span>Instant Plan Sharing Key</span>
                </div>

                {loadingKey ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
                    <Loader2 size={24} className="animate-spin text-primary-500" />
                    <span>Generating unique share key...</span>
                  </div>
                ) : errorMsg ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                    {errorMsg}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Share Key Display Card */}
                    <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-dashed border-primary-200 bg-white px-4 py-3 shadow-inner">
                      <span className="font-mono text-base sm:text-lg font-extrabold tracking-wider text-primary-500 select-all truncate">
                        {shareKey}
                      </span>
                      <button
                        onClick={handleCopyKey}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                          copiedKey
                            ? "bg-emerald-500 text-white"
                            : "bg-primary-500 text-white hover:bg-primary-500/90 shadow-sm"
                        }`}
                      >
                        {copiedKey ? (
                          <>
                            <Check size={14} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Key</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Direct Link Box */}
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Direct Share Link</p>
                        <p className="truncate text-xs font-mono text-gray-600">{shareUrl}</p>
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                          copiedLink
                            ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                        title="Copy direct link"
                      >
                        {copiedLink ? "Link Copied!" : "Copy Link"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs space-y-1.5 text-gray-500">
                <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  How does Share Key work?
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-500 leading-relaxed">
                  <li>
                    Send this Key or Link to any friend. They don&apos;t need to download or send any files.
                  </li>
                  <li>
                    They simply paste this Key into <b>Import Plan</b> to instantly import a complete copy into their account.
                  </li>
                  <li>
                    The key captures the full snapshot of days, spots, and notes.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Tab 2: Classic JSON File Download */
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm border border-gray-100">
                  <FileCode size={28} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Standard TravelSync JSON File
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                    Export your full trip plan as a standardized <code className="text-amber-700 font-semibold">.json</code> data file.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onDownloadJSON(tripId, tripName);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-gray-900 active:scale-95"
                  >
                    <Download size={15} />
                    <span>Download {tripName ? `"${tripName}.json"` : "Plan JSON"}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-amber-50/40 p-4 text-xs text-amber-800 leading-relaxed">
                <b>File-based workflow:</b> Save the file to your computer or phone, then send it to someone else. The recipient can upload it via the &quot;Import from JSON File&quot; tab.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-gray-100 px-6 py-3 bg-gray-50/50">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
