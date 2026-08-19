import * as ItemRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

type Ctx = { params: Promise<{ itemId: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { itemId } = await ctx.params;
    const me = await resolveDemoUser(extractUserId(req));
    await requirePermission(ACTIVE_TRIP_ID, me.AccountID, "editItinerary");

    const item = await ItemRepo.findById(itemId);
    if (!item) return error("Item not found", 404);
    await ItemRepo.deleteItem(itemId);

    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.AccountID,
      action: `removed "${item.ItemName}" from the itinerary`,
    });
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not remove item");
  }
}