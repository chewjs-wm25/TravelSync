import * as ItemRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

type Ctx = { params: Promise<{ itemId: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { itemId } = await ctx.params;
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.id, "editItinerary");

    const item = await ItemRepo.findById(itemId);
    if (!item) return error("Item not found", 404);
    await ItemRepo.deleteItem(itemId);

    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.id,
      action: `removed "${item.ItemName}" from the itinerary`,
    });

    // 广播行程明细删除事件
    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "item_removed",
      itemId,
    }, me.id);

    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "activity",
      entry: {
        id: `act-${Date.now()}`,
        actor: me.username,
        action: `removed "${item.ItemName}" from the itinerary`,
        at: Date.now(),
      },
    });

    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not remove item");
  }
}
