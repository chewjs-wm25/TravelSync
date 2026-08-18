import { getDB } from "./db";

export interface ItemRow {
  ItemID: string;
  ItemName: string;
  Type: string;
  ReferenceID: string | null;
  Destination: string | null;
  StartTime: string | null;
  EndTime: string | null;
  Status: string;
  ItineraryNote: string | null;
  ItineraryID: string;
}

export async function findByItinerary(ids: string[]): Promise<ItemRow[]> {
  if (ids.length === 0) return [];
  const db = await getDB();
  const placeholders = ids.map(() => "?").join(", ");
  const res = await db
    .prepare(`SELECT * FROM Itinerary_Item WHERE ItineraryID IN (${placeholders})`)
    .bind(...ids)
    .all<ItemRow>();
  return res.results;
}

export async function findById(id: string): Promise<ItemRow | null> {
  const db = await getDB();
  return db
    .prepare("SELECT * FROM Itinerary_Item WHERE ItemID = ? LIMIT 1")
    .bind(id)
    .first<ItemRow>();
}

export async function insertItem(i: {
  ItemName: string;
  ItineraryNote?: string | null;
  ItineraryID: string;
}): Promise<ItemRow> {
  const db = await getDB();
  const ItemID = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO Itinerary_Item (ItemID, ItemName, Type, ItineraryNote, ItineraryID)
       VALUES (?, ?, 'attraction', ?, ?)`
    )
    .bind(ItemID, i.ItemName, i.ItineraryNote ?? null, i.ItineraryID)
    .run();
  return findById(ItemID) as Promise<ItemRow>;
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDB();
  await db.prepare("DELETE FROM Itinerary_Item WHERE ItemID = ?").bind(id).run();
}