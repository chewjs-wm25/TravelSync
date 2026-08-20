import { body, errorResponse, service } from "../../api";

export async function POST(request: Request): Promise<Response> {
  try { const input = await body(request); const result = await (await service()).register({ fullName: String(input.fullName ?? ""), email: String(input.email ?? ""), password: String(input.password ?? ""), acceptTerms: input.acceptTerms === true }); return Response.json({ user: result.user, message: "Verification email sent" }, { status: 201 }); } catch (error) { return errorResponse(error); }
}
