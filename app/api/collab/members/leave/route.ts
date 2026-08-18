import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

/** 褰撳墠鐢ㄦ埛閫€鍑鸿绋嬶紙Owner 涓嶅彲閫€鍑猴級 */
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