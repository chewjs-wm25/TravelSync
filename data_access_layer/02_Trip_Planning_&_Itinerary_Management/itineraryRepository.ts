export type ItineraryRecord = {
  itinerary_id: string;
  trip_id: string;
  title: string;
  date: string;
  note: string | null;
};

export type CreateItineraryInput = {
  tripId: string;
  title: string;
  date: string;
  note: string | null;
};

export type UpdateItineraryInput = {
  title?: string;
  date?: string;
  note?: string | null;
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

import { ensureTripSchema } from "./tripSchema";

export async function createItinerary(
  db: D1Database,
  input: CreateItineraryInput
): Promise<ItineraryRecord> {
  await ensureTripSchema(db);
  const itineraryId = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO itineraries (
        itinerary_id,
        trip_id,
        title,
        date,
        itinerary_note
      ) VALUES (?, ?, ?, ?, ?)`
    )
    .bind(itineraryId, input.tripId, input.title, input.date, input.note)
    .run();

  return {
    itinerary_id: itineraryId,
    trip_id: input.tripId,
    title: input.title,
    date: input.date,
    note: input.note,
  };
}

export async function getItineraryById(db: D1Database, itineraryId: string) {
  await ensureTripSchema(db);
  return db
    .prepare(
      `SELECT
        itinerary_id,
        trip_id,
        title,
        date,
        itinerary_note AS note
      FROM itineraries
      WHERE itinerary_id = ?`
    )
    .bind(itineraryId)
    .first<ItineraryRecord>();
}

export async function getItinerariesByTripId(db: D1Database, tripId: string) {
  await ensureTripSchema(db);
  const result = await db
    .prepare(
      `SELECT
        itinerary_id,
        trip_id,
        title,
        date,
        itinerary_note AS note
      FROM itineraries
      WHERE trip_id = ?
      ORDER BY date ASC, title ASC, itinerary_id ASC`
    )
    .bind(tripId)
    .all<ItineraryRecord>();

  return result.results ?? [];
}

export async function deleteItinerary(
  db: D1Database,
  itineraryId: string
): Promise<boolean> {
  await ensureTripSchema(db);
  const result = await db
    .prepare(
      `DELETE FROM itineraries
      WHERE itinerary_id = ?`
    )
    .bind(itineraryId)
    .run();

  return wasD1MutationSuccessful(result);
}

export async function updateItinerary(
  db: D1Database,
  itineraryId: string,
  updates: UpdateItineraryInput
): Promise<boolean> {
  await ensureTripSchema(db);
  const setClauses: string[] = [];
  const values: Array<string | number | null> = [];

  if (typeof updates.title === 'string') {
    setClauses.push('title = ?');
    values.push(updates.title);
  }

  if (typeof updates.date === 'string') {
    setClauses.push('date = ?');
    values.push(updates.date);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'note')) {
    setClauses.push('itinerary_note = ?');
    values.push(updates.note ?? null);
  }

  if (setClauses.length === 0) {
    return false;
  }

  const result = await db
    .prepare(
      `UPDATE itineraries
      SET ${setClauses.join(", ")}
      WHERE itinerary_id = ?`
    )
    .bind(...values, itineraryId)
    .run();

  return wasD1MutationSuccessful(result);
}