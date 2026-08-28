export type TripRecord = {
  trip_id: string;
  user_id: string;
  trip_name: string;
  start_date: string | null;
  end_date: string | null;
  trip_note: string | null;
  image_url: string | null;
};

export type CreateTripInput = {
  userId: string;
  tripName: string;
  startDate: string | null;
  endDate: string | null;
  tripNote: string | null;
  imageUrl: string | null;
};

export type UpdateTripInput = {
  tripName: string;
  startDate: string | null;
  endDate: string | null;
  tripNote: string | null;
  imageUrl: string | null;
};

import { ensureTripSchema } from "./tripSchema";

export async function insertTrip(
  db: D1Database,
  input: CreateTripInput
): Promise<TripRecord> {
  await ensureTripSchema(db);
  const tripId = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO trips (
        trip_id,
        user_id,
        trip_name,
        start_date,
        end_date,
        trip_note,
        image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      tripId,
      input.userId,
      input.tripName,
      input.startDate,
      input.endDate,
      input.tripNote,
      input.imageUrl
    )
    .run();

  return {
    trip_id: tripId,
    user_id: input.userId,
    trip_name: input.tripName,
    start_date: input.startDate,
    end_date: input.endDate,
    trip_note: input.tripNote,
    image_url: input.imageUrl,
  };
}

export async function listTripsByUser(db: D1Database, userId: string) {
  await ensureTripSchema(db);
  const result = await db
    .prepare(
      `SELECT
        trip_id,
        user_id,
        trip_name,
        start_date,
        end_date,
        trip_note,
        image_url
      FROM trips
      WHERE user_id = ?
      ORDER BY
        CASE WHEN start_date IS NULL THEN 1 ELSE 0 END,
        start_date ASC,
        trip_name ASC`
    )
    .bind(userId)
    .all<TripRecord>();

  return result.results ?? [];
}

export async function getTripById(db: D1Database, tripId: string) {
  await ensureTripSchema(db);
  return db
    .prepare(
      `SELECT
        trip_id,
        user_id,
        trip_name,
        start_date,
        end_date,
        trip_note,
        image_url
      FROM trips
      WHERE trip_id = ?`
    )
    .bind(tripId)
    .first<TripRecord>();
}

export async function deleteTripById(db: D1Database, tripId: string) {
  await ensureTripSchema(db);
  await db
    .prepare(
      `DELETE FROM trips
      WHERE trip_id = ?`
    )
    .bind(tripId)
    .run();
}

export async function updateTrip(
  db: D1Database,
  tripId: string,
  data: UpdateTripInput
): Promise<TripRecord | null> {
  await ensureTripSchema(db);
  const updateResult = await db
    .prepare(
      `UPDATE trips
      SET trip_name = ?, start_date = ?, end_date = ?, trip_note = ?, image_url = ?
      WHERE trip_id = ?`
    )
    .bind(data.tripName, data.startDate, data.endDate, data.tripNote, data.imageUrl, tripId)
    .run();

  if (updateResult.meta.changes === 0) {
    return null;
  }

  const updatedTrip = await db
    .prepare(
      `SELECT
        trip_id,
        user_id,
        trip_name,
        start_date,
        end_date,
        trip_note,
        image_url
      FROM trips
      WHERE trip_id = ?`
    )
    .bind(tripId)
    .first<TripRecord>();

  return updatedTrip ?? null;
}
