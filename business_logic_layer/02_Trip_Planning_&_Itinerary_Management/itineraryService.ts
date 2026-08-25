import {
  createItinerary as createItineraryInRepository,
  deleteItinerary as deleteItineraryInRepository,
  getItineraryById,
  getItinerariesByTripId,
  updateItinerary as updateItineraryInRepository,
  type CreateItineraryInput,
  type ItineraryRecord,
  type UpdateItineraryInput as ItineraryRepositoryUpdateInput,
} from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";
import {
  getTripById,
  type TripRecord,
} from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripRepository";
import {
  hasMalaysiaBlocklistMatch,
  normalizeText,
} from "@/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/textValidation";

const MAX_ITINERARY_TITLE_LENGTH = 60;

export type ItineraryServiceInput = {
  tripId?: string | null;
  title?: string | null;
  date?: string | null;
  note?: string | null;
};

type ItineraryServiceSuccess = {
  ok: true;
  itinerary: ItineraryRecord;
};

type ItineraryServiceFailure = {
  ok: false;
  status: number;
  message: string;
};

export type ItineraryServiceResult =
  ItineraryServiceSuccess | ItineraryServiceFailure;

export type DeleteItineraryInput = {
  itineraryId?: string | null;
};

export type UpdateItineraryInput = {
  itineraryId?: string | null;
  title?: string | null;
  date?: string | null;
  note?: string | null;
};

type DeleteItinerarySuccess = {
  ok: true;
};

type UpdateItinerarySuccess = {
  ok: true;
  itinerary: ItineraryRecord;
};

export type DeleteItineraryResult =
  DeleteItinerarySuccess | ItineraryServiceFailure;

export type UpdateItineraryResult =
  UpdateItinerarySuccess | ItineraryServiceFailure;

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function isDateWithinTripWindow(date: string, trip: TripRecord) {
  if (!trip.start_date || !trip.end_date) {
    return false;
  }

  return date >= trip.start_date && date <= trip.end_date;
}

function validateMalaysiaScope(note: string | null) {
  if (note && hasMalaysiaBlocklistMatch(note)) {
    return {
      ok: false as const,
      status: 400,
      message: "Itinerary note must stay within Malaysia",
    };
  }

  return { ok: true as const };
}

export function getItinerarySeedDate(
  trip: Pick<TripRecord, "start_date" | "end_date">,
  itineraries: Pick<ItineraryRecord, "date">[]
) {
  const latestDate = itineraries.reduce<string | null>((latest, itinerary) => {
    if (!latest || itinerary.date > latest) {
      return itinerary.date;
    }

    return latest;
  }, null);

  if (latestDate) {
    const nextDate = addDays(latestDate, 1);
    if (trip.end_date && nextDate > trip.end_date) {
      return trip.end_date;
    }

    return nextDate;
  }

  return trip.start_date ?? "";
}

export function getItinerarySeedTitle(
  tripName: string,
  itineraries: Pick<ItineraryRecord, "itinerary_id">[]
) {
  return `Day ${itineraries.length + 1} - ${tripName}`;
}

function validateCreateItineraryPayload(
  trip: TripRecord | null,
  input: ItineraryServiceInput
):
  | { ok: true; tripId: string; normalized: CreateItineraryInput }
  | ItineraryServiceFailure {
  const tripId = normalizeText(input.tripId);
  const title = normalizeText(input.title);
  const date = normalizeText(input.date);
  const note = normalizeText(input.note);

  if (!tripId) {
    return {
      ok: false,
      status: 400,
      message: "Trip ID is required",
    };
  }

  if (!title) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary title is required",
    };
  }

  if (title.length > MAX_ITINERARY_TITLE_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary title must be 60 characters or fewer",
    };
  }

  if (!date) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary date is required",
    };
  }

  if (!isValidIsoDate(date)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid date!",
    };
  }

  if (note) {
    const malaysiaScopeValidation = validateMalaysiaScope(note);
    if (!malaysiaScopeValidation.ok) {
      return malaysiaScopeValidation;
    }
  }

  if (!trip) {
    return {
      ok: false,
      status: 404,
      message: "Trip not found",
    };
  }

  if (!trip.start_date || !trip.end_date) {
    return {
      ok: false,
      status: 400,
      message: "Trip dates are required",
    };
  }

  if (!isDateWithinTripWindow(date, trip)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid date!",
    };
  }

  return {
    ok: true,
    tripId,
    normalized: {
      tripId,
      title,
      date,
      note: note ?? null,
    },
  };
}

