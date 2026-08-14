export type TripRecord = {
  trip_id: string;
  user_id: string;
  trip_name: string;
  start_date: string | null;
  end_date: string | null;
  trip_note: string | null;
};

export type CreateTripInput = {
  userId: string;
  tripName: string;
  startDate: string | null;
  endDate: string | null;
  tripNote: string | null;
};

export async function insertTrip(
  db: D1Database,
  input: CreateTripInput
): Promise<TripRecord> {
  const tripId = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO trips (
        trip_id,
        user_id,
        trip_name,
        start_date,
        end_date,
        trip_note
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      tripId,
      input.userId,
      input.tripName,
      input.startDate,
      input.endDate,
      input.tripNote
    )
    .run();

  return {
    trip_id: tripId,
    user_id: input.userId,
    trip_name: input.tripName,
    start_date: input.startDate,
    end_date: input.endDate,
    trip_note: input.tripNote,
  };
}

export async function listTripsByUser(db: D1Database, userId: string) {
  const result = await db
    .prepare(
      `SELECT
        trip_id,
        user_id,
        trip_name,
        start_date,
        end_date,
        trip_note
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
