/**
 * sessionHelper.ts — Cookie-based session verification helper
 *
 * Provides shared auth utilities for all Route APIs across the project.
 * Extracts the `travelsync_session` cookie from the request and verifies
 * it using the 01 module's AuthService (D1-backed session table).
 *
 * Replaces the old DEV-ACCOUNT-STATE/api/session.ts approach.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AuthService } from "./AuthService";
import { ensureAccountSchema } from "../../data_access_layer/01_User_&_Account_Management/AccountSchema";

export interface AuthSession {
  userId: string;
  role: string;
}

export type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; response: Response };

/** Extract the travelsync_session cookie value from a Request */
function tokenFromCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(/(?:^|; )travelsync_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Get the authenticated session from the request cookie. Returns null if not logged in. */
export async function getAuthSession(
  request: Request
): Promise<AuthSession | null> {
  const token = tokenFromCookie(request);
  if (!token) return null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as { TEST_DB?: D1Database }).TEST_DB;
    if (!db) return null;
    await ensureAccountSchema(db);
    const service = new AuthService(db);
    const user = await service.authorize(token);
    return { userId: user.id, role: user.role ?? "user" };
  } catch {
    return null;
  }
}

/** Require an authenticated user. Returns 401 response if not logged in. */
export async function requireUser(request: Request): Promise<AuthResult> {
  const session = await getAuthSession(request);
  if (!session) {
    return {
      ok: false,
      response: Response.json(
        { error: "Unauthorized: please log in first" },
        { status: 401 }
      ),
    };
  }
  return { ok: true, session };
}

/** Require an admin user. Returns 401 if not logged in, 403 if not admin. */
export async function requireAdmin(request: Request): Promise<AuthResult> {
  const result = await requireUser(request);
  if (!result.ok) return result;
  if (result.session.role !== "admin") {
    return {
      ok: false,
      response: Response.json(
        { error: "Forbidden: admin role required" },
        { status: 403 }
      ),
    };
  }
  return result;
}
