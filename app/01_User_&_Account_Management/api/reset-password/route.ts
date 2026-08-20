import { body, errorResponse, service } from "../../api";

export async function POST(request: Request): Promise<Response> { try { const input = await body(request); await (await service()).resetPassword(String(input.token ?? ""), String(input.newPassword ?? "")); return Response.json({ ok: true }); } catch (error) { return errorResponse(error); } }
