import {
  deleteTripById,
  insertTrip,
  listTripsByUser,
  updateTrip as updateTripInRepository,
  getTripById,
  type CreateTripInput,
  type TripRecord,
  type UpdateTripInput as TripRepositoryUpdateInput,
} from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripRepository";
import { createItinerary, getItinerariesByTripId } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";
import {
  hasMalaysiaBlocklistMatch,
  normalizeText,
} from "@/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/textValidation";
import { getItineraryItemsByItineraryId } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemRepository";
import { discoveryService } from "@/business_logic_layer/03_Destination_Discovery_&_Inspiration/DiscoveryService";

export const DEFAULT_USER_ID = "usr_demo";
const MAX_TRIP_NAME_LENGTH = 100;

// Centralize types in types.ts to avoid duplication and make Module 02's public types reusable.
import type {
  TripRouteData,
  ItineraryRouteData,
  RoutePlace,
  CollaborationTripData,
  CollaborationItinerary,
  CollaborationItem,
  UserInfo,
  StateInfo,
  PlaceInfo,
} from "./types";


export type TripServiceInput = {
  userId?: string | null;
  tripName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tripNote?: string | null;
  imageUrl?: string | null;
};

export type UpdateTripServiceInput = {
  tripId?: string | null;
  userId?: string | null;
  tripName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tripNote?: string | null;
  imageUrl?: string | null;
};

export type DeleteTripInput = {
  tripId?: string | null;
};

type TripServiceSuccess = {
  success: true;
  trip: TripRecord;
};

type TripServiceFailure = {
  success: false;
  status: number;
  message: string;
};

export type TripServiceResult = TripServiceSuccess | TripServiceFailure;

type DeleteTripSuccess = {
  success: true;
};

export type DeleteTripResult = DeleteTripSuccess | TripServiceFailure;

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateTripPayload(input: TripServiceInput):
  | { success: true; normalized: CreateTripInput }
  | TripServiceFailure {
  const tripName = normalizeText(input.tripName);
  const tripNote = normalizeText(input.tripNote);
  const imageUrl = normalizeText(input.imageUrl);
  const userId = normalizeText(input.userId) ?? DEFAULT_USER_ID;
  const startDate = normalizeText(input.startDate);
  const endDate = normalizeText(input.endDate);

  if (!tripName) {
    return {
      success: false,
      status: 400,
      message: "Trip name is required",
    };
  }

  if (tripName.length > MAX_TRIP_NAME_LENGTH) {
    return {
      success: false,
      status: 400,
      message: "Trip name must be 100 characters or fewer",
    };
  }

  if (startDate && !isValidIsoDate(startDate)) {
    return {
      success: false,
      status: 400,
      message: "Invalid Trip date",
    };
  }

  if (endDate && !isValidIsoDate(endDate)) {
    return {
      success: false,
      status: 400,
      message: "Invalid Trip date",
    };
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      success: false,
      status: 400,
      message: "Invalid Trip date",
    };
  }

  const malaysiaScopeText = [tripName, tripNote].filter(Boolean).join(" ");
  if (malaysiaScopeText && hasMalaysiaBlocklistMatch(malaysiaScopeText)) {
    return {
      success: false,
      status: 400,
      message: "Trip must stay within Malaysia",
    };
  }

  return {
    success: true,
    normalized: {
      userId,
      tripName,
      startDate,
      endDate,
      tripNote,
      imageUrl,
    },
  };
}

function validateUpdateTripPayload(
  input: UpdateTripServiceInput
):
  | { success: true; tripId: string; normalized: TripRepositoryUpdateInput }
  | TripServiceFailure {
  const tripId = normalizeText(input.tripId);

  if (!tripId) {
    return {
      success: false,
      status: 400,
      message: "Trip ID is required",
    };
  }

  const validation = validateTripPayload(input);
  if (!validation.success) {
    return validation;
  }

  return {
    success: true,
    tripId,
    normalized: {
      tripName: validation.normalized.tripName,
      startDate: validation.normalized.startDate,
      endDate: validation.normalized.endDate,
      tripNote: validation.normalized.tripNote,
      imageUrl: validation.normalized.imageUrl,
    },
  };
}

export async function createTrip(
  db: D1Database,
  input: TripServiceInput
): Promise<TripServiceResult> {
  const validation = validateTripPayload(input);

  if (!validation.success) {
    return validation;
  }

  const trip = await insertTrip(db, validation.normalized);

  // If both start and end dates are present, create one itinerary entry per day
  if (validation.normalized.startDate && validation.normalized.endDate) {
    const start = validation.normalized.startDate;
    const end = validation.normalized.endDate;

    // Parse as UTC dates to avoid timezone offset issues
    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);
    let current = Date.UTC(sy, sm - 1, sd);
    const endUtc = Date.UTC(ey, em - 1, ed);

    let dayIndex = 1;
    while (current <= endUtc) {
      const dateStr = new Date(current).toISOString().slice(0, 10);
      try {
        await createItinerary(db, {
          tripId: trip.trip_id,
          title: `Day ${dayIndex}`,
          date: dateStr,
          note: null,
        });
      } catch (err) {
        // If creating one day's itinerary fails, continue creating the rest
      }

      dayIndex += 1;
      current += 24 * 60 * 60 * 1000; // add one day
    }
  }

  return { success: true, trip };
}

