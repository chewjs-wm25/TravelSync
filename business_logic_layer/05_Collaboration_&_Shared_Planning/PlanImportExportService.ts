import type {
  CollabTrip,
  ExportedTripPlan,
  ExportedItineraryDay,
  ExportedTripItem,
  ImportTripPayload,
} from "@/api_layer/05_Collaboration_&_Shared_Planning/types";
import * as TripRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";
import * as ItineraryRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItineraryRepo";
import * as ItemRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
import type { ItemRow } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
import * as ShareKeyRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ShareKeyRepo";
import { getDB } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/db";

/**
 * 将 CollabTrip 及日程列表序列化为标准 TravelSync 导出结构
 */
export function generateTripExportJSON(
  trip: CollabTrip,
  detailedDays?: ExportedItineraryDay[]
): ExportedTripPlan {
  let itineraries: ExportedItineraryDay[] = [];

  if (detailedDays && detailedDays.length > 0) {
    itineraries = detailedDays;
  } else if (trip.items && trip.items.length > 0) {
    // 根据 item.day 进行分组
    const dayMap = new Map<number, ExportedTripItem[]>();
    for (const item of trip.items) {
      const dayNum = item.day || 1;
      const list = dayMap.get(dayNum) ?? [];
      list.push({
        itemId: item.itemId,
        name: item.name,
        note: item.note ?? null,
        lat: item.lat ?? null,
        lon: item.lon ?? null,
        referenceId: item.placeId ?? null,
        type: "attraction",
      });
      dayMap.set(dayNum, list);
    }

    const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b);
    itineraries = sortedDays.map((dayNum) => {
      let dateStr = "";
      if (trip.startDate) {
        const d = new Date(trip.startDate + "T00:00:00");
        d.setDate(d.getDate() + dayNum - 1);
        dateStr = d.toISOString().slice(0, 10);
      }
      return {
        title: `Day ${dayNum}`,
        date: dateStr,
        note: null,
        items: dayMap.get(dayNum) ?? [],
      };
    });
  }

  return {
    version: "1.0",
    app: "TravelSync",
    exportedAt: new Date().toISOString(),
    trip: {
      tripId: trip.tripId,
      tripName: trip.tripName,
      region: trip.region ?? null,
      startDate: trip.startDate ?? null,
      endDate: trip.endDate ?? null,
      itineraries,
    },
  };
}

/**
 * 序列化为格式化的 JSON 文本
 */
export function exportTripToJSONString(
  trip: CollabTrip,
  detailedDays?: ExportedItineraryDay[]
): string {
  const data = generateTripExportJSON(trip, detailedDays);
  return JSON.stringify(data, null, 2);
}

/**
 * 从数据库拉取完整行程及明细并打包为导出数据
 */
