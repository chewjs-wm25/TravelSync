import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getItineraryItemById } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemRepository";
import { deleteItineraryItemById } from "@/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemService";
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

type Ctx = { params: Promise<{ itemId: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { itemId } = await ctx.params;
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.id, "editItinerary");

    const db = await getDb();
    let itemName: string;

    // 优先 Module 02
    try {
      const item = await getItineraryItemById(db, itemId);
      if (!item) throw new Error("not found in Module 02");
      itemName = item.item_name;

      const result = await deleteItineraryItemById(db, { itemId });
      if (!result.success) return error(result.message, result.status);
    } catch {
      // Fallback: Module 05 自有表
      const item = await LegacyItemRepo.findById(itemId);
      if (!item) return error("Item not found", 404);
      itemName = item.ItemName;
      await LegacyItemRepo.deleteItem(itemId);
    }

    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.id,
      action: `removed "${itemName}" from the itinerary`,
    });

    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "item_removed",
      itemId,
    }, me.id);

    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "activity",
      entry: {
        id: `act-${Date.now()}`,
        actor: me.username,
        action: `removed "${itemName}" from the itinerary`,
        at: Date.now(),
      },
    });

    return json({ success: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not remove item");
  }
}
