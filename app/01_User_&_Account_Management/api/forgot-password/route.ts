import { body, errorResponse, service } from "../../api";

export async function POST(request: Request): Promise<Response> { try { const input = await body(request); await (await service()).forgotPassword(String(input.email ?? "")); return Response.json({ message: "If the account exists, a reset email has been sent" }); } catch (error) { return errorResponse(error); } }