export async function getFullTripExportData(
  tripId: string,
  _userId?: string
): Promise<ExportedTripPlan> {
  const db = await getDB();
  const trip = await TripRepo.findTripById(tripId);

  let tripName = trip?.TripName || "Trip Plan";
  let startDate = trip?.StartDate || null;
  let endDate = trip?.EndDate || null;
  const region = trip?.Region || null;
  let tripNote = trip?.TripNote || null;
  let imageUrl: string | null = null;

  // 兜底查 module 02 trips
  if (!trip) {
    try {
      const src = await db
        .prepare(
          "SELECT trip_id, user_id, trip_name, start_date, end_date, trip_note, image_url FROM trips WHERE trip_id = ? LIMIT 1"
        )
        .bind(tripId)
        .first<{
          trip_id: string;
          user_id: string;
          trip_name: string;
          start_date: string | null;
          end_date: string | null;
          trip_note: string | null;
          image_url: string | null;
        }>();
      if (src) {
        tripName = src.trip_name || tripName;
        startDate = src.start_date ?? startDate;
        endDate = src.end_date ?? endDate;
        tripNote = src.trip_note ?? tripNote;
        imageUrl = src.image_url ?? null;
      }
    } catch {
      // ignore
    }
  }

  // 读取日程
  let itineraries = await ItineraryRepo.findByTrip(tripId);
  if (itineraries.length === 0) {
    try {
      const res = await db
        .prepare(
          "SELECT itinerary_id as ItineraryID, title as Title, date as Date, trip_id as TripID FROM itineraries WHERE trip_id = ? ORDER BY date ASC"
        )
        .bind(tripId)
        .all<{ ItineraryID: string; Title: string; Date: string | null; TripID: string }>();
      itineraries = (res.results ?? []) as unknown as typeof itineraries;
    } catch {
      // ignore
    }
  }

  // 读取每日 items
  const itinIds = itineraries.map((i) => i.ItineraryID);
  let items = await ItemRepo.findByItinerary(itinIds);
  if (items.length === 0 && itinIds.length > 0) {
    try {
      const placeholders = itinIds.map(() => "?").join(", ");
      const res = await db
        .prepare(
          `SELECT item_id as ItemID, item_name as ItemName, type as Type, reference_id as ReferenceID, destination as Destination, start_time as StartTime, end_time as EndTime, 'planned' as Status, itinerary_item_note as ItineraryNote, itinerary_id as ItineraryID, lat, lon, image_url as imageUrl FROM itinerary_items WHERE itinerary_id IN (${placeholders}) ORDER BY position ASC`
        )
        .bind(...itinIds)
        .all<ItemRow & { lat?: number; lon?: number; imageUrl?: string }>();
      items = (res.results ?? []) as unknown as ItemRow[];
    } catch {
      // ignore
    }
  }

  const itemMap = new Map<string, ExportedTripItem[]>();
  for (const item of items) {
    const raw = item as ItemRow & { lat?: number; lon?: number; imageUrl?: string };
    const list = itemMap.get(item.ItineraryID) ?? [];
    list.push({
      itemId: item.ItemID,
      name: item.ItemName,
      type: item.Type || "attraction",
      destination: item.Destination ?? null,
      note: item.ItineraryNote ?? null,
      startTime: item.StartTime ?? null,
      endTime: item.EndTime ?? null,
      lat: raw.lat ?? null,
      lon: raw.lon ?? null,
      imageUrl: raw.imageUrl ?? null,
      referenceId: item.ReferenceID ?? null,
    });
    itemMap.set(item.ItineraryID, list);
  }

  const exportDays: ExportedItineraryDay[] = itineraries.map((itin, idx) => ({
    itineraryId: itin.ItineraryID,
    title: itin.Title || `Day ${idx + 1}`,
    date: itin.Date || "",
    items: itemMap.get(itin.ItineraryID) ?? [],
  }));

  return {
    version: "1.0",
    app: "TravelSync",
    exportedAt: new Date().toISOString(),
    trip: {
      tripId,
      tripName,
      region,
      startDate,
      endDate,
      tripNote,
      imageUrl,
      itineraries: exportDays,
    },
  };
}

/**
 * 解析并校验输入的 JSON 文本，支持标准 TravelSync 格式及多种常见变体
 */
