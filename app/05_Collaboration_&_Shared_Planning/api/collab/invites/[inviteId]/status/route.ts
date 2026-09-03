import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import * as AccountRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/AccountRepo";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

type Ctx = { params: Promise<{ inviteId: string }> };

/**
 * PATCH { status: 'accepted' | 'rejected' }
 * 接受/拒绝邀请
 */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { inviteId } = await ctx.params;
    const body = (await req.json()) as { status?: string; userId?: string };
    const status = body.status === "accepted" ? "accepted" : body.status === "rejected" ? "rejected" : null;
    if (!status) return error("status must be 'accepted' or 'rejected'.");

    const invite = await InviteRepo.findById(inviteId);
    if (!invite) return error("Invitation not found", 404);
    if (invite.status !== "pending") return error("Invitation is no longer pending.");

    const targetTripId = invite.trip_id || ACTIVE_TRIP_ID;

    await InviteRepo.updateStatus(inviteId, status);

    const actorAccount = await resolveActor(req, invite);
    if (status === "accepted") {
      // 优先匹配传入的 userId、cookie 会话、receiver_user_id 或邮箱
      let account: AccountRepo.AccountRow | null = null;
      if (body.userId) {
        account = await AccountRepo.findAccountById(body.userId);
      }
      if (!account && invite.receiver_user_id) {
        account = await AccountRepo.findAccountById(invite.receiver_user_id);
      }
      if (!account) {
        const { getAuthSession } = await import("@/business_logic_layer/01_User_&_Account_Management/sessionHelper");
        const session = await getAuthSession(req).catch(() => null);
        if (session?.userId) {
          account = await AccountRepo.findAccountById(session.userId);
        }
      }
      if (!account) {
        account = await AccountRepo.findAccountByEmail(invite.receiver_email);
      }

      if (!account) {
        return error("No registered user account found to accept this invitation. Please sign in first.", 400);
      }

      await InviteRepo.updateReceiverUserId(inviteId, account.id);
      await CollaboratorRepo.insertCollaborator({
        role: invite.role === "Editor" ? "Editor" : "Viewer",
        trip_id: targetTripId,
        user_id: account.id,
        invited_by: invite.sender_id,
      });
      await logActivity({
        trip_id: targetTripId,
        user_id: account.id,
        action: `accepted the invite as ${invite.role}`,
      });

      // 广播新成员加入事件
      broadcaster.broadcast(targetTripId, {
        type: "member_joined",
        member: {
          id: account.id,
          name: account.username,
          email: account.email,
          role: invite.role,
          avatar: account.profile_picture ?? "",
        },
      });

      broadcaster.broadcast(targetTripId, {
        type: "activity",
        entry: {
          id: `act-${Date.now()}`,
          actor: account.username,
          action: `accepted the invite as ${invite.role}`,
          at: Date.now(),
        },
      });
    } else {
      await logActivity({
        trip_id: targetTripId,
        user_id: actorAccount.id,
        action: `${invite.receiver_email} declined the invite to join as ${invite.role}`,
      });

      broadcaster.broadcast(targetTripId, {
        type: "activity",
        entry: {
          id: `act-${Date.now()}`,
          actor: invite.receiver_email,
          action: `declined the invite to join as ${invite.role}`,
          at: Date.now(),
        },
      });
    }

    return json({ success: true, status, tripId: targetTripId });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Could not update invite");
  }
}

async function resolveActor(req: Request, invite: InviteRepo.InviteRow) {
  const userId = new URL(req.url).searchParams.get("userId");
  const account = userId ? await AccountRepo.findAccountById(userId) : null;
  if (account) return account;
  const byEmail = await AccountRepo.findAccountByEmail(invite.receiver_email);
  if (byEmail) return byEmail;
  return AccountRepo.insertAccount({
    username: displayNameFromEmail(invite.receiver_email),
    email: invite.receiver_email,
  });
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0];
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
