import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

/** 鎶婃墍鏈夊凡杩囨湡鐨?pending 閭€璇锋爣璁颁负 expired锛堟ā鎷?30 澶╄嚜鍔ㄨ繃鏈燂級 */
export async function POST() {
  try {
    const expired = await InviteRepo.expirePending(new Date().toISOString());
    if (expired.length > 0) {
      for (const invite of expired) {
        await logActivity({
          trip_id: ACTIVE_TRIP_ID,
          user_id: invite.sender_id,
          action: `invitation to ${invite.receiver_email} expired`,
        });
      }
    }
    return json({ success: true, expired: expired.length });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not expire invites");
  }
}