export function parseAndValidateTripPlan(
  jsonText: string
): { success: boolean; plan?: ImportTripPayload; error?: string } {
  if (!jsonText || typeof jsonText !== "string") {
    return { success: false, error: "Empty file content or invalid string format." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch (err) {
    return { success: false, error: "Invalid JSON format: " + (err instanceof Error ? err.message : "Parse failed") };
  }

  if (!raw || typeof raw !== "object") {
    return { success: false, error: "JSON root must be an object." };
  }

  const root = raw as Record<string, unknown>;

  // 1. 提取 Trip 级基础属性
  let tripName = "";
  let region: string | null = null;
  let startDate: string | null = null;
  let endDate: string | null = null;
  let tripNote: string | null = null;
  let imageUrl: string | null = null;

  const tripObj = (typeof root.trip === "object" && root.trip !== null) ? (root.trip as Record<string, unknown>) : root;

  if (typeof tripObj.tripName === "string" && tripObj.tripName.trim()) {
    tripName = tripObj.tripName.trim();
  } else if (typeof tripObj.trip_name === "string" && tripObj.trip_name.trim()) {
    tripName = tripObj.trip_name.trim();
  } else if (typeof tripObj.name === "string" && tripObj.name.trim()) {
    tripName = tripObj.name.trim();
  } else if (typeof tripObj.title === "string" && tripObj.title.trim()) {
    tripName = tripObj.title.trim();
  } else {
    tripName = "Imported Trip Plan";
  }

  if (typeof tripObj.region === "string") region = tripObj.region.trim() || null;
  if (typeof tripObj.startDate === "string") startDate = tripObj.startDate.trim() || null;
  else if (typeof tripObj.start_date === "string") startDate = tripObj.start_date.trim() || null;

  if (typeof tripObj.endDate === "string") endDate = tripObj.endDate.trim() || null;
  else if (typeof tripObj.end_date === "string") endDate = tripObj.end_date.trim() || null;

  if (typeof tripObj.tripNote === "string") tripNote = tripObj.tripNote.trim() || null;
  else if (typeof tripObj.trip_note === "string") tripNote = tripObj.trip_note.trim() || null;
  else if (typeof tripObj.note === "string") tripNote = tripObj.note.trim() || null;

  if (typeof tripObj.imageUrl === "string") imageUrl = tripObj.imageUrl.trim() || null;
  else if (typeof tripObj.image_url === "string") imageUrl = tripObj.image_url.trim() || null;

  // 2. 提取并结构化 Itineraries / Days
  const itineraries: ImportTripPayload["itineraries"] = [];

  const rawItineraries = tripObj.itineraries || tripObj.days || tripObj.itinerary;
  const rawItems = tripObj.items || root.items;

  if (Array.isArray(rawItineraries) && rawItineraries.length > 0) {
    // 结构化多日格式
    rawItineraries.forEach((dayRaw, idx) => {
      if (typeof dayRaw !== "object" || dayRaw === null) return;
      const dObj = dayRaw as Record<string, unknown>;
      const title =
        (typeof dObj.title === "string" && dObj.title.trim()) ||
        (typeof dObj.dayTitle === "string" && dObj.dayTitle.trim()) ||
        `Day ${idx + 1}`;

      const date =
        (typeof dObj.date === "string" && dObj.date.trim()) ||
        (startDate ? addDays(startDate, idx) : "");

      const note =
        (typeof dObj.note === "string" && dObj.note.trim()) ||
        (typeof dObj.itinerary_note === "string" && dObj.itinerary_note.trim()) ||
        null;

      const dayItems: ExportedTripItem[] = [];
      const itemsList = dObj.items || dObj.places || dObj.activities;

      if (Array.isArray(itemsList)) {
        itemsList.forEach((itemRaw, pos) => {
          const item = sanitizeItem(itemRaw, pos + 1);
          if (item) dayItems.push(item);
        });
      }

      itineraries.push({
        title,
        date,
        note,
        items: dayItems,
      });
    });
  } else if (Array.isArray(rawItems) && rawItems.length > 0) {
    // 平铺明细格式（包含 day 编号）
    const dayGroups = new Map<number, ExportedTripItem[]>();

    rawItems.forEach((itemRaw, pos) => {
      if (typeof itemRaw !== "object" || itemRaw === null) return;
      const iObj = itemRaw as Record<string, unknown>;
      const dayNum = Number(iObj.day) || 1;
      const item = sanitizeItem(itemRaw, pos + 1);
      if (item) {
        const group = dayGroups.get(dayNum) ?? [];
        group.push(item);
        dayGroups.set(dayNum, group);
      }
    });

    const dayKeys = Array.from(dayGroups.keys()).sort((a, b) => a - b);
    if (dayKeys.length === 0) dayKeys.push(1);

    dayKeys.forEach((dNum, idx) => {
      itineraries.push({
        title: `Day ${dNum}`,
        date: startDate ? addDays(startDate, idx) : "",
        note: null,
        items: dayGroups.get(dNum) ?? [],
      });
    });
  } else {
    // 既无 itineraries 也无 items，生成一个初始 Day 1
    itineraries.push({
      title: "Day 1",
      date: startDate || new Date().toISOString().slice(0, 10),
      note: null,
      items: [],
    });
  }

  // 若 startDate / endDate 缺失，尝试从日程中推导
  if (!startDate && itineraries.length > 0 && itineraries[0].date) {
    startDate = itineraries[0].date;
  }
  if (!endDate && itineraries.length > 0 && itineraries[itineraries.length - 1].date) {
    endDate = itineraries[itineraries.length - 1].date;
  }

  const payload: ImportTripPayload = {
    tripName,
    region,
    startDate,
    endDate,
    tripNote,
    imageUrl,
    isShared: false,
    itineraries,
  };

  return { success: true, plan: payload };
}

function sanitizeItem(raw: unknown, defaultPosition: number): ExportedTripItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const name =
    (typeof obj.name === "string" && obj.name.trim()) ||
    (typeof obj.item_name === "string" && obj.item_name.trim()) ||
    (typeof obj.place === "string" && obj.place.trim()) ||
    (typeof obj.title === "string" && obj.title.trim());

  if (!name) return null;

  const validTypes = ["attraction", "restaurant", "hotel", "transport", "activity", "other"];
  let type = typeof obj.type === "string" ? obj.type.toLowerCase().trim() : "attraction";
  if (!validTypes.includes(type)) type = "attraction";

  const note =
    (typeof obj.note === "string" && obj.note.trim()) ||
    (typeof obj.itinerary_note === "string" && obj.itinerary_note.trim()) ||
    (typeof obj.itinerary_item_note === "string" && obj.itinerary_item_note.trim()) ||
    null;

  const destination = typeof obj.destination === "string" ? obj.destination.trim() || null : null;
  const startTime = typeof obj.startTime === "string" ? obj.startTime.trim() : typeof obj.start_time === "string" ? obj.start_time.trim() : null;
  const endTime = typeof obj.endTime === "string" ? obj.endTime.trim() : typeof obj.end_time === "string" ? obj.end_time.trim() : null;

  const lat = typeof obj.lat === "number" && !isNaN(obj.lat) ? obj.lat : null;
  const lon = typeof obj.lon === "number" && !isNaN(obj.lon) ? obj.lon : null;

  const imageUrl =
    typeof obj.imageUrl === "string" ? obj.imageUrl.trim() || null :
    typeof obj.image_url === "string" ? obj.image_url.trim() || null :
    typeof obj.image === "string" ? obj.image.trim() || null : null;

  const referenceId =
    typeof obj.referenceId === "string" ? obj.referenceId.trim() || null :
    typeof obj.reference_id === "string" ? obj.reference_id.trim() || null :
    typeof obj.placeId === "string" ? obj.placeId.trim() || null : null;

  return {
    name,
    type,
    note,
    destination,
    startTime,
    endTime,
    position: typeof obj.position === "number" ? obj.position : defaultPosition,
    lat,
    lon,
    imageUrl,
    referenceId,
  };
}

function addDays(baseDate: string, days: number): string {
  try {
    const parts = baseDate.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const utc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
      const dt = new Date(utc);
      dt.setUTCDate(dt.getUTCDate() + days);
      return dt.toISOString().slice(0, 10);
    }
  } catch {
    // ignore
  }
  return baseDate;
}

