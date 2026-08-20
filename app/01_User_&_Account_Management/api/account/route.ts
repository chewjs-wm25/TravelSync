import { body, errorResponse, service, tokenFrom } from "../../api";

export async function DELETE(request: Request): Promise<Response> { try { const token = tokenFrom(request); if (!token) throw new Error("Unauthorized"); const input = await body(request); await (await service()).deleteAccount(token, String(input.password ?? "")); return Response.json({ ok: true }, { headers: { "Set-Cookie": "travelsync_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" } }); } catch (error) { return errorResponse(error); } }
