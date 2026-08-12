import * as ItemRepo from "@/src/lib/db/repositories/collab/ItemRepo";
import { resolveDemoUser, extractUserId } from "@/src/lib/server/collab/DemoSession";
import { requirePermission } from "@/src/lib/server/collab/PermissionValidator";
import { logActivity } from "@/src/lib/server/collab/ActivityLogger";
import { ACTIVE_TRIP_ID, json, error } from "@/src/lib/server/collab/collab-route";

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