export async function updateTrip(
  db: D1Database,
  input: UpdateTripServiceInput
): Promise<TripServiceResult> {
  const validation = validateUpdateTripPayload(input);

  if (!validation.success) {
    return validation;
  }

  const trip = await updateTripInRepository(
    db,
    validation.tripId,
    validation.normalized
  );

  if (!trip) {
    return {
      success: false,
      status: 404,
      message: "Trip not found",
    };
  }

  return {
    success: true,
    trip,
  };
}

export async function getTripsForUser(db: D1Database, userId?: string | null) {
  return listTripsByUser(db, normalizeText(userId) ?? DEFAULT_USER_ID);
}

/**
 * Assemble TripRouteData for module 04 consumption.
 */
export async function getTripRouteData(
  db: D1Database,
  tripId?: string | null
): Promise<TripRouteData> {
  const resolvedTripId = normalizeText(tripId);
  if (!resolvedTripId) {
    throw new Error("Trip ID is required");
  }

  const trip = await getTripById(db, resolvedTripId);
  if (!trip) {
    throw new Error("Trip not found");
  }

  const itineraries = await getItinerariesByTripId(db, resolvedTripId);
  const itineraryRouteData: ItineraryRouteData[] = [];

  for (const it of itineraries) {
    const items = await getItineraryItemsByItineraryId(db, it.itinerary_id);
    const places: RoutePlace[] = [];

    for (const item of items) {
      // Prefer stored lat/lon when available (imported items may carry coordinates)
      let lat = typeof (item as any).lat === 'number' && (item as any).lat !== null ? (item as any).lat as number : 0;
      let lon = typeof (item as any).lon === 'number' && (item as any).lon !== null ? (item as any).lon as number : 0;

      // If stored coords are not present, try discoveryService when reference_id exists
      if ((lat === 0 && lon === 0) && item.reference_id) {
        try {
          const detail = await discoveryService.getPlaceDetail(item.reference_id, "");
          if (detail && typeof (detail as any).lat === "number") {
            lat = (detail as any).lat as number;
          }
          if (detail && typeof (detail as any).lon === "number") {
            lon = (detail as any).lon as number;
          }
        } catch (e) {
          // fallback to zeros
        }
      }

      places.push({ id: item.item_id, name: item.item_name, lat, lon });
    }

    itineraryRouteData.push({
      itineraryId: it.itinerary_id,
      date: it.date,
      places,
    });
  }

  return {
    tripId: trip.trip_id,
    tripName: trip.trip_name,
    itineraries: itineraryRouteData,
  };
}

/**
 * Assemble CollaborationTripData for module 05 consumption.
 */
export async function getCollaborationTripData(
  db: D1Database,
  tripId?: string | null
): Promise<CollaborationTripData> {
  const resolvedTripId = normalizeText(tripId);
  if (!resolvedTripId) {
    throw new Error("Trip ID is required");
  }

  const trip = await getTripById(db, resolvedTripId);
  if (!trip) {
    throw new Error("Trip not found");
  }

  const itineraries = await getItinerariesByTripId(db, resolvedTripId);
  const collabItineraries: CollaborationItinerary[] = [];

  for (const it of itineraries) {
    const items = await getItineraryItemsByItineraryId(db, it.itinerary_id);

    const collabItems: CollaborationItem[] = items.map((item) => ({
      itemId: item.item_id,
      placeId: item.reference_id ?? null,
      name: item.item_name,
      day: undefined,
      note: item.itinerary_item_note ?? undefined,
      lat: typeof (item as any).lat === 'number' && (item as any).lat !== null ? (item as any).lat : undefined,
      lon: typeof (item as any).lon === 'number' && (item as any).lon !== null ? (item as any).lon : undefined,
    }));

    // Try to enrich lat/lon for items with reference_id if not already present
    for (const ci of collabItems) {
      if ((ci.lat === undefined || ci.lon === undefined) && ci.placeId) {
        try {
          const detail = await discoveryService.getPlaceDetail(ci.placeId, "");
          if (detail && typeof (detail as any).lat === "number" && (ci.lat === undefined)) {
            ci.lat = (detail as any).lat;
          }
          if (detail && typeof (detail as any).lon === "number" && (ci.lon === undefined)) {
            ci.lon = (detail as any).lon;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    collabItineraries.push({
      itineraryId: it.itinerary_id,
      date: it.date,
      title: it.title,
      items: collabItems,
    });
  }

  return {
    tripId: trip.trip_id,
    userId: trip.user_id,
    tripName: trip.trip_name,
    startDate: trip.start_date ?? null,
    endDate: trip.end_date ?? null,
    itineraries: collabItineraries,
  };
}

export async function deleteTrip(
  db: D1Database,
  input: DeleteTripInput
): Promise<DeleteTripResult> {
  const tripId = normalizeText(input.tripId);

  if (!tripId) {
    return {
      success: false,
      status: 400,
      message: "Trip ID is required",
    };
  }

  await deleteTripById(db, tripId);
  return { success: true };
}
