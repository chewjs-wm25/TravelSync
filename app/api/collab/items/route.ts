import * as ItineraryRepo from "@/src/lib/db/repositories/collab/ItineraryRepo";
import * as ItemRepo from "@/src/lib/db/repositories/collab/ItemRepo";
import { resolveDemoUser, extractUserId } from "@/src/lib/server/collab/DemoSession";
import { requirePermission } from "@/src/lib/server/collab/PermissionValidator";
import { logActivity } from "@/src/lib/server/collab/ActivityLogger";
import { ACTIVE_TRIP_ID, json, error } from "@/src/lib/server/collab/collab-route";

/** POST { day, title, note? } 新增明细（落在对应 day 的 Itinerary） */
export async function POST(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.AccountID, "editItinerary");

    const body = (await req.json()) as { day?: number; title?: string; note?: string };
    const title = body.title?.trim() ?? "";
    if (!title) return error("Title is required.");
    const day = Number(body.day);
    if (!Number.isInteger(day) || day < 1) return error("day must be a positive integer.");

    const itineraries = await ItineraryRepo.findByTrip(ACTIVE_TRIP_ID);
    const dayLabel = `Day ${day}`;
    let itinerary = itineraries.find(
      (i) => i.Title?.toLowerCase() === dayLabel.toLowerCase()
    );
    if (!itinerary) {
      itinerary = await ItineraryRepo.insertItinerary({
        Title: dayLabel,
        Date: null,
        TripID: ACTIVE_TRIP_ID,
      });
    }

    const item = await ItemRepo.insertItem({
      ItemName: title,
      ItineraryNote: body.note?.trim() || null,
      ItineraryID: itinerary.ItineraryID,
    });

    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.AccountID,
      action: `added "${title}" to ${dayLabel}`,
    });

    return json({ ok: true, item: { id: item.ItemID, day, title, note: item.ItineraryNote ?? undefined } });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not add item");
  }
}