function validateUpdateItineraryPayload(
  trip: TripRecord | null,
  existingItinerary: ItineraryRecord | null,
  input: UpdateItineraryInput
):
  | {
      ok: true;
      itineraryId: string;
      normalized: ItineraryRepositoryUpdateInput;
    }
  | ItineraryServiceFailure {
  const itineraryId = normalizeText(input.itineraryId);
  const title = normalizeText(input.title);
  const date = normalizeText(input.date);
  const hasNoteUpdate = input.note !== undefined;
  const note = hasNoteUpdate ? normalizeText(input.note) : undefined;

  if (!itineraryId) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary ID is required",
    };
  }

  if (!existingItinerary) {
    return {
      ok: false,
      status: 404,
      message: "Itinerary not found",
    };
  }

  if (!title) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary title is required",
    };
  }

  if (title.length > MAX_ITINERARY_TITLE_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary title must be 60 characters or fewer",
    };
  }

  if (!date) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary date is required",
    };
  }

  if (!isValidIsoDate(date)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid date!",
    };
  }

  if (note) {
    const malaysiaScopeValidation = validateMalaysiaScope(note);
    if (!malaysiaScopeValidation.ok) {
      return malaysiaScopeValidation;
    }
  }

  if (!trip || !trip.start_date || !trip.end_date) {
    return {
      ok: false,
      status: 400,
      message: "Invalid date!",
    };
  }

  if (!isDateWithinTripWindow(date, trip)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid date!",
    };
  }

  const normalized: ItineraryRepositoryUpdateInput = {
    title,
    date,
  };

  if (hasNoteUpdate) {
    normalized.note = note ?? null;
  }

  return {
    ok: true,
    itineraryId,
    normalized,
  };
}

export async function createItinerary(
  db: D1Database,
  input: ItineraryServiceInput
): Promise<ItineraryServiceResult> {
  const tripId = normalizeText(input.tripId);

  if (!tripId) {
    return {
      ok: false,
      status: 400,
      message: "Trip ID is required",
    };
  }

  const trip = await getTripById(db, tripId);
  const validation = validateCreateItineraryPayload(trip ?? null, input);

  if (!validation.ok) {
    return validation;
  }

  const itinerary = await createItineraryInRepository(
    db,
    validation.normalized
  );

  // notify listeners that an itinerary changed for this trip
  try {
    const events = await import("./events");
    events.triggerItineraryChanged(itinerary.trip_id);
  } catch (e) {
    // ignore
  }

  return {
    ok: true,
    itinerary,
  };
}

export async function getItinerariesForTrip(
  db: D1Database,
  tripId?: string | null
) {
  const normalizedTripId = normalizeText(tripId);

  if (!normalizedTripId) {
    return [] as ItineraryRecord[];
  }

  return getItinerariesByTripId(db, normalizedTripId);
}

export async function deleteItinerary(
  db: D1Database,
  input: DeleteItineraryInput
): Promise<DeleteItineraryResult> {
  const itineraryId = normalizeText(input.itineraryId);

  if (!itineraryId) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary ID is required",
    };
  }

  const existingItinerary = await getItineraryById(db, itineraryId);
  if (!existingItinerary) {
    return {
      ok: false,
      status: 404,
      message: "Itinerary not found",
    };
  }

  const wasDeleted = await deleteItineraryInRepository(db, itineraryId);
  if (!wasDeleted) {
    return {
      ok: false,
      status: 404,
      message: "Itinerary not found",
    };
  }

  try {
    const events = await import("./events");
    events.triggerItineraryChanged(existingItinerary.trip_id);
  } catch (e) {
    // ignore
  }

  return { ok: true };
}

export async function updateItinerary(
  db: D1Database,
  input: UpdateItineraryInput
): Promise<UpdateItineraryResult> {
  const tripId = normalizeText(input.itineraryId);
  const title = normalizeText(input.title);
  const date = normalizeText(input.date);
  const hasNoteUpdate = input.note !== undefined;
  const note = hasNoteUpdate ? normalizeText(input.note) : undefined;

  if (!tripId) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary ID is required",
    };
  }

  const existingItinerary = await getItineraryById(db, tripId);
  if (!existingItinerary) {
    return {
      ok: false,
      status: 404,
      message: "Itinerary not found",
    };
  }

  if (!title) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary title is required",
    };
  }

  if (title.length > MAX_ITINERARY_TITLE_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary title must be 60 characters or fewer",
    };
  }

  if (!date) {
    return {
      ok: false,
      status: 400,
      message: "Itinerary date is required",
    };
  }

  if (!isValidIsoDate(date)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid date!",
    };
  }

  if (note) {
    const malaysiaScopeValidation = validateMalaysiaScope(note);
    if (!malaysiaScopeValidation.ok) {
      return malaysiaScopeValidation;
    }
  }

  const trip = await getTripById(db, existingItinerary.trip_id);
  if (!trip || !trip.start_date || !trip.end_date) {
    return {
      ok: false,
      status: 400,
      message: "Invalid date!",
    };
  }

  if (date < trip.start_date || date > trip.end_date) {
    return {
      ok: false,
      status: 400,
      message: "Invalid date!",
    };
  }

  const wasUpdated = await updateItineraryInRepository(
    db,
    tripId,
    {
      title,
      date,
      ...(hasNoteUpdate ? { note: note ?? null } : {}),
    }
  );

  if (!wasUpdated) {
    return {
      ok: false,
      status: 404,
      message: "Itinerary not found",
    };
  }

  const itinerary = await getItineraryById(db, tripId);
  if (!itinerary) {
    return {
      ok: false,
      status: 404,
      message: "Itinerary not found",
    };
  }

  try {
    const events = await import("./events");
    events.triggerItineraryChanged(itinerary.trip_id);
  } catch (e) {
    // ignore
  }

  return {
    ok: true,
    itinerary,
  };
}