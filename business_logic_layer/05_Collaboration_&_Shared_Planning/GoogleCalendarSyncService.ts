/**
 * Business Logic Layer: 负责将行程数据（CollabTrip）转换为符合 Google Calendar 规范的事件模型，
 * 并处理时区计算、日程分时段排期与批量同步调度。
 */

import {
  insertGoogleCalendarEvent,
  buildGoogleCalendarWebIntentUrl,
  type GoogleCalendarEventPayload,
} from "@/api_layer/05_Collaboration_&_Shared_Planning/GoogleCalendarApi";
import type { CollabTrip, ItineraryItem } from "@/api_layer/05_Collaboration_&_Shared_Planning/types";

// 默认 Google Client ID，优先采用环境变量或配置
export const GOOGLE_CALENDAR_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "1027473678070-2r0m2qlvttlk6fnsmui7mfpc0jcv1q8e.apps.googleusercontent.com";

export const MALAYSIA_TIMEZONE = "Asia/Kuala_Lumpur";

export interface SyncProgressCallback {
  (current: number, total: number, currentItemName?: string): void;
}

export interface SyncTripResult {
  success: boolean;
  syncedCount: number;
  totalCount: number;
  errors: string[];
}

/**
 * 将 YYYY-MM-DD 加上指定天数（天数从 1 起算：day 1 = +0 天）
 */
function addDays(baseDateStr: string, daysToAdd: number): string {
  const [y, m, d] = baseDateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + daysToAdd);
  const resY = date.getFullYear();
  const resM = String(date.getMonth() + 1).padStart(2, "0");
  const resD = String(date.getDate()).padStart(2, "0");
  return `${resY}-${resM}-${resD}`;
}

/**
 * 将行程项转换为 Google Calendar 事件对象
 * 自动将同一天的景点错峰排期（如 09:00 - 11:00, 11:30 - 13:30），并指定马来西亚时区（UTC+8）。
 */
export function convertTripToGoogleCalendarEvents(trip: CollabTrip): GoogleCalendarEventPayload[] {
  const events: GoogleCalendarEventPayload[] = [];
  const baseStartDate = trip.startDate || new Date().toISOString().split("T")[0];

  // 1. 生成整体行程的综述全天事件
  events.push({
    summary: `✈️ Trip: ${trip.tripName}`,
    description: `Trip Itinerary for ${trip.tripName}.\n${trip.tripNote ? `Note: ${trip.tripNote}\n` : ""}Region: ${trip.region || "Malaysia"}\nManaged with TravelSync`,
    location: trip.region ? `${trip.region}, Malaysia` : "Malaysia",
    start: {
      date: baseStartDate,
    },
    end: {
      date: trip.endDate ? addDays(trip.endDate, 1) : addDays(baseStartDate, 1),
    },
  });

  // 2. 按天分组并转换每个具体行程地点
  const dayGroups = new Map<number, ItineraryItem[]>();
  for (const item of trip.items || []) {
    const list = dayGroups.get(item.day) || [];
    list.push(item);
    dayGroups.set(item.day, list);
  }

  for (const [dayNum, items] of dayGroups.entries()) {
    const itemDateStr = addDays(baseStartDate, Math.max(0, dayNum - 1));

    items.forEach((item, idx) => {
      // 默认从早晨 09:00 开始排期，每个景点预留 2 小时，间隔 30 分钟
      const startHour = Math.min(9 + Math.floor(idx * 2.5), 21);
      const startMinute = (idx * 30) % 60;
      const endHour = Math.min(startHour + 2, 23);
      const endMinute = startMinute;

      const pad = (n: number) => String(n).padStart(2, "0");
      const startDateTime = `${itemDateStr}T${pad(startHour)}:${pad(startMinute)}:00+08:00`;
      const endDateTime = `${itemDateStr}T${pad(endHour)}:${pad(endMinute)}:00+08:00`;

      events.push({
        summary: `📍 ${item.name}`,
        description: `${item.note ? `Notes: ${item.note}\n\n` : ""}Day ${item.day} - ${trip.tripName}\nManaged via TravelSync`,
        location: `${item.name}${trip.region ? `, ${trip.region}, Malaysia` : ", Malaysia"}`,
        start: {
          dateTime: startDateTime,
          timeZone: MALAYSIA_TIMEZONE,
        },
        end: {
          dateTime: endDateTime,
          timeZone: MALAYSIA_TIMEZONE,
        },
      });
    });
  }

  return events;
}

