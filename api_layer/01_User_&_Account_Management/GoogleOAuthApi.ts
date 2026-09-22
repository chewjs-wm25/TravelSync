export interface GoogleUserProfile {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email: string;
  email_verified?: boolean;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
  refresh_token?: string;
}

/**
 * Builds the Google OAuth 2.0 authorization URL.
 */
export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state?: string;
  prompt?: string;
}): string {
  const searchParams = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: params.prompt ?? "select_account",
  });
  if (params.state) {
    searchParams.set("state", params.state);
  }
  return `https://accounts.google.com/o/oauth2/v2/auth?${searchParams.toString()}`;
}

/**
 * Exchanges the Google authorization code for access tokens via standard POST request.
 */
export async function exchangeGoogleAuthCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok || !data.access_token) {
    const errorMsg =
      typeof data.error_description === "string"
        ? data.error_description
        : typeof data.error === "string"
        ? data.error
        : "Failed to exchange Google authorization code";
    throw new Error(errorMsg);
  }

  return data as unknown as GoogleTokenResponse;
}

/**
 * Fetches user profile from Google's OpenID Connect userinfo endpoint.
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google user profile");
  }

  const profile = (await response.json()) as GoogleUserProfile;
  if (!profile.email) {
    throw new Error("Google account does not provide an email address.");
  }
  return profile;
}
