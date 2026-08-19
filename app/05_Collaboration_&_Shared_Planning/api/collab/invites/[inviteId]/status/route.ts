import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import * as AccountRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/AccountRepo";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { ACTIVE_TRIP_ID, json, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";

type Ctx = { params: Promise<{ inviteId: string }> };

/**
 * PATCH { status: 'accepted' | 'rejected' }
 * demo 妯″紡锛氫笉绠℃槸璋侊紝鍙閭€璇峰瓨鍦ㄤ笖 pending 灏辫兘鎺ュ彈/鎷掔粷锛堟ā鎷熷彈閭€鑰呮搷浣滐級銆? */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { inviteId } = await ctx.params;
    const body = (await req.json()) as { status?: string; userId?: string };
    const status = body.status === "accepted" ? "accepted" : body.status === "rejected" ? "rejected" : null;
    if (!status) return error("status must be 'accepted' or 'rejected'.");

    const invite = await InviteRepo.findById(inviteId);
    if (!invite || invite.trip_id !== ACTIVE_TRIP_ID) return error("Invitation not found", 404);
    if (invite.status !== "pending") return error("Invitation is no longer pending.");

    await InviteRepo.updateStatus(inviteId, status);

    const actorAccount = await resolveActor(req, invite);
    if (status === "accepted") {
      const existing = invite.receiver_user_id
        ? await AccountRepo.findAccountById(invite.receiver_user_id)
        : await AccountRepo.findAccountByEmail(invite.receiver_email);
      const account = existing ?? (await AccountRepo.insertAccount({
        username: displayNameFromEmail(invite.receiver_email),
        email: invite.receiver_email,
      }));
      await InviteRepo.updateStatus(
        inviteId,
        "accepted"
      );
      await CollaboratorRepo.insertCollaborator({
        role: invite.role === "Editor" ? "Editor" : "Viewer",
        trip_id: ACTIVE_TRIP_ID,
        user_id: account.AccountID,
        invited_by: invite.sender_id,
      });
      await logActivity({
        trip_id: ACTIVE_TRIP_ID,
        user_id: account.AccountID,
        action: `accepted the invite as ${invite.role}`,
      });
    } else {
      await logActivity({
        trip_id: ACTIVE_TRIP_ID,
        user_id: actorAccount.AccountID,
        action: `${invite.receiver_email} declined the invite to join as ${invite.role}`,
      });
    }

    return json({ ok: true, status });
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