import { body, errorResponse, service, tokenFrom } from "../../api";

export async function PATCH(request: Request): Promise<Response> { try { const token = tokenFrom(request); if (!token) throw new Error("Unauthorized"); const input = await body(request); return Response.json({ user: await (await service()).updateProfile(token, String(input.fullName ?? ""), input.phone ? String(input.phone) : null, input.profilePicture ? String(input.profilePicture) : null) }); } catch (error) { return errorResponse(error); } }
