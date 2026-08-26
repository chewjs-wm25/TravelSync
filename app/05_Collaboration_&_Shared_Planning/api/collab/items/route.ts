import * as ItineraryRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItineraryRepo";
import * as ItemRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

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
      user_id: me.id,
      action: `added "${title}" to ${dayLabel}`,
    });

    const itemData = { itemId: item.ItemID, day, name: title, note: item.ItineraryNote ?? undefined };

    // 广播行程明细新增事件
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
