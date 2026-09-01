import { getDB } from "./db";

export interface TripRow {
  TripID: string;
  TripName: string;
  StartDate: string | null;
  EndDate: string | null;
  Region: string | null;
  Status: string;
  TripNote: string | null;
  UserID: string;
}

export async function findTripById(id: string): Promise<TripRow | null> {
  const db = await getDB();
  const direct = await db
    .prepare("SELECT * FROM Trip WHERE TripID = ? LIMIT 1")
    .bind(id)
    .first<TripRow>();
  if (direct) return direct;

  // 兜底查 module 02 的 trips 表并自动同步到 Trip 表
  try {
    const m2 = await db
      .prepare(
        "SELECT trip_id, user_id, trip_name, start_date, end_date, trip_note, image_url FROM trips WHERE trip_id = ? LIMIT 1"
      )
      .bind(id)
      .first<{
        trip_id: string;
        user_id: string;
        trip_name: string;
        start_date: string | null;
        end_date: string | null;
        trip_note: string | null;
        image_url: string | null;
      }>();

    if (m2) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID)
           VALUES (?, ?, ?, ?, '', 'planning', ?, ?)`
        )
        .bind(
          m2.trip_id,
          m2.trip_name || "My Trip",
          m2.start_date ?? null,
          m2.end_date ?? null,
          m2.trip_note ?? null,
          m2.user_id
        )
        .run();

      return db
        .prepare("SELECT * FROM Trip WHERE TripID = ? LIMIT 1")
        .bind(id)
        .first<TripRow>();
    }
  } catch {
    // ignore
  }

  return null;
}

export async function ensureTripExists(id: string, fallbackUserId?: string): Promise<void> {
  const existing = await findTripById(id);
  if (!existing) {
    const db = await getDB();
    const uid = fallbackUserId || "dev-user-001";
    await db
      .prepare(
        `INSERT OR IGNORE INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID)
         VALUES (?, 'Shared Trip', NULL, NULL, '', 'planning', NULL, ?)`
      )
      .bind(id, uid)
      .run();
  }
}

export async function insertTrip(t: {
  TripID?: string;
  TripName: string;
  StartDate?: string | null;
  EndDate?: string | null;
  Region?: string | null;
  TripNote?: string | null;
  UserID: string;
}): Promise<TripRow> {
  const db = await getDB();
  const TripID = t.TripID ?? crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO Trip (TripID, TripName, StartDate, EndDate, Region, Status, TripNote, UserID)
       VALUES (?, ?, ?, ?, ?, 'planning', ?, ?)`
    )
    .bind(
      TripID,
      t.TripName,
      t.StartDate ?? null,
      t.EndDate ?? null,
      t.Region ?? null,
      t.TripNote ?? null,
      t.UserID
    )
    .run();
  return findTripById(TripID) as Promise<TripRow>;
}