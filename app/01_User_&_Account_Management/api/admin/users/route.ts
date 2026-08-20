import { errorResponse, service, tokenFrom } from "../../../api";

export async function GET(request: Request): Promise<Response> { try { const token = tokenFrom(request); if (!token) throw new Error("Unauthorized"); return Response.json({ users: await (await service()).adminUsers(token) }); } catch (error) { return errorResponse(error); } }
