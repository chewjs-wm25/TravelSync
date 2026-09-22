import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AuthService } from "../../../business_logic_layer/01_User_&_Account_Management";
import { ensureAccountSchema } from "../../../data_access_layer/01_User_&_Account_Management/AccountSchema";
import {
  buildGoogleAuthUrl,
  exchangeGoogleAuthCode,
  fetchGoogleUserProfile,
} from "../../../api_layer/01_User_&_Account_Management/GoogleOAuthApi";

async function authService(): Promise<AuthService> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { TEST_DB?: D1Database }).TEST_DB;
  if (!db) throw new Error("D1 binding TEST_DB is required");
  await ensureAccountSchema(db);
  return new AuthService(db);
}

function tokenFrom(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  const cookie = request.headers.get("cookie")?.match(/(?:^|; )travelsync_session=([^;]+)/)?.[1];
  return cookie ? decodeURIComponent(cookie) : null;
}

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Request failed";
  const status =
    message === "Unauthorized"
      ? 401
      : message === "Forbidden"
      ? 403
      : message.includes("Too many login attempts")
      ? 429
      : 400;
  return Response.json({ error: message, success: false }, { status });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const action = new URL(request.url).searchParams.get("action");
    const input = (await request.json()) as Record<string, unknown>;
    const service = await authService();
    const token = tokenFrom(request);

    if (action === "login") {
      const result = await service.login({
        identifier: String(input.identifier ?? ""),
        password: String(input.password ?? ""),
        rememberMe: input.rememberMe === true,
        ipAddress: request.headers.get("x-forwarded-for"),
      });
      const maxAge = Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000);
      return Response.json(
        { success: true, user: result.user },
        {
          headers: {
            "Set-Cookie": `travelsync_session=${encodeURIComponent(
              result.token
            )}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`,
          },
        }
      );
    }

    if (action === "register") {
      const result = await service.register({
        username: String(input.username ?? ""),
        fullName: String(input.fullName ?? ""),
        email: input.email ? String(input.email) : undefined,
        phone: input.phone ? String(input.phone) : undefined,
        icNumber: input.icNumber ? String(input.icNumber) : undefined,
        password: String(input.password ?? ""),
        acceptTerms: input.acceptTerms === true,
      });

      const headers: Record<string, string> = {};
      if (result.sessionToken && result.expiresAt) {
        const maxAge = Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000);
        headers["Set-Cookie"] = `travelsync_session=${encodeURIComponent(
          result.sessionToken
        )}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
      }

      return Response.json(
        {
          success: true,
          user: result.user,
          verificationUrl: null,
          message: "Account created successfully.",
        },
        { status: 201, headers }
      );
    }

    if (action === "logout") {
      if (token) await service.logout(token);
      return Response.json(
        { success: true },
        {
          headers: {
            "Set-Cookie": "travelsync_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
          },
        }
      );
    }

    if (action === "forgot-password") {
      await service.forgotPassword(String(input.email ?? ""));
      return Response.json({
        success: true,
        message: "If the account exists, a reset email has been sent.",
      });
    }

    if (action === "reset-password") {
      const resetToken = String(input.token ?? "");
      const newPassword = String(input.newPassword ?? "");
      if (!resetToken) throw new Error("Reset token is required.");
      await service.resetPassword(resetToken, newPassword);
      return Response.json({
        success: true,
        message: "Password reset successfully. You can now sign in.",
      });
    }

    if (action === "password") {
      if (!token) throw new Error("Unauthorized");
      await service.changePassword(
        token,
        String(input.currentPassword ?? ""),
        String(input.newPassword ?? "")
      );
      return Response.json({ success: true, message: "Password updated successfully." });
    }

    if (action === "delete-account") {
      if (!token) throw new Error("Unauthorized");
      await service.deleteAccount(
        token,
        String(input.password ?? input.confirmation ?? "")
      );
      return Response.json(
        { success: true },
        {
          headers: {
            "Set-Cookie": "travelsync_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
          },
        }
      );
    }

    if (action === "delete-test-account") {
      await service.deleteTestAccount(
        String(input.identifier ?? ""),
        String(input.password ?? "")
      );
      return Response.json({ success: true, message: "Test account deleted." });
    }

    if (action === "profile") {
      if (!token) throw new Error("Unauthorized");
      const user = await service.updateProfile(
        token,
        String(input.fullName ?? ""),
        input.phone ? String(input.phone) : null,
        input.profilePicture ? String(input.profilePicture) : null
      );
      return Response.json({ success: true, user, message: "Profile updated successfully." });
    }

    if (action === "settings") {
      if (!token) throw new Error("Unauthorized");
      await service.updateSettings(token, {
        notificationsEnabled: input.notificationsEnabled === true,
        language: String(input.language ?? "en"),
        theme: input.theme === "dark" ? "dark" : "light",
        privacyLevel:
          input.privacyLevel === "public" || input.privacyLevel === "contacts"
            ? input.privacyLevel
            : "private",
      });
      return Response.json({ success: true, message: "Settings saved." });
    }

    if (action === "verify-email") {
      const verificationToken = new URL(request.url).searchParams.get("token");
      if (!verificationToken) throw new Error("Verification token is required");
      await service.verifyEmail(verificationToken);
      return Response.json({ success: true, message: "Email verified. You can sign in now." });
    }

    throw new Error("Unknown account action");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const action = new URL(request.url).searchParams.get("action");
    if (action === "google") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const origin = new URL(request.url).origin;
      const redirectUri =
        process.env.GOOGLE_REDIRECT_URI ||
        `${origin}/01_User_&_Account_Management/account-actions?action=google-callback`;

      if (!clientId) {
        return Response.redirect(
          `${origin}/01_User_&_Account_Management?error=${encodeURIComponent(
            "Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the server environment."
          )}`,
          302
        );
      }

      const authUrl = buildGoogleAuthUrl({
        clientId,
        redirectUri,
      });
      return Response.redirect(authUrl, 302);
    }

    if (action === "google-callback") {
      const origin = new URL(request.url).origin;
      const searchParams = new URL(request.url).searchParams;
      const oauthError = searchParams.get("error");
      if (oauthError) {
        const errorDesc = searchParams.get("error_description") || oauthError;
        return Response.redirect(
          `${origin}/01_User_&_Account_Management?error=${encodeURIComponent(errorDesc)}`,
          302
        );
      }

      const code = searchParams.get("code");
      if (!code) {
        return Response.redirect(
          `${origin}/01_User_&_Account_Management?error=${encodeURIComponent(
            "Authorization code missing from Google callback."
          )}`,
          302
        );
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri =
        process.env.GOOGLE_REDIRECT_URI ||
        `${origin}/01_User_&_Account_Management/account-actions?action=google-callback`;

      if (!clientId || !clientSecret) {
        return Response.redirect(
          `${origin}/01_User_&_Account_Management?error=${encodeURIComponent(
            "Google OAuth configuration is incomplete (missing client ID or secret)."
          )}`,
          302
        );
      }

      try {
        const tokenData = await exchangeGoogleAuthCode({
          code,
          clientId,
          clientSecret,
          redirectUri,
        });

        const profile = await fetchGoogleUserProfile(tokenData.access_token);
        const service = await authService();
        const result = await service.loginWithGoogle(
          profile,
          request.headers.get("x-forwarded-for")
        );

        const maxAge = Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000);
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${origin}/01_User_&_Account_Management`,
            "Set-Cookie": `travelsync_session=${encodeURIComponent(
              result.token
            )}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to authenticate with Google.";
        return Response.redirect(
          `${origin}/01_User_&_Account_Management?error=${encodeURIComponent(message)}`,
          302
        );
      }
    }
    if (action === "verify-email") {
      const verificationToken = new URL(request.url).searchParams.get("token");
      if (!verificationToken) throw new Error("Verification token is required");
      await (await authService()).verifyEmail(verificationToken);
      return new Response("Email verified. You can return to TravelSync and sign in.", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const token = tokenFrom(request);
    if (!token) throw new Error("Unauthorized");

    if (action === "settings") {
      const settings = await (await authService()).getSettings(token);
      return Response.json({ success: true, settings });
    }

    return Response.json({ user: await (await authService()).currentUser(token) });
  } catch (error) {
    return errorResponse(error);
  }
}
