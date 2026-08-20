export type ItineraryItemRecord = {
  item_id: string;
  itinerary_id: string;
  item_name: string;
  image_url: string | null;
  itinerary_note: string | null;
  destination: string | null;
  reference_id: string | null;
  type: string | null;
  start_time: string | null;
  end_time: string | null;
  position: number | null;
  order_index: number | null;
};

export type ItineraryItem = {
  id: string;
  name: string;
  image?: string;
  note?: string;
  position?: number;
  order_index?: number;
};

export async function getItineraryItemById(
  db: D1Database,
  itemId: string
): Promise<ItineraryItemRecord | null> {
  return db
    .prepare(
      `SELECT
        item_id,
        itinerary_id,
        item_name,
        image_url,
        itinerary_note,
        destination,
        reference_id,
        type,
        start_time,
        end_time,
        position,
        position AS order_index
      FROM itinerary_items
      WHERE item_id = ?`
    )
    .bind(itemId)
    .first<ItineraryItemRecord>();
}

export async function addItineraryItem(
  db: D1Database,
  itemId: string,
  itineraryId: string,
  name: string,
  image?: string,
  note?: string,
  position = 0,
  destination?: string,
  itemType: string = "other"
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO itinerary_items (
        item_id,
        itinerary_id,
        item_name,
        destination,
        image_url,
        itinerary_note,
        type,
        position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      itemId,
      itineraryId,
      name,
      destination ?? name,
      image ?? null,
      note ?? null,
      itemType,
      position
    )
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function updateItineraryItem(
  db: D1Database,
  itemId: string,
  updates: Partial<ItineraryItem>
): Promise<boolean> {
  const setClauses: string[] = [];
  const values: Array<string | number | null> = [];

  if (typeof updates.name === "string") {
    const trimmedName = updates.name.trim();
    if (trimmedName.length > 0) {
      setClauses.push("item_name = ?");
      values.push(trimmedName);
    }
  }

  if (typeof updates.note === "string") {
    const trimmedNote = updates.note.trim();
    setClauses.push("itinerary_note = ?");
    values.push(trimmedNote.length > 0 ? trimmedNote : null);
  }

  if (typeof updates.image === "string") {
    const trimmedImage = updates.image.trim();
    setClauses.push("image_url = ?");
    values.push(trimmedImage.length > 0 ? trimmedImage : null);
  }

  const nextPosition =
    typeof updates.position === "number"
      ? updates.position
      : typeof updates.order_index === "number"
        ? updates.order_index
        : null;

  if (typeof nextPosition === "number" && Number.isFinite(nextPosition)) {
    setClauses.push("position = ?");
    values.push(nextPosition);
  }

  if (setClauses.length === 0) {
    return false;
  }

  const result = await db
    .prepare(
      `UPDATE itinerary_items
      SET ${setClauses.join(", ")}
      WHERE item_id = ?`
    )
    .bind(...values, itemId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function deleteItineraryItem(
  db: D1Database,
  itemId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM itinerary_items
      WHERE item_id = ?`
    )
    .bind(itemId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function getItineraryItemsByItineraryId(
  db: D1Database,
  itineraryId: string
): Promise<ItineraryItemRecord[]> {
  const result = await db
    .prepare(
      `SELECT
        item_id,
        itinerary_id,
        item_name,
        image_url,
        itinerary_note,
        destination,
        reference_id,
        type,
        start_time,
        end_time,
        position,
        position AS order_index
      FROM itinerary_items
      WHERE itinerary_id = ?
      ORDER BY position ASC, item_id ASC`
    )
    .bind(itineraryId)
    .all<ItineraryItemRecord>();

  return result.results ?? [];
}

export async function getItineraryItemsByDayId(
  db: D1Database,
  itineraryId: string
): Promise<ItineraryItemRecord[]> {
  return getItineraryItemsByItineraryId(db, itineraryId);
}
