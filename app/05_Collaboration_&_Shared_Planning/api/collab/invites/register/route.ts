import { getDB } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/db";
import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import { ACTIVE_TRIP_ID, error } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/collab-route";
import { logActivity } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/ActivityLogger";
import { broadcaster } from "@/business_logic_layer/05_Collaboration_&_Shared_Planning/server/EventBroadcaster";

function base64Url(value: string): string {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return base64Url(binary);
}

async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt ?? randomSalt();
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(s), iterations: 120000, hash: "SHA-256" }, key, 256);
  let binary = "";
  for (const byte of new Uint8Array(bits)) binary += String.fromCharCode(byte);
  return `${s}.${base64Url(binary)}`;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function signJwt(payload: Record<string, unknown>): Promise<string> {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  return crypto.subtle.importKey("raw", new TextEncoder().encode("travelsync-jwt-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((key) => crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)))
    .then((sig) => `${data}.${base64Url(String.fromCharCode(...new Uint8Array(sig)))}`);
}

function validPassword(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

function validUsername(username: string): boolean {
  return /^[a-z0-9_]{3,24}$/.test(username);
}

/**
 * POST /api/collab/invites/register
 * Body: { token, username, password, fullName }
 *
 * 1. 根据邀请 token 查邀请
 * 2. 注册新用户（用邀请里的 email）
 * 3. 自动接受邀请（创建 Collaborator）
 * 4. 创建 session → 返回 user + cookie
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
    if (!username || !validUsername(username)) return error("Username must be 3-24 characters (letters, numbers, underscore).");
    if (!fullName) return error("Full name is required.");
    if (!validPassword(password)) return error("Password must be at least 8 characters with uppercase, lowercase, digit, and special character.");

    // 1. 查邀请
    const invite = await InviteRepo.findByToken(token);
    if (!invite) return error("Invitation not found.", 404);
    if (invite.status !== "pending") return error("This invitation is no longer pending.");
    if (new Date(invite.expires_at) < new Date()) return error("This invitation has expired.");

    // 2. 初始化 DB
    const db = await getDB();
    if (!db) return error("Database not available.");

    // 3. 检查用户名与邮箱是否已存在
    const existingUsername = await db.prepare("SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1").bind(username).first();
    if (existingUsername) return error("Username is already taken.");

    const existingEmail = await db.prepare("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1").bind(invite.receiver_email.toLowerCase()).first();
    if (existingEmail) return error("An account with this email already exists. Please sign in instead.");

    // 4. 创建用户（email 来自邀请）
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    await db.prepare(
      `INSERT INTO users (id, username, email, password_hash, full_name, phone, ic_hash, profile_picture, is_verified, is_active, is_locked, failed_attempts, lock_until, last_login, created_at, role)
       VALUES (?, ?, ?, ?, ?, NULL, '', NULL, 1, 1, 0, 0, NULL, ?, ?, 'user')`
    ).bind(userId, username, invite.receiver_email.toLowerCase(), passwordHash, fullName, now, now).run();

    try {
      await db.prepare(
        "INSERT OR IGNORE INTO user_settings (user_id, notifications_enabled, language, theme, privacy_level) VALUES (?, 1, 'en', 'light', 'private')"
      ).bind(userId).run();
    } catch {
      // ignore
    }

    // 5. 创建 session（自动登录）
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 天
    const sessionToken = await signJwt({
      sub: userId,
      role: "user",
      exp: Math.floor(expiresAt.getTime() / 1000),
      jti: randomToken(),
    });

    await db.prepare(
      `INSERT INTO user_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), userId, sessionToken, expiresAt.toISOString()).run();

    const targetTripId = invite.trip_id || ACTIVE_TRIP_ID;

    // 6. 接受邀请 → 创建 Collaborator
    await InviteRepo.updateStatus(invite.invitation_id, "accepted");
    await InviteRepo.updateReceiverUserId(invite.invitation_id, userId);

    await CollaboratorRepo.insertCollaborator({
      role: invite.role,
      trip_id: targetTripId,
      user_id: userId,
      invited_by: invite.sender_id,
    });

    await logActivity({
      trip_id: targetTripId,
      user_id: userId,
      action: `registered and accepted the invite as ${invite.role}`,
    });

    broadcaster.broadcast(targetTripId, {
      type: "member_joined",
      member: { id: userId, name: fullName, email: invite.receiver_email, role: invite.role, avatar: "" },
    });

    // 7. 返回 user + tripId + session cookie
    const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    return Response.json(
      {
        success: true,
        tripId: targetTripId,
        user: {
          id: userId,
          username,
          email: invite.receiver_email,
          fullName,
          profilePicture: null,
          createdAt: now,
          isVerified: true,
          role: "user",
        },
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": `travelsync_session=${encodeURIComponent(sessionToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`,
        },
      }
    );
  } catch (e) {
    return error(e instanceof Error ? e.message : "Registration failed");
  }
}
