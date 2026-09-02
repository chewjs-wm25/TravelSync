/**
 * API Layer: 负责与外部 Google Calendar v3 REST API 进行通信。
 * 遵循项目架构约束：API Layer 专用于与外部三方系统通信，不包含 Route API。
 */

export interface GoogleCalendarDateOrDateTime {
  dateTime?: string; // ISO 8601 string, e.g. 2026-09-10T09:00:00+08:00
  date?: string;     // YYYY-MM-DD
  timeZone?: string; // "Asia/Kuala_Lumpur"
}

export interface GoogleCalendarEventPayload {
  summary: string;
  description?: string;
  location?: string;
  start: GoogleCalendarDateOrDateTime;
  end: GoogleCalendarDateOrDateTime;
}

export interface InsertEventResult {
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
}

export const GOOGLE_CALENDAR_BASE_URL = "https://www.googleapis.com/calendar/v3";

/**
 * 直接调用 Google Calendar REST API v3 往当前用户的 Primary 日历插入单个事件。
 */
export async function insertGoogleCalendarEvent(
  accessToken: string,
  event: GoogleCalendarEventPayload
): Promise<InsertEventResult> {
  try {
    const res = await fetch(`${GOOGLE_CALENDAR_BASE_URL}/calendars/primary/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const message =
        (errorBody as { error?: { message?: string } })?.error?.message ||
        `Google Calendar API returned status ${res.status}`;
      return { success: false, error: message };
    }

    const data = (await res.json()) as { id?: string; htmlLink?: string };
    return {
      success: true,
      eventId: data.id,
      htmlLink: data.htmlLink,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error calling Google Calendar API",
    };
  }
}

/**
 * 生成免登录授权的 Google Calendar Web 模板链接（Web Intent）。
 * 兜底保障：在用户未授权或 Google API 权限受限时，仍可通过该链接一键在网页版 Google 日历中保存。
 */
export function buildGoogleCalendarWebIntentUrl(params: {
  summary: string;
  description?: string;
  location?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}): string {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.summary);

  if (params.description) {
    url.searchParams.set("details", params.description);
  }
  if (params.location) {
    url.searchParams.set("location", params.location);
  }

  if (params.startDate) {
    const s = params.startDate.replace(/-/g, "");
    // Google Calendar 跨天事件结束日期为不包含当天（需 +1 天）
    let e = s;
    if (params.endDate) {
      try {
        const endDateObj = new Date(params.endDate + "T00:00:00");
        endDateObj.setDate(endDateObj.getDate() + 1);
        const y = endDateObj.getFullYear();
        const m = String(endDateObj.getMonth() + 1).padStart(2, "0");
        const d = String(endDateObj.getDate()).padStart(2, "0");
        e = `${y}${m}${d}`;
      } catch {
        e = params.endDate.replace(/-/g, "");
      }
    }
    url.searchParams.set("dates", `${s}/${e}`);
  }

  return url.toString();
}
