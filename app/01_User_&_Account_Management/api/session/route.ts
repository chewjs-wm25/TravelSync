import { errorResponse, service, tokenFrom } from "../../api";

export async function GET(request: Request): Promise<Response> { try { const token = tokenFrom(request); if (!token) throw new Error("Unauthorized"); return Response.json({ user: await (await service()).currentUser(token) }); } catch (error) { return errorResponse(error); } }
