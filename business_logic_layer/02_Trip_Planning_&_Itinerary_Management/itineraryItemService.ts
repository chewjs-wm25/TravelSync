import {
  addItineraryItem,
  deleteItineraryItem,
  getItineraryItemById,
  getItineraryItemsByItineraryId,
  updateItineraryItem as updateItineraryItemRecord,
  type ItineraryItemRecord,
} from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemRepository";
import { getItineraryById } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";
import {
  hasMalaysiaBlocklistMatch,
  normalizeText,
} from "@/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/textValidation";

import type { ImportPlaceInput, ImportPlacesResult } from "./types";


export type ItineraryItemServiceInput = {
  itineraryId?: string | null;
  place?: string | null;
  name?: string | null;
  destination?: string | null;
  image?: string | null;
  note?: string | null;
  referenceId?: string | null;
  type?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

export type UpdateItineraryItemInput = {
  itineraryId?: string | null;
  itemId?: string | null;
  name?: string | null;
  note?: string | null;
  position?: number | string | null;
  order_index?: number | string | null;
  image?: string | null;
  destination?: string | null;
  referenceId?: string | null;
  type?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

export type DeleteItineraryItemInput = {
  itineraryId?: string | null;
  itemId?: string | null;
};

type ItineraryItemServiceSuccess = {
  success: true;
  item: ItineraryItemRecord;
};

type DeleteItineraryItemSuccess = {
  success: true;
};

type ItineraryItemServiceFailure = {
  success: false;
  status: number;
  message: string;
};

export type ItineraryItemServiceResult =
  | ItineraryItemServiceSuccess
  | ItineraryItemServiceFailure;

export type UpdateItineraryItemResult =
  | ItineraryItemServiceSuccess
  | ItineraryItemServiceFailure;

export type DeleteItineraryItemResult =
  | DeleteItineraryItemSuccess
  | ItineraryItemServiceFailure;

function normalizeUpdatePosition(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : value.trim().length > 0
        ? Number.parseInt(value.trim(), 10)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return Number.NaN;
  }

  return parsed;
}

export function validateItineraryItemPayload(
  itineraryId: string | null,
  input: ItineraryItemServiceInput
):
  | {
      success: true;
      itineraryId: string;
      normalized: {
        place: string;
        destination: string;
        image?: string;
        note?: string;
      };
    }
  | ItineraryItemServiceFailure {
  const resolvedItineraryId = normalizeText(input.itineraryId ?? itineraryId);
  const place = normalizeText(input.place ?? input.name ?? input.destination);
  const image = normalizeText(input.image);
  const note = normalizeText(input.note);

  if (note && hasMalaysiaBlocklistMatch(note)) {
    return {
      success: false,
      status: 400,
      message: "Itinerary item note must stay within Malaysia",
    };
  }

  if (!resolvedItineraryId) {
    return {
      success: false,
      status: 400,
      message: "Itinerary ID is required",
    };
  }

  if (!place) {
    return {
      success: false,
      status: 400,
      message: "Place Not Found!",
    };
  }

  return {
    success: true,
    itineraryId: resolvedItineraryId,
    normalized: {
      place,
      destination: place,
      image: image ?? undefined,
      note: note ?? undefined,
    },
  };
}

export async function createItineraryItem(
  db: D1Database,
  input: ItineraryItemServiceInput
): Promise<ItineraryItemServiceResult> {
  const itineraryId = normalizeText(input.itineraryId);
  const validation = validateItineraryItemPayload(itineraryId, input);

  if (!validation.success) {
    return validation;
  }

  const existingItinerary = await getItineraryById(db, validation.itineraryId);
  if (!existingItinerary) {
    return {
      success: false,
      status: 404,
      message: "Itinerary not found",
    };
  }

  const nextOrderIndex =
    (await getItineraryItemsByItineraryId(db, validation.itineraryId)).length + 1;
  const itemId = `itm_${crypto.randomUUID()}`;
  const wasInserted = await addItineraryItem(
    db,
    itemId,
    validation.itineraryId,
    validation.normalized.place,
    validation.normalized.image,
    validation.normalized.note,
    nextOrderIndex,
    validation.normalized.destination,
    normalizeText(input.type) ?? "other",
    normalizeText(input.referenceId) ?? undefined,
    normalizeText(input.startTime) ?? undefined,
    normalizeText(input.endTime) ?? undefined
  );

  if (!wasInserted) {
    return {
      success: false,
      status: 500,
      message: "Failed to add itinerary item",
    };
  }

  // Trigger itinerary change notification (module 02 event bus)
  try {
    // Import here to avoid circular dependency at module init time
    const events = await import("./events");
    events.triggerItineraryChanged(validation.itineraryId);
  } catch (e) {
    // ignore errors from the event trigger
  }

  return {
    success: true,
    item: {
      item_id: itemId,
      itinerary_id: validation.itineraryId,
      item_name: validation.normalized.place,
      image_url: validation.normalized.image ?? null,
      itinerary_item_note: validation.normalized.note ?? null,
      destination: validation.normalized.destination,
      reference_id: normalizeText(input.referenceId),
      type: normalizeText(input.type) ?? "other",
      start_time: normalizeText(input.startTime),
      end_time: normalizeText(input.endTime),
      position: nextOrderIndex,
      order_index: nextOrderIndex,
    },
  };
}

export async function updateItineraryItemById(
  db: D1Database,
  input: UpdateItineraryItemInput
): Promise<UpdateItineraryItemResult> {
  const itemId = normalizeText(input.itemId);
  const itineraryId = normalizeText(input.itineraryId);

  if (!itemId) {
    return {
      success: false,
      status: 400,
      message: "Item ID is required",
    };
  }

  const existingItem = await getItineraryItemById(db, itemId);
  if (!existingItem) {
    return {
      success: false,
      status: 404,
      message: "Itinerary item not found",
    };
  }

  if (itineraryId && existingItem.itinerary_id !== itineraryId) {
    return {
      success: false,
      status: 404,
      message: "Itinerary item not found",
    };
  }

  const hasNameUpdate = input.name !== undefined && input.name !== null;
  const hasNoteUpdate = input.note !== undefined && input.note !== null;
  const hasImageUpdate = input.image !== undefined && input.image !== null;
  const hasPositionUpdate =
    input.position !== undefined && input.position !== null;
  const hasOrderIndexUpdate =
    input.order_index !== undefined && input.order_index !== null;
  const hasDestinationUpdate = input.destination !== undefined;
  const hasReferenceIdUpdate = input.referenceId !== undefined;
  const hasTypeUpdate = input.type !== undefined;
  const hasStartTimeUpdate = input.startTime !== undefined;
  const hasEndTimeUpdate = input.endTime !== undefined;

  if (
    !hasNameUpdate &&
    !hasNoteUpdate &&
    !hasImageUpdate &&
    !hasPositionUpdate &&
    !hasOrderIndexUpdate &&
    !hasDestinationUpdate &&
    !hasReferenceIdUpdate &&
    !hasTypeUpdate &&
    !hasStartTimeUpdate &&
    !hasEndTimeUpdate
  ) {
    return {
      success: false,
      status: 400,
      message: "No itinerary item updates provided",
    };
  }

  const normalizedName = hasNameUpdate ? normalizeText(input.name) : null;
  const normalizedNote = hasNoteUpdate ? normalizeText(input.note) : null;

  if (hasNoteUpdate && normalizedNote && hasMalaysiaBlocklistMatch(normalizedNote)) {
    return {
      success: false,
      status: 400,
      message: "Itinerary item note must stay within Malaysia",
    };
  }

  if (hasNameUpdate && !normalizedName) {
    return {
      success: false,
      status: 400,
      message: "Itinerary item name is required",
    };
  }

  const normalizedPosition = hasPositionUpdate
    ? normalizeUpdatePosition(input.position)
    : hasOrderIndexUpdate
      ? normalizeUpdatePosition(input.order_index)
      : null;

  if (
    (hasPositionUpdate || hasOrderIndexUpdate) &&
    normalizedPosition !== null &&
    Number.isNaN(normalizedPosition)
  ) {
    return {
      success: false,
      status: 400,
      message: "Position must be a positive integer",
    };
  }

  const normalizedUpdates: Partial<ItineraryItemRecord> = {};
  if (normalizedName) {
    normalizedUpdates.item_name = normalizedName;
  }
  if (hasNoteUpdate) {
    normalizedUpdates.itinerary_item_note = normalizedNote ?? "";
  }
  if (hasImageUpdate) {
    normalizedUpdates.image_url = normalizeText(input.image) ?? "";
  }
  if (input.destination !== undefined) {
    normalizedUpdates.destination = normalizeText(input.destination);
  }
  if (input.referenceId !== undefined) {
    normalizedUpdates.reference_id = normalizeText(input.referenceId);
  }
  if (input.type !== undefined) {
    normalizedUpdates.type = normalizeText(input.type);
  }
  if (input.startTime !== undefined) {
    normalizedUpdates.start_time = normalizeText(input.startTime);
  }
  if (input.endTime !== undefined) {
    normalizedUpdates.end_time = normalizeText(input.endTime);
  }
  if (
    normalizedPosition !== null &&
    !Number.isNaN(normalizedPosition) &&
    normalizedPosition > 0
  ) {
    normalizedUpdates.position = normalizedPosition;
    normalizedUpdates.order_index = normalizedPosition;
  }

  const wasUpdated = await updateItineraryItemRecord(db, itemId, {
    name: normalizedUpdates.item_name ?? undefined,
    note:
      typeof normalizedUpdates.itinerary_item_note === "string"
        ? normalizedUpdates.itinerary_item_note
        : undefined,
    image:
      typeof normalizedUpdates.image_url === "string"
        ? normalizedUpdates.image_url
        : undefined,
      destination: normalizedUpdates.destination ?? undefined,
      reference_id: normalizedUpdates.reference_id ?? undefined,
      type: normalizedUpdates.type ?? undefined,
      start_time: normalizedUpdates.start_time ?? undefined,
      end_time: normalizedUpdates.end_time ?? undefined,
    position: normalizedUpdates.position ?? undefined,
    order_index: normalizedUpdates.order_index ?? undefined,
  });

  if (!wasUpdated) {
    return {
      success: false,
      status: 500,
      message: "Failed to update itinerary item",
    };
  }

  const updatedItem = await getItineraryItemById(db, itemId);
  if (!updatedItem) {
    return {
      success: false,
      status: 500,
      message: "Failed to update itinerary item",
    };
  }

  // Trigger itinerary change notification (module 02 event bus)
  try {
    const events = await import("./events");
    events.triggerItineraryChanged(updatedItem.itinerary_id);
  } catch (e) {
    // ignore
  }

  return {
    success: true,
    item: updatedItem,
  };
}

export async function deleteItineraryItemById(
  db: D1Database,
  input: DeleteItineraryItemInput
): Promise<DeleteItineraryItemResult> {
  const itemId = normalizeText(input.itemId);
  const itineraryId = normalizeText(input.itineraryId);

  if (!itemId) {
    return {
      success: false,
      status: 400,
      message: "Item ID is required",
    };
  }

  const existingItem = await getItineraryItemById(db, itemId);
  if (!existingItem) {
    return {
      success: false,
      status: 404,
      message: "Itinerary item not found",
    };
  }

  if (itineraryId && existingItem.itinerary_id !== itineraryId) {
    return {
      success: false,
      status: 404,
      message: "Itinerary item not found",
    };
  }

  const wasDeleted = await deleteItineraryItem(db, itemId);
  if (!wasDeleted) {
    return {
      success: false,
      status: 500,
      message: "Failed to delete itinerary item",
    };
  }

  // Trigger itinerary change notification (module 02 event bus)
  try {
    const events = await import("./events");
    events.triggerItineraryChanged(existingItem.itinerary_id);
  } catch (e) {
    // ignore
  }

  return { success: true };
}

export async function getItineraryItemsForItinerary(
  db: D1Database,
  itineraryId?: string | null
) {
  const resolvedItineraryId = normalizeText(itineraryId);

  if (!resolvedItineraryId) {
    return [] as ItineraryItemRecord[];
  }

  return getItineraryItemsByItineraryId(db, resolvedItineraryId);
}

export async function getItineraryItemsForDay(
  db: D1Database,
  itineraryId?: string | null
) {
  return getItineraryItemsForItinerary(db, itineraryId);
}

/**
 * Import multiple places into an itinerary as itinerary items.
 */
export async function importPlaces(
  db: D1Database,
  itineraryId: string,
  items: ImportPlaceInput[]
): Promise<ImportPlacesResult> {
  const resolvedItineraryId = normalizeText(itineraryId);
  if (!resolvedItineraryId) {
    return { success: false, importedCount: 0 };
  }

  const existingItinerary = await getItineraryById(db, resolvedItineraryId);
  if (!existingItinerary) {
    return { success: false, importedCount: 0 };
  }

  let importedCount = 0;
  let nextOrderIndex = (await getItineraryItemsByItineraryId(db, resolvedItineraryId)).length + 1;

  for (const entry of items) {
    const name = normalizeText(entry.name);
    if (!name) continue;

    const itemId = `itm_${crypto.randomUUID()}`;
    const wasInserted = await addItineraryItem(
      db,
      itemId,
      resolvedItineraryId,
      name,
      undefined,
      undefined,
      nextOrderIndex,
      name,
      "other",
      normalizeText(entry.placeId) ?? undefined,
      undefined,
      undefined
    );

    if (wasInserted) {
      importedCount += 1;
      nextOrderIndex += 1;
    }
  }

  if (importedCount > 0) {
    try {
      const events = await import("./events");
      events.triggerItineraryChanged(resolvedItineraryId);
    } catch (e) {
      // ignore
    }
  }

  return { success: true, importedCount };
}
