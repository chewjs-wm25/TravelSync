"use client";

import { useState } from "react";

type ItemNoteEditorProps = {
  initialNote: string;
  onSaveNote: (note: string) => void;
  onCancel: () => void;
};

export function ItemNoteEditor({
  initialNote,
  onSaveNote,
  onCancel,
}: ItemNoteEditorProps) {
  const [tempNote, setTempNote] = useState(initialNote);

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Note</span>
        {tempNote.length > 0 && (
          <button
            type="button"
            onClick={() => setTempNote("")}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Clear note text"
            aria-label="Clear note text"
          >
            <svg
              className="h-3.5 w-3.5"
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
        )}
      </div>

      <input
        type="text"
        value={tempNote}
        onChange={(event) => setTempNote(event.target.value)}
        placeholder="Add a note for this place..."
        className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-800 outline-none focus:border-[#ff6b6b]"
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSaveNote(tempNote)}
          className="rounded-lg bg-[#ff6b6b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#ff5252]"
        >
          Save Note
        </button>
      </div>
    </div>
  );
}
