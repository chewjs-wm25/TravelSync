/**
 * Real email delivery via EmailJS REST API (free tier, no library, no credit
 * card). Pure client-side fetch — no npm dependency required.
 *
 * Fill in SERVICE_ID / TEMPLATE_ID / PUBLIC_KEY from emailjs.com.
 * The template's "To Email" field MUST be set to {{to_email}} so invites go
 * to the actual invitee instead of a hardcoded address.
 */
export const EMAILJS_SERVICE_ID = "service_l86ctud";
export const EMAILJS_TEMPLATE_ID = "template_5tpg5iv";
export const EMAILJS_PUBLIC_KEY = "KFDQW-YayjhSVPWbT";

const SEND_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

export interface InviteEmailPayload {
  inviteeEmail: string;
  role: string;
  tripName: string;
  inviteLink: string;
  invitedBy: string;
  expiresInDays: number;
}

export type EmailResult = { ok: boolean; message: string };

/** True once the EmailJS credentials are configured for real delivery. */
export function isEmailConfigured(): boolean {
  return Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID);
}

/**
 * Send a trip invitation email to the invitee. Returns ok:false (with a
 * readable reason) on failure so the UI can surface the problem instead of
 * silently dropping it.
 */
export async function sendInviteEmail(
  payload: InviteEmailPayload
): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    return {
      ok: false,
      message:
        "Email service not configured yet (missing Service / Template ID).",
    };
  }

  try {
    const res = await fetch(SEND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: payload.inviteeEmail,
          name: payload.invitedBy,
          time: new Date().toLocaleString("en-MY"),
          message:
            `${payload.invitedBy} has invited you to join "${payload.tripName}" ` +
            `as ${payload.role}. The invitation link is: ${payload.inviteLink} ` +
            `(valid for ${payload.expiresInDays} days).`,
          role: payload.role,
          trip_name: payload.tripName,
          invite_link: payload.inviteLink,
          invited_by: payload.invitedBy,
          expires_in: payload.expiresInDays,
        },
      }),
    });

    if (res.ok) {
      return { ok: true, message: `Invitation email sent to ${payload.inviteeEmail}.` };
    }

    let detail = "";
    try {
      detail = await res.text();
    } catch {
      detail = "";
    }
    return {
      ok: false,
      message:
        `Email service rejected the request (HTTP ${res.status}).` +
        (detail ? ` ${detail.slice(0, 160)}` : ""),
    };
  } catch {
    return { ok: false, message: "Network error — email not delivered." };
  }
}