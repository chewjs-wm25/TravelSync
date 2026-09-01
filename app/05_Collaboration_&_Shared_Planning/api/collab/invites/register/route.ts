import { getDB } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/db";
import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import * as TripRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";
import { AuthService } from "@/business_logic_layer/01_User_&_Account_Management";
import { ACTIVE_TRIP_ID, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";

/**
 * POST /api/collab/invites/register
 * Body: { token, username, password, fullName }
 *
 * 1. 根据邀请 token 查邀请
 * 2. 使用 AuthService 统一注册新用户（保证与 Module 01 规则及加密算法 100% 一致）
 * 3. 自动接受邀请（创建 Collaborator 并确保 Trip 存在）
 * 4. 签发 session → 返回 user + cookie
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      username?: string;
      password?: string;
      fullName?: string;
    };

    const token = body.token?.trim();
    const username = body.username?.trim().toLowerCase();
    const password = body.password ?? "";
    const fullName = body.fullName?.trim();

    if (!token) return error("Invitation token is required.");
    if (!username) return error("Username is required.");
    if (!fullName) return error("Full name is required.");
    if (!password) return error("Password is required.");

    // 1. 查邀请
    const invite = await InviteRepo.findByToken(token);
    if (!invite) return error("Invitation not found or link has expired.", 404);
    if (invite.status !== "pending") return error("This invitation is no longer pending.");
    if (new Date(invite.expires_at) < new Date()) return error("This invitation has expired.");

    // 2. 初始化 DB 与 AuthService
    const db = await getDB();
    if (!db) return error("Database not available.");
    const authService = new AuthService(db);

    // 3. 统一注册新用户（用邀请里的 email）
    const regResult = await authService.register({
      username,
      fullName,
      email: invite.receiver_email,
      password,
      acceptTerms: true,
    });

    const targetTripId = invite.trip_id || ACTIVE_TRIP_ID;
    await TripRepo.ensureTripExists(targetTripId, invite.sender_id);

    // 4. 接受邀请 → 更新邀请状态与受邀用户 ID
    await InviteRepo.updateStatus(invite.invitation_id, "accepted");
    await InviteRepo.updateReceiverUserId(invite.invitation_id, regResult.user.id);

    // 5. 插入 Collaborators 表
    await CollaboratorRepo.insertCollaborator({
      role: invite.role,
      trip_id: targetTripId,
      user_id: regResult.user.id,
      invited_by: invite.sender_id,
    });

    await logActivity({
      trip_id: targetTripId,
      user_id: regResult.user.id,
      action: `registered and accepted the invite as ${invite.role}`,
    });

    broadcaster.broadcast(targetTripId, {
      type: "member_joined",
      member: {
        id: regResult.user.id,
        name: regResult.user.fullName || regResult.user.username,
        email: invite.receiver_email,
        role: invite.role,
        avatar: regResult.user.profilePicture ?? "",
      },
    });

    // 6. 返回 user + tripId + session cookie
    const sessionToken = regResult.sessionToken ?? "";
    const expiresAtMs = regResult.expiresAt
      ? new Date(regResult.expiresAt).getTime()
      : Date.now() + 30 * 24 * 60 * 60 * 1000;
    const maxAge = Math.max(60, Math.floor((expiresAtMs - Date.now()) / 1000));

    return Response.json(
      {
        success: true,
        tripId: targetTripId,
        user: {
          id: regResult.user.id,
          username: regResult.user.username,
          email: regResult.user.email,
          fullName: regResult.user.fullName,
          profilePicture: regResult.user.profilePicture,
          createdAt: regResult.user.createdAt,
          isVerified: regResult.user.isVerified,
          role: "user",
        },
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": `travelsync_session=${encodeURIComponent(
            sessionToken
          )}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`,
        },
      }
    );
  } catch (e) {
    return error(e instanceof Error ? e.message : "Registration failed");
  }
}
