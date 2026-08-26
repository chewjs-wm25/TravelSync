import { getCollaborationTripData, type CollaborationItinerary } from "@/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/tripService";
import * as TripRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";
import * as LegacyItineraryRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItineraryRepo";
import * as LegacyItemRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
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
import type { CollabTrip, ItineraryItem } from "@/api_layer/05_Collaboration_&_Shared_Planning/types";

export interface BootstrapOutput {
  trip: CollabTrip;
  meUserId: string;
}

/** 将 Module 02 CollaborationItinerary[] 展平为 Module 05 ItineraryItem[]，day 由 itinerary 顺序推导 */
function flattenItineraries(itineraries: CollaborationItinerary[]): ItineraryItem[] {
  const items: ItineraryItem[] = [];
  itineraries.forEach((it, idx) => {
    const day = idx + 1;
    for (const ci of it.items) {
      items.push({
        itemId: ci.itemId,
        placeId: ci.placeId ?? null,
        name: ci.name,
        day: ci.day ?? day,
        note: ci.note,
        lat: ci.lat ?? null,
        lon: ci.lon ?? null,
      });
    }
  });
  return items;
}

/** 从 Module 05 自有表读取（fallback，当 Module 02 表无数据时使用） */
async function loadFallbackTrip(tripId: string, meUserId: string): Promise<BootstrapOutput> {
  const trip = await TripRepo.findTripById(tripId);
  if (!trip) throw new Error("Trip not found");

  await CollaboratorRepo.updateLastSeen(tripId, meUserId);

  const [itineraries, members, invites, chats, activity] = await Promise.all([
    LegacyItineraryRepo.findByTrip(tripId),
    CollaboratorRepo.findByTrip(tripId),
    InviteRepo.findByTrip(tripId),
    MessageRepo.findByTrip(tripId),
    ActivityLogRepo.findByTrip(tripId),
  ]);

  const itineraryDayMap: Record<string, number> = {};
  itineraries.forEach((it, idx) => {
    const dayMatch = /^day\s*(\d+)/i.exec(it.Title ?? "");
    itineraryDayMap[it.ItineraryID] = dayMatch ? Number(dayMatch[1]) : idx + 1;
  });

  const items = await LegacyItemRepo.findByItinerary(itineraries.map((i) => i.ItineraryID));

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

/**
 * 组装前端 CollabTrip。
 * 优先从 Module 02 读取行程数据；若 Module 02 表无数据则 fallback 到 Module 05 自有表。
 */
export async function loadBootstrap(
  db: D1Database,
  tripId: string,
  meUserId: string
): Promise<BootstrapOutput> {
  // 优先尝试 Module 02
  try {
    const collabData = await getCollaborationTripData(db, tripId);

    await CollaboratorRepo.updateLastSeen(tripId, meUserId);

    const [members, invites, chats, activity] = await Promise.all([
      CollaboratorRepo.findByTrip(tripId),
      InviteRepo.findByTrip(tripId),
      MessageRepo.findByTrip(tripId),
      ActivityLogRepo.findByTrip(tripId),
    ]);

    return {
      meUserId,
      trip: {
        tripId: collabData.tripId,
        tripName: collabData.tripName,
        startDate: collabData.startDate ?? null,
        endDate: collabData.endDate ?? null,
        region: undefined,
        members: members.map(mapMember),
        invites: invites.map(mapInvite),
        items: flattenItineraries(collabData.itineraries),
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
  } catch {
    // Module 02 表无数据，fallback 到 Module 05 自有表
    return loadFallbackTrip(tripId, meUserId);
  }
}