import * as TripRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";
import * as ItineraryRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItineraryRepo";
import * as ItemRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
import type { ItemRow } from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
import * as CollaboratorRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/CollaboratorRepo";
import * as InviteRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/InviteRepo";
import * as MessageRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/MessageRepo";
import * as ActivityLogRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ActivityLogRepo";
import {
  mapActivity,
  mapChat,
  mapInvite,
  mapItem,
  mapMember,
} from "./ReplyMapper";
import type { CollabTrip } from "@/api_layer/05_Collaboration_&_Shared_Planning/types";

export interface BootstrapOutput {
  trip: CollabTrip;
  meUserId: string;
}

/**
 * 组装前端 CollabTrip。所有读取只针对当前 active trip（固定 trip_langkawi，
 * 后续接入模块 02/多行程后改为 read activeTripId）。
 */
export async function loadBootstrap(
  tripId: string,
  meUserId: string
): Promise<BootstrapOutput> {
  let trip = await TripRepo.findTripById(tripId);
  // 私有 Trip（仅在 02 的 trips 表）首次打开时自动镜像到 05 的 Trip 表
  if (!trip) {
    try {
      const { getDB } = await import("@/data_access_layer/05_Collaboration_&_Shared_Planning/db");
      const db = await getDB();
      const src = await db
        .prepare("SELECT trip_id, trip_name, start_date, end_date, user_id, trip_note, image_url FROM trips WHERE trip_id = ? LIMIT 1")
        .bind(tripId)
        .first<{ trip_id: string; trip_name: string; start_date: string | null; end_date: string | null; user_id: string; trip_note: string | null; image_url: string | null }>();
      if (src) {
        trip = await TripRepo.insertTrip({
          TripID: src.trip_id,
          TripName: src.trip_name,
          StartDate: src.start_date,
          EndDate: src.end_date,
          Region: null,
          TripNote: src.trip_note ?? null,
          UserID: src.user_id,
        });
        // 确保 Owner 在 Collaborators（私有→共享的首次进入也视为已启用协作）
        try {
          await CollaboratorRepo.ensureOwner(tripId, src.user_id);
        } catch {}
      }
    } catch {}
  }
  if (!trip) throw new Error("Trip not found");

  // Update last_seen for the current user (heartbeat for online status)
  await CollaboratorRepo.updateLastSeen(tripId, meUserId).catch(() => {});

  let [itineraries, members, invites, chats, activity] = await Promise.all([
    ItineraryRepo.findByTrip(tripId),
    CollaboratorRepo.findByTrip(tripId),
    InviteRepo.findByTrip(tripId),
    MessageRepo.findByTrip(tripId),
    ActivityLogRepo.findByTrip(tripId),
  ]);

  // 若当前用户是 Owner 但尚无 Collaborator 行（私有首次打开），自动补 Owner 以保证页面 me 存在
  if (members.length === 0 && trip.UserID === meUserId) {
    try {
      await CollaboratorRepo.ensureOwner(tripId, meUserId);
      members = await CollaboratorRepo.findByTrip(tripId);
    } catch {}
  }

  // 若 05 的 Itinerary 为空，尝试回退读取 02 的 itineraries（trips 创建的行程，日程存于小写表）
  if (itineraries.length === 0) {
    try {
      const { getDB } = await import("@/data_access_layer/05_Collaboration_&_Shared_Planning/db");
      const db = await getDB();
      const res = await db
        .prepare("SELECT itinerary_id as ItineraryID, title as Title, date as Date, trip_id as TripID FROM itineraries WHERE trip_id = ? ORDER BY date ASC")
        .bind(tripId)
        .all<{ ItineraryID: string; Title: string; Date: string | null; TripID: string }>();
      const fallback = (res.results ?? []) as typeof itineraries;
      if (fallback.length > 0) {
        itineraries = fallback as unknown as typeof itineraries;
      }
    } catch {}
  }

  const itineraryDayMap: Record<string, number> = {};
  itineraries.forEach((it, idx) => {
    const dayMatch = /^day\s*(\d+)/i.exec(it.Title ?? "");
    itineraryDayMap[it.ItineraryID] = dayMatch ? Number(dayMatch[1]) : idx + 1;
  });

  let items = await ItemRepo.findByItinerary(itineraries.map((i) => i.ItineraryID));
  // 回退：05 的 Itinerary_Item 为空时，尝试从 02 的 itinerary_items 读取（字段映射）
  if (items.length === 0 && itineraries.length > 0) {
    try {
      const { getDB } = await import("@/data_access_layer/05_Collaboration_&_Shared_Planning/db");
      const db = await getDB();
      const ids = itineraries.map((i) => i.ItineraryID);
      const placeholders = ids.map(() => "?").join(", ");
      const res = await db
        .prepare(`SELECT item_id as ItemID, item_name as ItemName, type as Type, reference_id as ReferenceID, destination as Destination, start_time as StartTime, end_time as EndTime, 'planned' as Status, itinerary_item_note as ItineraryNote, itinerary_id as ItineraryID FROM itinerary_items WHERE itinerary_id IN (${placeholders})`)
        .bind(...ids)
        .all<ItemRow>();
      const fallback = (res.results ?? []) as unknown as ItemRow[];
      if (fallback.length > 0) items = fallback;
    } catch {}
  }

  return {
    meUserId,
    trip: {
      tripId: trip.TripID,
      tripName: trip.TripName,
      startDate: trip.StartDate ?? null,
      endDate: trip.EndDate ?? null,
      region: trip.Region ?? undefined,
      members: members.map(mapMember),
      invites: invites.map(mapInvite),
      items: items.map((row) => mapItem(row, itineraryDayMap)),
      comments: chats.map((row) =>
        mapChat(
          {
            id: row.id,
            user_id: row.user_id,
            username: row.username,
            profile_picture: row.profile_picture,
            text: row.text,
            created_at: row.created_at,
          },
          meUserId
        )
      ),
      activity: activity.map(mapActivity),
    },
  };
}