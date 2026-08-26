import * as TripRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/TripRepo";
import * as ItineraryRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItineraryRepo";
import * as ItemRepo from "@/data_access_layer/05_Collaboration_&_Shared_Planning/ItemRepo";
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
  const trip = await TripRepo.findTripById(tripId);
  if (!trip) throw new Error("Trip not found");

  // Update last_seen for the current user (heartbeat for online status)
  await CollaboratorRepo.updateLastSeen(tripId, meUserId);

  const [itineraries, members, invites, chats, activity] = await Promise.all([
    ItineraryRepo.findByTrip(tripId),
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

  const items = await ItemRepo.findByItinerary(itineraries.map((i) => i.ItineraryID));

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