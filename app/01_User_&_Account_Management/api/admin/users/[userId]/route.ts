import { body, errorResponse, service, tokenFrom } from "../../../../api";

type Context = { params: Promise<{ userId: string }> };
export async function PATCH(request: Request, context: Context): Promise<Response> { try { const token = tokenFrom(request); if (!token) throw new Error("Unauthorized"); const input = await body(request); await (await service()).adminSetActive(token, (await context.params).userId, input.active === true); return Response.json({ ok: true }); } catch (error) { return errorResponse(error); } }
export async function DELETE(request: Request, context: Context): Promise<Response> { try { const token = tokenFrom(request); if (!token) throw new Error("Unauthorized"); await (await service()).adminDelete(token, (await context.params).userId); return Response.json({ ok: true }); } catch (error) { return errorResponse(error); } }
