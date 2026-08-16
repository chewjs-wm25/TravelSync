import {
  deleteTripById,
  insertTrip,
  listTripsByUser,
  updateTrip as updateTripInRepository,
  type CreateTripInput,
  type TripRecord,
  type UpdateTripInput as TripRepositoryUpdateInput,
} from "../../data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripRepository";

export const DEFAULT_USER_ID = "usr_demo";
const MAX_TRIP_NAME_LENGTH = 100;
const MALAYSIA_BLOCKLIST = [
  "singapore",
  "thailand",
  "indonesia",
  "vietnam",
  "japan",
  "korea",
  "south korea",
  "china",
  "taiwan",
  "hong kong",
  "bali",
  "phuket",
  "hanoi",
  "tokyo",
  "seoul",
  "shanghai",
  "paris",
  "london",
  "dubai",
  "new york",
  "los angeles",
  "sydney",
  "melbourne",
  "bangkok",
  "manila",
];

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

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasMalaysiaBlocklistMatch(value: string) {
  const lowered = value.toLowerCase();
  return MALAYSIA_BLOCKLIST.some((entry) => lowered.includes(entry));
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
