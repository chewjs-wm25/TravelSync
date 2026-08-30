"use client";

import { useState } from "react";

export type ItemEditPayload = {
  name: string;
  note: string;
  position?: number;
  start_time?: string;
  end_time?: string;
};

export type ItemNoteEditorProps = {
  initialName: string;
  initialNote: string;
  initialPosition?: number;
  initialStartTime?: string;
  initialEndTime?: string;
  previousEndTime?: string; // ADD THIS
  onSaveItem: (payload: ItemEditPayload) => void | Promise<void>;
  onCancel: () => void;
};

export function ItemNoteEditor({
  initialName,
  initialNote,
  initialPosition,
  initialStartTime,
  initialEndTime,
  previousEndTime, // ADD THIS
  onSaveItem,
  onCancel,
}: ItemNoteEditorProps) {
  const [tempName, setTempName] = useState(initialName);
  const [tempNote, setTempNote] = useState(initialNote);
  const [tempPosition, setTempPosition] = useState(
    initialPosition?.toString() ?? ""
  );
  const [tempStartTime, setTempStartTime] = useState(initialStartTime ?? "");
  const [tempEndTime, setTempEndTime] = useState(initialEndTime ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = tempName.trim();
    if (!trimmedName) {
      setErrorMessage("Item name is required");
      return;
    }

    const trimmedPosition = tempPosition.trim();
    let parsedPosition: number | undefined;
    if (trimmedPosition.length > 0) {
      const nextPosition = Number.parseInt(trimmedPosition, 10);
      if (!Number.isInteger(nextPosition) || nextPosition <= 0) {
        setErrorMessage("Position must be a positive integer");
        return;
      }
      parsedPosition = nextPosition;
    }

    // Validate optional start/end time format HH:MM
    const timeRegex = /^\d{2}:\d{2}$/;
    if (tempStartTime && !timeRegex.test(tempStartTime)) {
      setErrorMessage("Start time must be in HH:MM format");
      return;
    }
    if (tempEndTime && !timeRegex.test(tempEndTime)) {
      setErrorMessage("End time must be in HH:MM format");
      return;
    }
    if (tempStartTime && previousEndTime && tempStartTime < previousEndTime) {
  setErrorMessage(`Start time cannot be earlier than previous item end time (${previousEndTime})`);
  return;
}

    setErrorMessage(null);
    setIsSaving(true);
    try {
      await onSaveItem({
        name: trimmedName,
        note: tempNote,
        position: parsedPosition,
        start_time: tempStartTime,
        end_time: tempEndTime,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-gray-100 pt-2">
      <label className="block space-y-1 text-xs font-semibold text-gray-700">
        <span>Item Name</span>
        <input
          type="text"
          value={tempName}
          onChange={(event) => {
            setTempName(event.target.value);
            setErrorMessage(null);
          }}
          placeholder="Enter item name"
          className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-800 outline-none focus:border-[#ff6b6b]"
          disabled={isSaving}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-xs font-semibold text-gray-700">
          <span>Position</span>
          <input
            type="number"
            min={1}
            step={1}
            value={tempPosition}
            onChange={(event) => {
              setTempPosition(event.target.value);
              setErrorMessage(null);
            }}
            placeholder="1"
            className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-800 outline-none focus:border-[#ff6b6b]"
            disabled={isSaving}
          />
        </label>

        <label className="block space-y-1 text-xs font-semibold text-gray-700 sm:col-span-1">
          <span>Note</span>
          <input
            type="text"
            value={tempNote}
            onChange={(event) => setTempNote(event.target.value)}
            placeholder="Add a note for this place..."
            className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-800 outline-none focus:border-[#ff6b6b]"
            disabled={isSaving}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-xs font-semibold text-gray-700">
          <span>Start Time</span>
          <input
            type="time"
            value={tempStartTime}
            onChange={(e) => {
              setTempStartTime(e.target.value);
              setErrorMessage(null);
            }}
            className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-800 outline-none focus:border-[#ff6b6b]"
            disabled={isSaving}
          />
        </label>

        <label className="block space-y-1 text-xs font-semibold text-gray-700">
          <span>End Time</span>
          <input
            type="time"
            value={tempEndTime}
            onChange={(e) => {
              setTempEndTime(e.target.value);
              setErrorMessage(null);
            }}
            className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-800 outline-none focus:border-[#ff6b6b]"
            disabled={isSaving}
          />
        </label>
      </div>

      {errorMessage ? (
        <p className="text-xs font-medium text-red-500">{errorMessage}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={isSaving}
          className="rounded-lg bg-[#ff6b6b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#ff5252] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSaving ? "Saving..." : "Save Item"}
        </button>
      </div>
    </div>
  );
}