import {
  addItineraryItem,
  deleteItineraryItem,
  getItineraryItemById,
  getItineraryItemsByItineraryId,
  updateItineraryItem as updateItineraryItemRecord,
  type ItineraryItemRecord,
} from "../../data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemRepository";
import { getItineraryById } from "../../data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";
import {
  hasMalaysiaBlocklistMatch,
  normalizeText,
} from "./textValidation";

export type ItineraryItemServiceInput = {
  itineraryId?: string | null;
  place?: string | null;
  name?: string | null;
  destination?: string | null;
  image?: string | null;
  note?: string | null;
};

export type UpdateItineraryItemInput = {
  itineraryId?: string | null;
  itemId?: string | null;
  name?: string | null;
  note?: string | null;
  position?: number | string | null;
  order_index?: number | string | null;
  image?: string | null;
};

export type DeleteItineraryItemInput = {
  itineraryId?: string | null;
  itemId?: string | null;
};

type ItineraryItemServiceSuccess = {
  ok: true;
  item: ItineraryItemRecord;
};

type DeleteItineraryItemSuccess = {
  ok: true;
};

type ItineraryItemServiceFailure = {
  ok: false;
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
      ok: true;
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
      ok: false,
      status: 400,
      message: "Itinerary item note must stay within Malaysia",
    };
  }

  if (!resolvedItineraryId) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary ID is required",
    };
  }

  if (!place) {
    return {
      ok: false,
      status: 400,
      message: "Place Not Found!",
    };
  }

  return {
    ok: true,
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

  if (!validation.ok) {
    return validation;
  }

  const existingItinerary = await getItineraryById(db, validation.itineraryId);
  if (!existingItinerary) {
    return {
      ok: false,
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
    "other"
  );

  if (!wasInserted) {
    return {
      ok: false,
      status: 500,
      message: "Failed to add itinerary item",
    };
  }

  return {
    ok: true,
    item: {
      item_id: itemId,
      itinerary_id: validation.itineraryId,
      item_name: validation.normalized.place,
      image_url: validation.normalized.image ?? null,
      itinerary_note: validation.normalized.note ?? null,
      destination: validation.normalized.destination,
      reference_id: null,
      type: "other",
      start_time: null,
      end_time: null,
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
      ok: false,
      status: 400,
      message: "Item ID is required",
    };
  }

  const existingItem = await getItineraryItemById(db, itemId);
  if (!existingItem) {
    return {
      ok: false,
      status: 404,
      message: "Itinerary item not found",
    };
  }

  if (itineraryId && existingItem.itinerary_id !== itineraryId) {
    return {
      ok: false,
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

  if (
    !hasNameUpdate &&
    !hasNoteUpdate &&
    !hasImageUpdate &&
    !hasPositionUpdate &&
    !hasOrderIndexUpdate
  ) {
    return {
      ok: false,
      status: 400,
      message: "No itinerary item updates provided",
    };
  }

  const normalizedName = hasNameUpdate ? normalizeText(input.name) : null;
  const normalizedNote = hasNoteUpdate ? normalizeText(input.note) : null;

  if (hasNoteUpdate && normalizedNote && hasMalaysiaBlocklistMatch(normalizedNote)) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary item note must stay within Malaysia",
    };
  }

  if (hasNameUpdate && !normalizedName) {
    return {
      ok: false,
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
      ok: false,
      status: 400,
      message: "Position must be a positive integer",
    };
  }

  const normalizedUpdates: Partial<ItineraryItemRecord> = {};
  if (normalizedName) {
    normalizedUpdates.item_name = normalizedName;
  }
  if (hasNoteUpdate) {
    normalizedUpdates.itinerary_note = normalizedNote ?? "";
  }
  if (hasImageUpdate) {
    normalizedUpdates.image_url = normalizeText(input.image) ?? "";
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
      typeof normalizedUpdates.itinerary_note === "string"
        ? normalizedUpdates.itinerary_note
        : undefined,
    image:
      typeof normalizedUpdates.image_url === "string"
        ? normalizedUpdates.image_url
        : undefined,
    position: normalizedUpdates.position ?? undefined,
    order_index: normalizedUpdates.order_index ?? undefined,
  });

  if (!wasUpdated) {
    return {
      ok: false,
      status: 500,
      message: "Failed to update itinerary item",
    };
  }

  const updatedItem = await getItineraryItemById(db, itemId);
  if (!updatedItem) {
    return {
      ok: false,
      status: 500,
      message: "Failed to update itinerary item",
    };
  }

  return {
    ok: true,
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
      ok: false,
      status: 400,
      message: "Item ID is required",
    };
  }

  const existingItem = await getItineraryItemById(db, itemId);
  if (!existingItem) {
    return {
      ok: false,
      status: 404,
      message: "Itinerary item not found",
    };
  }

  if (itineraryId && existingItem.itinerary_id !== itineraryId) {
    return {
      ok: false,
      status: 404,
      message: "Itinerary item not found",
    };
  }

  const wasDeleted = await deleteItineraryItem(db, itemId);
  if (!wasDeleted) {
    return {
      ok: false,
      status: 500,
      message: "Failed to delete itinerary item",
    };
  }

  return { ok: true };
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
