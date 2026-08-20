import { errorResponse, service } from "../../api";

export async function POST(request: Request): Promise<Response> { try { const token = new URL(request.url).searchParams.get("token"); if (!token) throw new Error("Verification token is required"); await (await service()).verifyEmail(token); return Response.json({ ok: true }); } catch (error) { return errorResponse(error); } }