/**
 * 动态引入 Google Identity Services (GIS) 脚本并获取用户授权的 Access Token
 * 遵循轻量原则：无需加装任何三方 npm 库，前端纯原生接入。
 */
export async function requestGoogleCalendarAccessToken(
  clientId = GOOGLE_CALENDAR_CLIENT_ID
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Google Calendar authentication requires browser environment");
  }

  // 1. 确保已加载 Google Identity Services 脚本
  await ensureGoogleGsiLoaded();

  return new Promise((resolve, reject) => {
    try {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        return reject(new Error("Google Identity Services failed to initialize."));
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/calendar.events",
        callback: (resp: any) => {
          if (resp && resp.access_token) {
            resolve(resp.access_token);
          } else if (resp && resp.error) {
            reject(new Error(resp.error_description || resp.error || "User declined Google authorization"));
          } else {
            reject(new Error("Failed to obtain Google access token"));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || "Google OAuth initialization error"));
        },
      });

      client.requestAccessToken({ prompt: "consent" });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

function ensureGoogleGsiLoaded(): Promise<void> {
  return new Promise((resolve, reject) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }

    const SCRIPT_ID = "google-gsi-client-script";
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity script")));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services SDK"));
    document.head.appendChild(script);
  });
}

/**
 * 调度将整条行程同步写入 Google Calendar
 */
export async function syncTripToGoogleCalendar(
  accessToken: string,
  trip: CollabTrip,
  onProgress?: SyncProgressCallback
): Promise<SyncTripResult> {
  const events = convertTripToGoogleCalendarEvents(trip);
  const total = events.length;
  let synced = 0;
  const errors: string[] = [];

  for (let i = 0; i < total; i++) {
    const ev = events[i];
    if (onProgress) {
      onProgress(i + 1, total, ev.summary);
    }

    const res = await insertGoogleCalendarEvent(accessToken, ev);
    if (res.success) {
      synced++;
    } else {
      errors.push(`${ev.summary}: ${res.error || "Unknown error"}`);
    }

    // 微延迟避免瞬间触发 Google API rate limiting
    if (i < total - 1) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  return {
    success: synced > 0,
    syncedCount: synced,
    totalCount: total,
    errors,
  };
}

/**
 * 生成全旅程的 Google Calendar Web 快捷添加链接
 */
export function getTripGoogleWebIntentUrl(trip: CollabTrip): string {
  const itemsText = (trip.items || [])
    .map((it) => `• Day ${it.day}: ${it.name}${it.note ? ` (${it.note})` : ""}`)
    .join("\n");

  const description = `${trip.tripNote ? `${trip.tripNote}\n\n` : ""}Itinerary:\n${itemsText || "No items planned yet."}\n\nPlanned via TravelSync`;

  return buildGoogleCalendarWebIntentUrl({
    summary: `✈️ ${trip.tripName}`,
    description,
    location: trip.region ? `${trip.region}, Malaysia` : "Malaysia",
    startDate: trip.startDate || undefined,
    endDate: trip.endDate || undefined,
  });
}

/**
 * 生成单个行程景点的 Google Calendar Web 快捷添加链接
 */
export function getItemGoogleWebIntentUrl(item: ItineraryItem, trip: CollabTrip): string {
  const baseStartDate = trip.startDate || new Date().toISOString().split("T")[0];
  const itemDateStr = addDays(baseStartDate, Math.max(0, item.day - 1));

  return buildGoogleCalendarWebIntentUrl({
    summary: `📍 ${item.name} (Day ${item.day})`,
    description: `${item.note ? `Note: ${item.note}\n\n` : ""}Trip: ${trip.tripName}\nDay ${item.day}\nPlanned via TravelSync`,
    location: `${item.name}${trip.region ? `, ${trip.region}, Malaysia` : ", Malaysia"}`,
    startDate: itemDateStr,
    endDate: itemDateStr,
  });
}
