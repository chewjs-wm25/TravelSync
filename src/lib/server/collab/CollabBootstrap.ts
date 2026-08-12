import * as TripRepo from "@/src/lib/db/repositories/collab/TripRepo";
import * as ItineraryRepo from "@/src/lib/db/repositories/collab/ItineraryRepo";
import * as ItemRepo from "@/src/lib/db/repositories/collab/ItemRepo";
import * as CollaboratorRepo from "@/src/lib/db/repositories/collab/CollaboratorRepo";
import * as InviteRepo from "@/src/lib/db/repositories/collab/InviteRepo";
import * as MessageRepo from "@/src/lib/db/repositories/collab/MessageRepo";
import * as ActivityLogRepo from "@/src/lib/db/repositories/collab/ActivityLogRepo";
import {
  mapActivity,
  mapChat,
  mapInvite,
  mapItem,
  mapMember,
} from "./ReplyMapper";
import type { CollabTrip } from "@/src/store/collab/CollabStore";

export interface BootstrapOutput {
  trip: CollabTrip;
  meUserId: string;
}

function formatDates(start: string | null, end: string | null): string {
  const s = start ?? "";
  const e = end ?? "";
  const sDate = s ? new Date(s + "T00:00:00") : null;
  const eDate = e ? new Date(e + "T00:00:00") : null;
  if (!sDate) return "";
  const sStr = sDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const eStr = eDate
    ? eDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  return sStr === eStr || !e ? `${sStr}, ${sDate.getFullYear()}` : `${sStr}-${eStr}`;
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
      id: trip.TripID,
      name: trip.TripName,
      dates: formatDates(trip.StartDate, trip.EndDate),
      region: trip.Region ?? "",
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