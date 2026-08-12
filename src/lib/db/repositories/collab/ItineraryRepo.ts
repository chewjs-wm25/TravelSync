import { getDB } from "./db";

export interface ItineraryRow {
  ItineraryID: string;
  Title: string;
  Date: string | null;
  TripID: string;
}

export async function findByTrip(tripId: string): Promise<ItineraryRow[]> {
  const db = await getDB();
  const res = await db
    .prepare("SELECT * FROM Itinerary WHERE TripID = ? ORDER BY Date ASC")
    .bind(tripId)
    .all<ItineraryRow>();
  return res.results;
}

export async function insertItinerary(i: {
  Title: string;
  Date?: string | null;
  TripID: string;
}): Promise<ItineraryRow> {
  const db = await getDB();
  const ItineraryID = crypto.randomUUID();
  await db
    .prepare("INSERT INTO Itinerary (ItineraryID, Title, Date, TripID) VALUES (?, ?, ?, ?)")
    .bind(ItineraryID, i.Title, i.Date ?? null, i.TripID)
    .run();
  return {
    ItineraryID,
    Title: i.Title,
    Date: i.Date ?? null,
    TripID: i.TripID,
  };
}