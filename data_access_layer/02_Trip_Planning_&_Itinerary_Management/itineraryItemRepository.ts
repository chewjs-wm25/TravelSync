export type ItineraryItemRecord = {
  item_id: string;
  itinerary_id: string;
  item_name: string;
  image_url: string | null;
  itinerary_item_note: string | null;
  destination: string | null;
  reference_id: string | null;
  lat: number | null;
  lon: number | null;
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
  destination?: string;
  reference_id?: string;
  lat?: number | null;
  lon?: number | null;
  type?: string;
  start_time?: string;
  end_time?: string;
};

function wasD1MutationSuccessful(result: {
  success?: boolean;
  meta?: {
    changes?: number;
  } | null;
} | null | undefined): boolean {
  if (!result) {
    return false;
  }

  const changes = result.meta?.changes;
  if (typeof changes === "number") {
    return changes > 0;
  }

  return result.success !== false;
}

export async function getItineraryItemById(
  db: D1Database,
  itemId: string
): Promise<ItineraryItemRecord | null> {
  // Dynamically include lat/lon if the columns exist
  try {
    const pragma = await db.prepare(`PRAGMA table_info('itinerary_items')`).all();
    const cols = (pragma && ((pragma as any).results ?? pragma)) as any;
    let hasLat = false;
    let hasLon = false;
    if (Array.isArray(cols)) {
      for (const r of cols) {
        const name = (r && (r.name || r.NAME || r[1])) || "";
        if (name === "lat") hasLat = true;
        if (name === "lon") hasLon = true;
      }
    }

    const latSelect = hasLat ? "lat," : "NULL AS lat,";
    const lonSelect = hasLon ? "lon," : "NULL AS lon,";

    const sql = `SELECT
        item_id,
        itinerary_id,
        item_name,
        image_url,
        itinerary_item_note,
        destination,
        reference_id,
        ${latSelect}
        ${lonSelect}
        type,
        start_time,
        end_time,
        position,
        position AS order_index
      FROM itinerary_items
      WHERE item_id = ?`;

    return db.prepare(sql).bind(itemId).first<ItineraryItemRecord>();
  } catch (e) {
    // Fallback to a conservative select without lat/lon
    return db
      .prepare(
        `SELECT
        item_id,
        itinerary_id,
        item_name,
        image_url,
        itinerary_item_note,
        destination,
        reference_id,
        NULL AS lat,
        NULL AS lon,
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
  itemType: string = "other",
  referenceId?: string,
  startTime?: string,
  endTime?: string,
  lat?: number | null,
  lon?: number | null
): Promise<boolean> {
  // Insert without lat/lon first for maximum compatibility, then attempt to set lat/lon via UPDATE if provided and supported.
  const insertResult = await db
    .prepare(
      `INSERT INTO itinerary_items (
        item_id,
        itinerary_id,
        item_name,
        destination,
        image_url,
        itinerary_item_note,
        type,
        position,
        reference_id,
        start_time,
        end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      itemId,
      itineraryId,
      name,
      destination ?? name,
      image ?? null,
      note ?? null,
      itemType,
      position,
      referenceId ?? null,
      startTime ?? null,
      endTime ?? null
    )
    .run();

  const inserted = wasD1MutationSuccessful(insertResult);

  if (inserted && (typeof lat === 'number' || typeof lon === 'number')) {
    try {
      // Attempt to update lat/lon — if columns don't exist, this will fail and be ignored
      await db
        .prepare(`UPDATE itinerary_items SET lat = ?, lon = ? WHERE item_id = ?`)
        .bind(lat ?? null, lon ?? null, itemId)
        .run();
    } catch (e) {
      // ignore failures to set lat/lon on older schemas
    }
  }

  return inserted;
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
    setClauses.push("itinerary_item_note = ?");
    values.push(trimmedNote.length > 0 ? trimmedNote : null);
  }

  if (typeof updates.image === "string") {
    const trimmedImage = updates.image.trim();
    setClauses.push("image_url = ?");
    values.push(trimmedImage.length > 0 ? trimmedImage : null);
  }

  if (typeof updates.destination === "string") {
    setClauses.push("destination = ?");
    values.push(updates.destination.trim() || null);
  }

  if (typeof updates.reference_id === "string") {
    setClauses.push("reference_id = ?");
    values.push(updates.reference_id.trim() || null);
  }

  if (typeof updates.lat === "number") {
    setClauses.push("lat = ?");
    values.push(updates.lat);
  }

  if (typeof updates.lon === "number") {
    setClauses.push("lon = ?");
    values.push(updates.lon);
  }

  if (typeof updates.type === "string") {
    setClauses.push("type = ?");
    values.push(updates.type);
  }

  if (typeof updates.start_time === "string") {
    setClauses.push("start_time = ?");
    values.push(updates.start_time.trim() || null);
  }

  if (typeof updates.end_time === "string") {
    setClauses.push("end_time = ?");
    values.push(updates.end_time.trim() || null);
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

  return wasD1MutationSuccessful(result);
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

  return wasD1MutationSuccessful(result);
}

export async function getItineraryItemsByItineraryId(
  db: D1Database,
  itineraryId: string
): Promise<ItineraryItemRecord[]> {
  // Dynamically include lat/lon when selecting by itinerary
  try {
    const pragma = await db.prepare(`PRAGMA table_info('itinerary_items')`).all();
    const cols = (pragma && ((pragma as any).results ?? pragma)) as any;
    let hasLat = false;
    let hasLon = false;
    if (Array.isArray(cols)) {
      for (const r of cols) {
        const name = (r && (r.name || r.NAME || r[1])) || "";
        if (name === "lat") hasLat = true;
        if (name === "lon") hasLon = true;
      }
    }

    const latSelect = hasLat ? "lat," : "NULL AS lat,";
    const lonSelect = hasLon ? "lon," : "NULL AS lon,";

    const sql = `SELECT
        item_id,
        itinerary_id,
        item_name,
        image_url,
        itinerary_item_note,
        destination,
        reference_id,
        ${latSelect}
        ${lonSelect}
        type,
        start_time,
        end_time,
        position,
        position AS order_index
      FROM itinerary_items
      WHERE itinerary_id = ?
      ORDER BY position ASC, item_id ASC`;

    const result = await db.prepare(sql).bind(itineraryId).all<ItineraryItemRecord>();
    return result.results ?? [];
  } catch (e) {
    const result = await db
      .prepare(
        `SELECT
        item_id,
        itinerary_id,
        item_name,
        image_url,
        itinerary_item_note,
        destination,
        reference_id,
        NULL AS lat,
        NULL AS lon,
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
}

export async function getItineraryItemsByDayId(
  db: D1Database,
  itineraryId: string
): Promise<ItineraryItemRecord[]> {
  return getItineraryItemsByItineraryId(db, itineraryId);
}
