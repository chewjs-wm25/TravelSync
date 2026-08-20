import { body, errorResponse, service, tokenFrom } from "../../api";

export async function PATCH(request: Request): Promise<Response> { try { const token = tokenFrom(request); if (!token) throw new Error("Unauthorized"); const input = await body(request); await (await service()).changePassword(token, String(input.currentPassword ?? ""), String(input.newPassword ?? "")); return Response.json({ ok: true }); } catch (error) { return errorResponse(error); } }
