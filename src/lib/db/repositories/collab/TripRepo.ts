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
  return db
    .prepare("SELECT * FROM Trip WHERE TripID = ? LIMIT 1")
    .bind(id)
    .first<TripRow>();
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