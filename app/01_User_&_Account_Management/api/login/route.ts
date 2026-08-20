import { body, errorResponse, service } from "../../api";

export async function POST(request: Request): Promise<Response> {
  try { const input = await body(request); const result = await (await service()).login({ email: String(input.email ?? ""), password: String(input.password ?? ""), rememberMe: input.rememberMe === true, ipAddress: request.headers.get("x-forwarded-for") }); const maxAge = Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000); return Response.json({ user: result.user }, { headers: { "Set-Cookie": `travelsync_session=${encodeURIComponent(result.token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}` } }); } catch (error) { return errorResponse(error); }
}
