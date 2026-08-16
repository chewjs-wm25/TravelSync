"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  createTrip,
  deleteTrip,
  getTripsForUser,
  updateTrip,
  type DeleteTripInput,
  type TripServiceInput,
  type UpdateTripServiceInput,
} from "@/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/tripService";
import type { TripRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripRepository";

async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env?.TEST_DB) {
    throw new Error("D1 binding TEST_DB is unavailable");
  }

  return env.TEST_DB;
}

export async function createTripAction(input: TripServiceInput): Promise<TripRecord> {
  const db = await getDb();
  const result = await createTrip(db, input);

  if (!result.ok) {
    const error = new Error(result.message);
    (error as Error & { status?: number }).status = result.status;
    throw error;
  }

  return result.trip;
}

export async function updateTripAction(
  input: UpdateTripServiceInput
): Promise<TripRecord> {
  const db = await getDb();
  const result = await updateTrip(db, input);

  if (!result.ok) {
    const error = new Error(result.message);
    (error as Error & { status?: number }).status = result.status;
    throw error;
  }

  return result.trip;
}

export async function listTripsAction(userId?: string | null): Promise<TripRecord[]> {
  const db = await getDb();
  return getTripsForUser(db, userId);
}

export async function deleteTripAction(input: DeleteTripInput): Promise<void> {
  const db = await getDb();
  const result = await deleteTrip(db, input);

  if (!result.ok) {
    const error = new Error(result.message);
    (error as Error & { status?: number }).status = result.status;
    throw error;
  }
}
