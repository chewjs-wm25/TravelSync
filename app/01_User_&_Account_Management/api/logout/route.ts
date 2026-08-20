import { errorResponse, service, tokenFrom } from "../../api";

export async function POST(request: Request): Promise<Response> {
  try { const token = tokenFrom(request); if (token) await (await service()).logout(token); return Response.json({ ok: true }, { headers: { "Set-Cookie": "travelsync_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" } }); } catch (error) { return errorResponse(error); }
}
