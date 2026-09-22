"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Calendar,
  MapPin,
  Share2,
  ArrowRight,
  Sparkles,
  Key,
} from "lucide-react";
import { parseAndValidateTripPlan } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/PlanImportExportService";
import { useCollabStore } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/store/CollabStore";
import { collabApi } from "@/api_layer/05_Collaboration_&_Shared_Planning/collab";
import type { ImportTripPayload } from "@/api_layer/05_Collaboration_&_Shared_Planning/types";

interface ImportTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newTripId: string) => void;
  initialKey?: string;
}

export default function ImportTripModal({
  isOpen,
  onClose,
  onSuccess,
  initialKey,
}: ImportTripModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<"key" | "file">("key");
  const [inputKey, setInputKey] = useState(initialKey ?? "");
  const [isFetchingKey, setIsFetchingKey] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedPlan, setParsedPlan] = useState<ImportTripPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    tripId: string;
    tripName: string;
  } | null>(null);

  // Form edit states
  const [editTripName, setEditTripName] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editTripNote, setEditTripNote] = useState("");
  const [editIsShared, setEditIsShared] = useState(false);

  const importTripPlan = useCollabStore((s) => s.importTripPlan);

  const handleFetchByKey = async (targetKey?: string) => {
    const raw = (targetKey ?? inputKey).trim();
    if (!raw) {
      setErrorMsg("Please enter a valid Share Key or Link.");
      return;
    }

    setErrorMsg(null);
    setSuccessResult(null);
    setIsFetchingKey(true);

    try {
      const res = await collabApi.getPlanByShareKey(raw);
      if (!res.success || !res.plan) {
        setErrorMsg(res.message || "Failed to find plan for this key. Please check the code.");
        setParsedPlan(null);
        return;
      }

      const plan = res.plan;
      setParsedPlan(plan);
      setFileName(`Key: ${res.shareKey || raw}`);
      setEditTripName(plan.tripName);
      setEditRegion(plan.region || "");
      setEditStartDate(plan.startDate || "");
      setEditEndDate(plan.endDate || "");
      setEditTripNote(plan.tripNote || "");
      setEditIsShared(plan.isShared || false);
    } catch (err) {
      setErrorMsg("Failed to retrieve plan: " + (err instanceof Error ? err.message : "Unknown error"));
      setParsedPlan(null);
    } finally {
      setIsFetchingKey(false);
    }
  };

  useEffect(() => {
    if (!initialKey || !isOpen) return;
    let active = true;
    void (async () => {
      setIsFetchingKey(true);
      setErrorMsg(null);
      try {
        const res = await collabApi.getPlanByShareKey(initialKey);
        if (!active) return;
        if (res.success && res.plan) {
          setParsedPlan(res.plan);
          setFileName(`Key: ${res.shareKey || initialKey}`);
          setEditTripName(res.plan.tripName);
          setEditRegion(res.plan.region || "");
          setEditStartDate(res.plan.startDate || "");
          setEditEndDate(res.plan.endDate || "");
          setEditTripNote(res.plan.tripNote || "");
          setEditIsShared(res.plan.isShared || false);
        } else {
          setErrorMsg(res.message || "Failed to find plan for this key. Please check the code.");
        }
      } catch (err) {
        if (active) {
          setErrorMsg("Failed to retrieve plan: " + (err instanceof Error ? err.message : "Unknown error"));
        }
      } finally {
        if (active) {
          setIsFetchingKey(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [initialKey, isOpen]);

  if (!isOpen) return null;

  const handleReset = () => {
    setFileName(null);
    setErrorMsg(null);
    setParsedPlan(null);
    setSuccessResult(null);
    setInputKey("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessResult(null);
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith(".json")) {
      setErrorMsg("Please upload a valid .json file.");
      return;
    }

    try {
      const text = await file.text();
      const result = parseAndValidateTripPlan(text);

      if (!result.success || !result.plan) {
        setErrorMsg(result.error || "Failed to parse trip plan from file.");
        setParsedPlan(null);
        return;
      }

      const plan = result.plan;
      setParsedPlan(plan);
      setEditTripName(plan.tripName);
      setEditRegion(plan.region || "");
      setEditStartDate(plan.startDate || "");
      setEditEndDate(plan.endDate || "");
      setEditTripNote(plan.tripNote || "");
      setEditIsShared(plan.isShared || false);
    } catch (err) {
      setErrorMsg("Failed to read file: " + (err instanceof Error ? err.message : "Unknown error"));
      setParsedPlan(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleSubmitImport = async () => {
    if (!parsedPlan) return;
    if (!editTripName.trim()) {
      setErrorMsg("Please specify a trip name.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: ImportTripPayload = {
      ...parsedPlan,
      tripName: editTripName.trim(),
      region: editRegion.trim() || null,
      startDate: editStartDate.trim() || null,
      endDate: editEndDate.trim() || null,
      tripNote: editTripNote.trim() || null,
      isShared: editIsShared,
    };

    try {
      const res = await importTripPlan(payload);
      if (res.success && res.tripId) {
        setSuccessResult({
          tripId: res.tripId,
          tripName: res.tripName || editTripName,
        });
        if (onSuccess) onSuccess(res.tripId);
      } else {
        setErrorMsg(res.message || "Failed to import trip plan.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalDays = parsedPlan?.itineraries.length ?? 0;
  const totalPlaces =
    parsedPlan?.itineraries.reduce((sum, d) => sum + d.items.length, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Import Trip Plan</h2>
              <p className="text-xs text-gray-500">
                Import with Share Key or upload a JSON file to create a brand new trip in your workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Success Screen */}
          {successResult ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Plan Imported Successfully!
                </h3>
                <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                  &ldquo;{successResult.tripName}&rdquo; has been created and saved to your account.
                  You can now manage, edit, and invite collaborators.
                </p>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95"
                >
                  Close
                </button>
                <a
                  href={`/05_Collaboration_&_Shared_Planning?trip=${encodeURIComponent(
                    successResult.tripId
                  )}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-primary-500/90 active:scale-95"
                >
                  <span>Open New Trip Plan</span>
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Selector (only shown if plan not yet loaded) */}
              {!parsedPlan && (
                <div className="flex border border-gray-100 bg-gray-50/80 p-1.5 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("key");
                      setErrorMsg(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition active:scale-[0.98] ${
                      activeTab === "key"
                        ? "bg-white text-primary-500 shadow-xs border border-gray-200/60"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    }`}
                  >
                    <Key size={14} />
                    <span>Import via Share Key</span>
                    <span className="rounded-full bg-primary-500/10 px-1.5 py-0.2 text-[9px] font-bold text-primary-500">
                      No File
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("file");
                      setErrorMsg(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition active:scale-[0.98] ${
                      activeTab === "file"
                        ? "bg-white text-primary-500 shadow-xs border border-gray-200/60"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    }`}
                  >
                    <FileCode size={14} />
                    <span>Upload JSON File</span>
                  </button>
                </div>
              )}

              {/* Input or Upload Area */}
              {!parsedPlan ? (
                activeTab === "key" ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-6 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary-500 shadow-sm border border-gray-100">
                      <Key size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">
                        Enter Trip Share Key or Link
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Paste the Key (e.g. <code className="text-primary-500 font-semibold bg-primary-500/10 px-1 py-0.5 rounded">PLAN-XXXX-XXXX</code>) or the direct share link
                      </p>
                    </div>

                    <div className="flex items-center gap-2 max-w-md mx-auto pt-2">
                      <input
                        type="text"
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleFetchByKey();
                          }
                        }}
                        placeholder="e.g. PLAN-7K8M-2N9P"
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-800 font-mono tracking-wide placeholder:font-sans focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        disabled={isFetchingKey || !inputKey.trim()}
                        onClick={() => void handleFetchByKey()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFetchingKey ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        <span>{isFetchingKey ? "Loading..." : "Load Plan"}</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-400 pt-1">
                      No need to download or handle files. Directly import the complete itinerary into your workspace.
                    </p>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                      dragActive
                        ? "border-primary-500 bg-primary-500/10"
                        : "border-gray-200 bg-gray-50/60 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-primary-500 mb-3">
                      <FileCode size={24} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      Click to browse or drag and drop your trip JSON file
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Supports standard TravelSync trip export format (.json)
                    </p>
                  </div>
                )
              ) : (
                /* Selected / Loaded Plan Badge */
                <div className="flex items-center justify-between rounded-2xl border border-primary-500/20 bg-primary-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary-500 shadow-sm">
                      {activeTab === "key" ? <Key size={20} /> : <FileCode size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-gray-800 truncate max-w-xs">
                          {fileName}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200/50">
                          <CheckCircle2 size={10} /> Valid Plan
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {totalDays} {totalDays === 1 ? "day" : "days"} • {totalPlaces}{" "}
                        {totalPlaces === 1 ? "place" : "places"} detected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-500 transition hover:bg-white/80 hover:text-gray-700 active:scale-95"
                  >
                    Change Plan
                  </button>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-600">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <b>Validation Error:</b> {errorMsg}
                  </div>
                </div>
              )}

              {/* Editable Trip Settings Form */}
              {parsedPlan && (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <Sparkles size={13} className="text-primary-500" />
                    Trip Details & Configuration
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Trip Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editTripName}
                        onChange={(e) => setEditTripName(e.target.value)}
                        placeholder="e.g. Langkawi Island Getaway"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Destination / Region (Malaysia)
                        </label>
                        <div className="relative">
                          <MapPin
                            size={14}
                            className="absolute left-3 top-2.5 text-gray-400"
                          />
                          <input
                            type="text"
                            value={editRegion}
                            onChange={(e) => setEditRegion(e.target.value)}
                            placeholder="e.g. Kedah / Langkawi"
                            className="w-full rounded-xl border border-gray-200 pl-8 pr-3.5 py-2 text-xs text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-2.5 py-2 text-xs text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-2.5 py-2 text-xs text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Trip Note / Memo
                      </label>
                      <textarea
                        rows={2}
                        value={editTripNote}
                        onChange={(e) => setEditTripNote(e.target.value)}
                        placeholder="Any notes, reminders, or packing lists..."
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center gap-2">
                        <Share2 size={16} className="text-primary-500" />
                        <div>
                          <p className="text-xs font-semibold text-gray-800">
                            Enable Collaboration Sharing
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Allows you to invite friends to co-edit immediately after importing
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={editIsShared}
                        onChange={(e) => setEditIsShared(e.target.checked)}
                        className="h-4 w-4 rounded text-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Preview Itineraries List */}
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-bold text-gray-700 mb-2.5">
                      Itinerary Schedule Preview ({totalDays} Days)
                    </p>
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {parsedPlan.itineraries.map((day, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-semibold text-gray-800 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-primary-500" />
                              {day.title} {day.date ? `(${day.date})` : ""}
                            </span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              {day.items.length} {day.items.length === 1 ? "stop" : "stops"}
                            </span>
                          </div>
                          {day.items.length === 0 ? (
                            <p className="text-[11px] italic text-gray-400">No places assigned</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {day.items.map((item, itemIdx) => (
                                <span
                                  key={itemIdx}
                                  className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700 border border-gray-200 shadow-2xs"
                                  title={item.note || item.name}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                                  {item.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!successResult && (
          <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 px-6 py-4 bg-gray-50/50">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitImport}
              disabled={!parsedPlan || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary-500/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Importing Plan…</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>Import as New Plan</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
