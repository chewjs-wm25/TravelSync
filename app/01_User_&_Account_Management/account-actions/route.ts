import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AuthService } from "../../../business_logic_layer/01_User_&_Account_Management";
import { ensureAccountSchema } from "../../../data_access_layer/01_User_&_Account_Management/AccountSchema";

async function authService(): Promise<AuthService> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { TEST_DB?: D1Database }).TEST_DB;
  if (!db) throw new Error("D1 binding TEST_DB is required");
  await ensureAccountSchema(db);
  return new AuthService(db);
}

function tokenFrom(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  const cookie = request.headers.get("cookie")?.match(/(?:^|; )travelsync_session=([^;]+)/)?.[1];
  return cookie ? decodeURIComponent(cookie) : null;
}

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Too many login attempts" ? 429 : 400;
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const action = new URL(request.url).searchParams.get("action");
    const input = await request.json() as Record<string, unknown>;
    const service = await authService();
    const token = tokenFrom(request);

    if (action === "login") {
      const result = await service.login({ email: String(input.email ?? ""), password: String(input.password ?? ""), rememberMe: input.rememberMe === true, ipAddress: request.headers.get("x-forwarded-for") });
      const maxAge = Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000);
      return Response.json({ user: result.user }, { headers: { "Set-Cookie": `travelsync_session=${encodeURIComponent(result.token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}` } });
    }
    if (action === "register") return Response.json({ user: (await service.register({ fullName: String(input.fullName ?? ""), email: String(input.email ?? ""), password: String(input.password ?? ""), acceptTerms: input.acceptTerms === true })).user, message: "Verification email sent" }, { status: 201 });
    if (action === "logout") { if (token) await service.logout(token); return Response.json({ ok: true }, { headers: { "Set-Cookie": "travelsync_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" } }); }
    if (action === "forgot-password") { await service.forgotPassword(String(input.email ?? "")); return Response.json({ message: "If the account exists, a reset email has been sent" }); }
    if (action === "password") { if (!token) throw new Error("Unauthorized"); await service.changePassword(token, String(input.currentPassword ?? ""), String(input.newPassword ?? "")); return Response.json({ ok: true }); }
    if (action === "delete-account") { if (!token) throw new Error("Unauthorized"); await service.deleteAccount(token, String(input.password ?? "")); return Response.json({ ok: true }, { headers: { "Set-Cookie": "travelsync_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" } }); }
    if (action === "profile") { if (!token) throw new Error("Unauthorized"); return Response.json({ user: await service.updateProfile(token, String(input.fullName ?? ""), input.phone ? String(input.phone) : null, input.profilePicture ? String(input.profilePicture) : null) }); }
    if (action === "settings") { if (!token) throw new Error("Unauthorized"); await service.updateSettings(token, { notificationsEnabled: input.notificationsEnabled === true, language: String(input.language ?? "en"), theme: input.theme === "dark" ? "dark" : "light", privacyLevel: input.privacyLevel === "public" || input.privacyLevel === "contacts" ? input.privacyLevel : "private" }); return Response.json({ ok: true }); }
    throw new Error("Unknown account action");
  } catch (error) { return errorResponse(error); }
}

export async function GET(request: Request): Promise<Response> {
  try { const token = tokenFrom(request); if (!token) throw new Error("Unauthorized"); return Response.json({ user: await (await authService()).currentUser(token) }); } catch (error) { return errorResponse(error); }
}
