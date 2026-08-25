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

export type TripServiceInput = {
  userId?: string | null;
  tripName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tripNote?: string | null;
};

export type UpdateTripServiceInput = {
  tripId?: string | null;
  userId?: string | null;
  tripName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tripNote?: string | null;
};

export type DeleteTripInput = {
  tripId?: string | null;
};

type TripServiceSuccess = {
  ok: true;
  trip: TripRecord;
};

type TripServiceFailure = {
  ok: false;
  status: number;
  message: string;
};

export type TripServiceResult = TripServiceSuccess | TripServiceFailure;

type DeleteTripSuccess = {
  ok: true;
};

export type DeleteTripResult = DeleteTripSuccess | TripServiceFailure;

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateTripPayload(input: TripServiceInput):
  | { ok: true; normalized: CreateTripInput }
  | TripServiceFailure {
  const tripName = normalizeText(input.tripName);
  const tripNote = normalizeText(input.tripNote);
  const userId = normalizeText(input.userId) ?? DEFAULT_USER_ID;
  const startDate = normalizeText(input.startDate);
  const endDate = normalizeText(input.endDate);

  if (!tripName) {
    return {
      ok: false,
      status: 400,
      message: "Trip name is required",
    };
  }

  if (tripName.length > MAX_TRIP_NAME_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: "Trip name must be 100 characters or fewer",
    };
  }

  if (startDate && !isValidIsoDate(startDate)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid Trip date",
    };
  }

  if (endDate && !isValidIsoDate(endDate)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid Trip date",
    };
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      ok: false,
      status: 400,
      message: "Invalid Trip date",
    };
  }

  const malaysiaScopeText = [tripName, tripNote].filter(Boolean).join(" ");
  if (malaysiaScopeText && hasMalaysiaBlocklistMatch(malaysiaScopeText)) {
    return {
      ok: false,
      status: 400,
      message: "Trip must stay within Malaysia",
    };
  }

  return {
    ok: true,
    normalized: {
      userId,
      tripName,
      startDate,
      endDate,
      tripNote,
    },
  };
}

function validateUpdateTripPayload(
  input: UpdateTripServiceInput
):
  | { ok: true; tripId: string; normalized: TripRepositoryUpdateInput }
  | TripServiceFailure {
  const tripId = normalizeText(input.tripId);

  if (!tripId) {
    return {
      ok: false,
      status: 400,
      message: "Trip ID is required",
    };
  }

  const validation = validateTripPayload(input);
  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    tripId,
    normalized: {
      tripName: validation.normalized.tripName,
      startDate: validation.normalized.startDate,
      endDate: validation.normalized.endDate,
      tripNote: validation.normalized.tripNote,
    },
  };
}

export async function createTrip(
  db: D1Database,
  input: TripServiceInput
): Promise<TripServiceResult> {
  const validation = validateTripPayload(input);

  if (!validation.ok) {
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

  return { ok: true, trip };
}

export async function updateTrip(
  db: D1Database,
  input: UpdateTripServiceInput
): Promise<TripServiceResult> {
  const validation = validateUpdateTripPayload(input);

  if (!validation.ok) {
    return validation;
  }

  const trip = await updateTripInRepository(
    db,
    validation.tripId,
    validation.normalized
  );

  if (!trip) {
    return {
      ok: false,
      status: 404,
      message: "Trip not found",
    };
  }

  return {
    ok: true,
    trip,
  };
}

export async function getTripsForUser(db: D1Database, userId?: string | null) {
  return listTripsByUser(db, normalizeText(userId) ?? DEFAULT_USER_ID);
}

/**
 * Assemble TripRouteData for module 04 consumption.
 */
export async function getTripRouteData(db: D1Database, tripId?: string | null) {
  const resolvedTripId = normalizeText(tripId);
  if (!resolvedTripId) {
    throw new Error("Trip ID is required");
  }

  const trip = await getTripById(db, resolvedTripId);
  if (!trip) {
    throw new Error("Trip not found");
  }

  const itineraries = await getItinerariesByTripId(db, resolvedTripId);
  const itineraryRouteData = [] as {
    itineraryId: string;
    date: string;
    places: { id: string; name: string; lat: number; lon: number }[];
  }[];

  for (const it of itineraries) {
    const items = await getItineraryItemsByItineraryId(db, it.itinerary_id);
    const places = [] as { id: string; name: string; lat: number; lon: number }[];

    for (const item of items) {
      let lat = 0;
      let lon = 0;

      if (item.reference_id) {
        try {
          // discoveryService.getPlaceDetail expects (placeId, queryText)
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
export async function getCollaborationTripData(db: D1Database, tripId?: string | null) {
  const resolvedTripId = normalizeText(tripId);
  if (!resolvedTripId) {
    throw new Error("Trip ID is required");
  }

  const trip = await getTripById(db, resolvedTripId);
  if (!trip) {
    throw new Error("Trip not found");
  }

  const itineraries = await getItinerariesByTripId(db, resolvedTripId);
  const collabItineraries = [] as any[];

  for (const it of itineraries) {
    const items = await getItineraryItemsByItineraryId(db, it.itinerary_id);

    const collabItems = items.map((item) => ({
      itemId: item.item_id,
      placeId: item.reference_id ?? null,
      name: item.item_name,
      day: undefined,
      note: item.itinerary_item_note ?? undefined,
      lat: undefined,
      lon: undefined,
    }));

    // Try to enrich lat/lon for items with reference_id
    for (const ci of collabItems) {
      if (ci.placeId) {
        try {
          const detail = await discoveryService.getPlaceDetail(ci.placeId, "");
          if (detail && typeof (detail as any).lat === "number") {
            ci.lat = (detail as any).lat;
          }
          if (detail && typeof (detail as any).lon === "number") {
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
      ok: false,
      status: 400,
      message: "Trip ID is required",
    };
  }

  await deleteTripById(db, tripId);
  return { ok: true };
}