/**
 * 生成易读且不易混淆的专属分享 Key (格式: PLAN-XXXX-XXXX)
 */
function generateReadableKey(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 去除易混淆的 0, O, 1, I
  let p1 = "";
  let p2 = "";
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PLAN-${p1}-${p2}`;
}

/**
 * 净化用户输入的 Share Key（支持直接粘贴带 ?importKey= 的完整链接，或去除空格/引号并转大写）
 */
export function cleanShareKeyInput(rawInput: string): string {
  if (!rawInput || typeof rawInput !== "string") return "";
  let trimmed = rawInput.trim();

  // 若用户直接粘贴了完整 URL，如 http://.../05_Collaboration_&_Shared_Planning?importKey=PLAN-XXXX-XXXX
  if (trimmed.includes("importKey=")) {
    try {
      const u = new URL(trimmed.startsWith("http") ? trimmed : `https://example.com/${trimmed}`);
      const val = u.searchParams.get("importKey");
      if (val) trimmed = val.trim();
    } catch {
      const match = trimmed.match(/importKey=([A-Za-z0-9-_]+)/i);
      if (match && match[1]) trimmed = match[1];
    }
  }

  trimmed = trimmed.replace(/["'<>]/g, "");
  return trimmed.toUpperCase();
}

/**
 * 为指定行程生成或返回最新行程免文件分享码 (Share Key / Token)
 */
export async function createPlanShareKey(
  tripId: string,
  userId: string,
  expiresDays?: number
): Promise<{
  success: boolean;
  shareKey?: string;
  tripName?: string;
  createdAt?: string;
  expiresAt?: string | null;
  message?: string;
}> {
  if (!tripId) {
    return { success: false, message: "Missing tripId" };
  }

  try {
    // 1. 抓取该行程目前的完整标准化导出数据作为快照
    const exportData = await getFullTripExportData(tripId, userId);
    const tripName = exportData.trip.tripName || "Trip Plan";
    const planJson = JSON.stringify(exportData, null, 2);

    // 2. 检查是否已有活跃 Key（如果有，更新快照并复用，避免频繁生成多个碎片 Key）
    const existing = await ShareKeyRepo.findLatestByTrip(tripId, userId);
    let key = existing?.share_key;

    if (!key) {
      key = generateReadableKey();
    }

    let expiresAt: string | null = null;
    if (expiresDays && expiresDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + expiresDays);
      expiresAt = d.toISOString();
    }

    const saved = await ShareKeyRepo.insertShareKey({
      share_key: key,
      trip_id: tripId,
      trip_name: tripName,
      plan_json: planJson,
      created_by: userId,
      expires_at: expiresAt,
    });

    return {
      success: true,
      shareKey: saved.share_key,
      tripName: saved.trip_name,
      createdAt: saved.created_at,
      expiresAt: saved.expires_at,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create share key",
    };
  }
}

