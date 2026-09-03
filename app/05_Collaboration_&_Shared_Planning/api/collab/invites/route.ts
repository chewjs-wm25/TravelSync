import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import * as AccountRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/AccountRepo";
import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import { resolveDemoUser, extractUserId } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/DemoSession";
import { requirePermission } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/PermissionValidator";
import { createInvite } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/InviteService";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { mapInvite } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ReplyMapper";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { extractTripId, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

export async function POST(req: Request) {
  try {
    const me = await resolveDemoUser(extractUserId(req), req);
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      username?: string;
      identifier?: string;
      role?: InviteRepo.InviteRoleDB;
      tripId?: string;
      trip_id?: string;
    };
    const targetTripId = extractTripId(req, body);

    await requirePermission(targetTripId, me.id, "invite");

    const input = (body.email || body.username || body.identifier || "").trim();
    const role = body.role === "Viewer" ? "Viewer" : body.role === "Editor" ? "Editor" : "Viewer";

    if (!input) {
      return error("Please enter an email address or username.");
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    let targetAccount: AccountRepo.AccountRow | null = null;
    let receiverEmail = "";
    let receiverUserId: string | null = null;

    if (isEmail) {
      receiverEmail = input.toLowerCase();
      // 电子邮箱：谁都可以邀请！若已注册则关联 user_id，若未注册则留空（受邀者访问链接时会引导注册）
      targetAccount = await AccountRepo.findAccountByEmail(receiverEmail);
      if (targetAccount) {
        if (targetAccount.id === me.id) {
          return error("You cannot invite yourself to your own trip.");
        }
        receiverUserId = targetAccount.id;
      } else {
        receiverUserId = null;
      }
    } else {
      // 用户名：必须是已注册且数据库有记录的账号才能发送
      targetAccount = await AccountRepo.findAccountByUsername(input);
      if (!targetAccount) {
        return error("This username does not exist. Username invitations require a registered user. Please check the username or invite via email.");
      }
      if (targetAccount.id === me.id) {
        return error("You cannot invite yourself to your own trip.");
      }
      receiverEmail = targetAccount.email.toLowerCase();
      receiverUserId = targetAccount.id;
    }

    // 检查该用户是否已经是本行程成员（若已有对应账号）
    if (receiverUserId) {
      const existingMembers = await CollaboratorRepo.findByTrip(targetTripId).catch(() => []);
      if (existingMembers.some((m) => m.user_id === receiverUserId)) {
        return error("This user is already an active collaborator on this trip.");
      }
    }

    // 检查是否已有针对该邮箱或该用户的有效 pending 邀请
    const existingInvites = await InviteRepo.findByTrip(targetTripId).catch(() => []);
    const alreadyPending = existingInvites.some(
      (i) =>
        i.status === "pending" &&
        (i.receiver_email.toLowerCase() === receiverEmail ||
          (receiverUserId && i.receiver_user_id === receiverUserId))
    );
    if (alreadyPending) {
      return error("An invitation is already pending for this recipient. Please wait for their response.");
    }

    const invite = await createInvite({
      trip_id: targetTripId,
      sender_id: me.id,
      receiver_email: receiverEmail,
      role,
      receiver_user_id: receiverUserId,
    });

    await logActivity({
      trip_id: targetTripId,
      user_id: me.id,
      action: `invited ${receiverEmail} as ${role}`,
    });

    const invites = await InviteRepo.findByTrip(targetTripId);
    const created = invites.find((i) => i.invitation_id === invite.invitation_id);

    // 广播邀请创建事件
    if (created) {
      broadcaster.broadcast(
        targetTripId,
        {
          type: "invite_created",
          invite: {
            id: created.invitation_id,
            email: created.receiver_email,
            role: created.role,
            status: created.status,
            invitedBy: me.username,
          },
        },
        me.id
      );
    }

    return json({
      success: true,
      invite: created ? mapInvite(created) : undefined,
    });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not create invite");
  }
}