import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

/** 当前用户退出行程（Owner 不可退出） */
export async function DELETE(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req));

    const self = (await CollaboratorRepo.findByTrip(ACTIVE_TRIP_ID)).find(
      (m) => m.user_id === me.id
    );
    if (!self) return error("You are not a member of this trip.", 404);
    if (self.role === "Owner") return error("Owner cannot leave the trip.");

    await CollaboratorRepo.deleteCollaborator(ACTIVE_TRIP_ID, me.id);
    await logActivity({
      trip_id: ACTIVE_TRIP_ID,
      user_id: me.id,
      action: "left the trip",
    });

    // 广播成员退出事件
    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "member_left",
      userId: me.id,
    });

    broadcaster.broadcast(ACTIVE_TRIP_ID, {
      type: "activity",
      entry: {
        id: `act-${Date.now()}`,
        actor: me.username,
        action: "left the trip",
        at: Date.now(),
      },
    });

    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not leave trip");
  }
}
