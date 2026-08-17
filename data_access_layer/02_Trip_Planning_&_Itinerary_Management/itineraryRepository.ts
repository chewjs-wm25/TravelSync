export type ItineraryRecord = {
  itinerary_id: string;
  trip_id: string;
  title: string;
  date: string;
};

export type CreateItineraryInput = {
  tripId: string;
  title: string;
  date: string;
};

export async function createItinerary(
  db: D1Database,
  input: CreateItineraryInput
): Promise<ItineraryRecord> {
  const itineraryId = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO itineraries (
        itinerary_id,
        trip_id,
        title,
        date
      ) VALUES (?, ?, ?, ?)`
    )
    .bind(itineraryId, input.tripId, input.title, input.date)
    .run();

  return {
    itinerary_id: itineraryId,
    trip_id: input.tripId,
    title: input.title,
    date: input.date,
  };
}

export async function getItineraryById(db: D1Database, itineraryId: string) {
  return db
    .prepare(
      `SELECT
        itinerary_id,
        trip_id,
        title,
        date
      FROM itineraries
      WHERE itinerary_id = ?`
    )
    .bind(itineraryId)
    .first<ItineraryRecord>();
}

export async function getItinerariesByTripId(db: D1Database, tripId: string) {
  const result = await db
    .prepare(
      `SELECT
        itinerary_id,
        trip_id,
        title,
        date
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
  const result = await db
    .prepare(
      `DELETE FROM itineraries
      WHERE itinerary_id = ?`
    )
    .bind(itineraryId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function updateItinerary(
  db: D1Database,
  itineraryId: string,
  title: string,
  date: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE itineraries
      SET title = ?, date = ?
      WHERE itinerary_id = ?`
    )
    .bind(title, date, itineraryId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
