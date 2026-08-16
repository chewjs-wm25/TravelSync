"use client";

import Image from "next/image";

import { ItemNoteEditor } from "./ItemNoteEditor";

export type ItineraryItem = {
  id: string;
  name: string;
  image: string;
  note?: string;
  isEditingNote?: boolean;
};

type ItineraryItemCardProps = {
  item: ItineraryItem;
  onDelete: () => void;
  onToggleNoteEdit: () => void;
  onSaveNote: (note: string) => void;
};

export function ItineraryItemCard({
  item,
  onDelete,
  onToggleNoteEdit,
  onSaveNote,
}: ItineraryItemCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-800">{item.name}</span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleNoteEdit}
            title="Add/Edit Note"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={onDelete}
            title="Delete Item"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
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

          <div className="h-14 w-20 overflow-hidden rounded-lg bg-gray-200">
            <Image
              src={item.image}
              alt={item.name}
              width={80}
              height={56}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {item.isEditingNote ? (
        <ItemNoteEditor
          initialNote={item.note ?? ""}
          onSaveNote={onSaveNote}
          onCancel={onToggleNoteEdit}
        />
      ) : (
        item.note && (
          <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-1.5 text-xs text-gray-500">
            <div>
              <span className="font-semibold text-gray-700">Note:</span>{" "}
              {item.note}
            </div>
            <button
              type="button"
              onClick={() => onSaveNote("")}
              className="flex h-5 w-5 items-center justify-center rounded text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete note"
              aria-label="Delete note"
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
          </div>
        )
      )}
    </div>
  );
}
