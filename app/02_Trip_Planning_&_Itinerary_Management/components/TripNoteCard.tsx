"use client";

import { useState } from "react";

type TripNoteCardProps = {
  initialNote?: string;
};

export function TripNoteCard({ initialNote = "" }: TripNoteCardProps) {
  const [noteText, setNoteText] = useState(initialNote);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tempNoteText, setTempNoteText] = useState(initialNote);

  const handleOpenNoteField = () => {
    setTempNoteText(noteText);
    setIsEditingNote(true);
  };

  const handleSaveNote = () => {
    setNoteText(tempNoteText);
    setIsEditingNote(false);
  };

  const handleClearNote = () => {
    setNoteText("");
    setTempNoteText("");
    setIsEditingNote(false);
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Notes</h2>

        {isEditingNote ? (
          <button
            type="button"
            onClick={handleSaveNote}
            className="rounded-xl bg-[#ff6b6b] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#ff5252]"
          >
            Save
          </button>
        ) : noteText ? (
          <button
            type="button"
            onClick={handleClearNote}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
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
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200"
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
            rows={3}
            value={tempNoteText}
            onChange={(event) => setTempNoteText(event.target.value)}
            placeholder="Write your trip notes here..."
            className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:border-[#ff6b6b] focus:ring-2 focus:ring-[#ff6b6b]/20 focus:outline-none"
          />
        </div>
      ) : noteText ? (
        <div className="group relative mt-3 flex items-start justify-between rounded-xl bg-gray-50 p-4">
          <p className="text-sm whitespace-pre-wrap text-gray-700">
            {noteText}
          </p>
          <button
            type="button"
            onClick={handleOpenNoteField}
            className="ml-2 text-xs font-medium text-[#ff6b6b] hover:underline"
          >
            Edit
          </button>
        </div>
      ) : null}
    </div>
  );
}
