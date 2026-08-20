import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AuthService } from "../../business_logic_layer/01_User_&_Account_Management";

export async function service(): Promise<AuthService> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { DB?: D1Database }).DB;
  if (!db) throw new Error("D1 binding DB is required");
  return new AuthService(db);
}

export function tokenFrom(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  const cookie = request.headers.get("cookie")?.match(/(?:^|; )travelsync_session=([^;]+)/)?.[1];
  return cookie ? decodeURIComponent(cookie) : null;
}

export function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Too many login attempts" ? 429 : 400;
  return Response.json({ error: message }, { status });
}

export async function body(request: Request): Promise<Record<string, unknown>> { return await request.json() as Record<string, unknown>; }
