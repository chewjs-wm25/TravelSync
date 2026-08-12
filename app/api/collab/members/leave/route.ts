import * as CollaboratorRepo from "@/src/lib/db/repositories/collab/CollaboratorRepo";
import { resolveDemoUser, extractUserId } from "@/src/lib/server/collab/DemoSession";
import { logActivity } from "@/src/lib/server/collab/ActivityLogger";
import { ACTIVE_TRIP_ID, json, error } from "@/src/lib/server/collab/collab-route";

/** 当前用户退出行程（Owner 不可退出） */
export async function DELETE(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));

    const self = (await CollaboratorRepo.findByTrip(ACTIVE_TRIP_ID)).find(
      (m) => m.user_id === me.AccountID
    );
    if (!self) return error("You are not a member of this trip.", 404);
    if (self.role === "Owner") return error("Owner cannot leave the trip.");

    await CollaboratorRepo.deleteCollaborator(ACTIVE_TRIP_ID, me.AccountID);
    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.AccountID,
      action: "left the trip",
    });
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not leave trip");
  }
}