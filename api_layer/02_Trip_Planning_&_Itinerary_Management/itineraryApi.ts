"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  createItinerary,
  getItinerariesForTrip,
  type ItineraryServiceInput,
} from "@/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/itineraryService";
import type { ItineraryRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryRepository";

async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env?.TEST_DB) {
    throw new Error("D1 binding TEST_DB is unavailable");
  }

  return env.TEST_DB;
}

export async function createItineraryAction(
  input: ItineraryServiceInput
): Promise<ItineraryRecord> {
  const db = await getDb();
  const result = await createItinerary(db, input);

  if (!result.ok) {
    const error = new Error(result.message);
    (error as Error & { status?: number }).status = result.status;
    throw error;
  }

  return result.itinerary;
}

export async function listItinerariesAction(
  tripId?: string | null
): Promise<ItineraryRecord[]> {
  const db = await getDb();
  return getItinerariesForTrip(db, tripId);
}