/**
 * 根据分享码提取并校验行程数据，供导入前预览或一键导入
 */
export async function getPlanByShareKey(
  keyOrUrl: string
): Promise<{
  success: boolean;
  shareKey?: string;
  tripName?: string;
  plan?: ImportTripPayload;
  exportedAt?: string;
  message?: string;
}> {
  const cleaned = cleanShareKeyInput(keyOrUrl);
  if (!cleaned) {
    return { success: false, message: "Please provide a valid Share Key or Link." };
  }

  try {
    const row = await ShareKeyRepo.findByKey(cleaned);
    if (!row) {
      return {
        success: false,
        message: `Share Key "${cleaned}" not found. Please verify the code.`,
      };
    }

    // 校验过期时间
    if (row.expires_at) {
      const exp = new Date(row.expires_at).getTime();
      if (Date.now() > exp) {
        return {
          success: false,
          message: `This Share Key has expired on ${row.expires_at.slice(0, 10)}.`,
        };
      }
    }

    // 解析 snapshot JSON
    const parsed = parseAndValidateTripPlan(row.plan_json);
    if (!parsed.success || !parsed.plan) {
      return {
        success: false,
        message: parsed.error || "Failed to parse trip plan for this key.",
      };
    }

    // 记录访问次数
    await ShareKeyRepo.incrementUsage(cleaned).catch(() => {});

    return {
      success: true,
      shareKey: row.share_key,
      tripName: row.trip_name,
      plan: parsed.plan,
      exportedAt: row.created_at,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to resolve share key",
    };
  }
}

