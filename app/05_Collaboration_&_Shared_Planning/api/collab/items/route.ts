import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getItinerariesByTripId, createItinerary } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";
import { createItineraryItem } from "@/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemService";
import * as LegacyItineraryRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItineraryRepo";
import * as LegacyItemRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { TEST_DB?: D1Database }).TEST_DB;
  if (!db) throw new Error("D1 binding TEST_DB is required");
  return db;
}

/** POST { day, title, note? } 新增行程明细 */
export async function POST(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.id, "editItinerary");

    const body = (await req.json()) as { day?: number; title?: string; note?: string };
    const title = body.title?.trim() ?? "";
    if (!title) return error("Title is required.");
    const day = Number(body.day);
    if (!Number.isInteger(day) || day < 1) return error("day must be a positive integer.");

    const db = await getDb();
    const dayLabel = `Day ${day}`;
    let itemId: string;
    let itemNote: string | null;

    // 优先 Module 02
    try {
      const itineraries = await getItinerariesByTripId(db, ACTIVE_TRIP_ID);
      if (itineraries.length === 0) throw new Error("no itineraries in Module 02");

      let itinerary = itineraries.find(
        (i) => i.title?.toLowerCase() === dayLabel.toLowerCase()
      );
      if (!itinerary) {
        itinerary = await createItinerary(db, {
          tripId: ACTIVE_TRIP_ID,
          title: dayLabel,
          date: "",
          note: null,
        });
      }

      const result = await createItineraryItem(db, {
        itineraryId: itinerary.itinerary_id,
        place: title,
        note: body.note?.trim() || null,
      });

      if (!result.success) return error(result.message, result.status);
      itemId = result.item.item_id;
      itemNote = result.item.itinerary_item_note;
    } catch {
      // Fallback: Module 05 自有表
      const itineraries = await LegacyItineraryRepo.findByTrip(ACTIVE_TRIP_ID);
      let itinerary = itineraries.find(
        (i) => i.Title?.toLowerCase() === dayLabel.toLowerCase()
      );
      if (!itinerary) {
        itinerary = await LegacyItineraryRepo.insertItinerary({
          Title: dayLabel,
          Date: null,
          TripID: ACTIVE_TRIP_ID,
        });
      }
      const item = await LegacyItemRepo.insertItem({
        ItemName: title,
        ItineraryNote: body.note?.trim() || null,
        ItineraryID: itinerary.ItineraryID,
      });
      itemId = item.ItemID;
      itemNote = item.ItineraryNote;
    }

    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.id,
      action: `added "${title}" to ${dayLabel}`,
    });

    const itemData = { itemId, day, name: title, note: itemNote ?? undefined };

    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "item_added",
      item: itemData,
    }, me.id);

    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "activity",
      entry: {
        id: `act-${Date.now()}`,
        actor: me.username,
        action: `added "${title}" to ${dayLabel}`,
        at: Date.now(),
      },
    });

    return json({ success: true, item: itemData });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not add item");
  }
}
