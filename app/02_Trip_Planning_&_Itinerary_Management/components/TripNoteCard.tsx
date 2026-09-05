"use client";

import { useEffect, useState } from "react";

type TripNoteCardProps = {
  note: string;
  onSaveNote: (note: string) => Promise<boolean> | boolean;
};

export function TripNoteCard({ note, onSaveNote }: TripNoteCardProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState(note);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditingNote) {
      setDraftNote(note);
    }
  }, [note, isEditingNote]);

  const handleOpenNoteField = () => {
    setDraftNote(note);
    setIsEditingNote(true);
  };

  const handleSaveNote = async (nextNote: string) => {
    setIsSaving(true);

    try {
      const wasSaved = await onSaveNote(nextNote);
      if (wasSaved) {
        setIsEditingNote(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#ff6b6b] uppercase">
            Travel Notes
          </p>
          <h2 className="mt-1 text-lg font-bold text-gray-800">Trip Note</h2>
        </div>

        {isEditingNote ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void handleSaveNote(draftNote);
              }}
              disabled={isSaving}
              className="rounded-xl bg-[#ff6b6b] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#ff5252] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isSaving) {
                  setDraftNote(note);
                  setIsEditingNote(false);
                }
              }}
              disabled={isSaving}
              className="rounded-xl border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        ) : note ? (
          <button
            type="button"
            onClick={() => {
              void handleSaveNote("");
            }}
            disabled={isSaving}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Clear Note"
            title="Clear Note"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenNoteField}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 active:scale-90"
            aria-label="Add Note"
            title="Add Note"
          >
            <span className="text-lg font-bold">+</span>
          </button>
        )}
      </div>

      {isEditingNote ? (
        <div className="mt-4">
          <textarea
            rows={4}
            value={draftNote}
            onChange={(event) => setDraftNote(event.target.value)}
            placeholder="Write your trip notes here..."
            className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:border-[#ff6b6b] focus:ring-2 focus:ring-[#ff6b6b]/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
            disabled={isSaving}
          />
        </div>
      ) : note ? (
        <div className="mt-3 rounded-xl bg-gray-50 p-4">
          <p className="text-sm whitespace-pre-wrap text-gray-700">
            {note}
          </p>
          <div className="mt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleOpenNoteField}
              className="-my-1 rounded-md px-2 py-1 text-xs font-medium text-[#ff6b6b] transition-colors hover:bg-[#ff6b6b]/10 hover:underline active:opacity-70"
            >
              Edit
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500">
          Keep a short Malaysia trip summary, reminder, or plan here.
        </p>
      )}
    </div>
  );
}