"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  createItineraryItem,
  deleteItineraryItemById,
  getItineraryItemsForItinerary,
  updateItineraryItemById,
  type DeleteItineraryItemInput,
  type ItineraryItemServiceInput,
  type UpdateItineraryItemInput,
} from "@/business_logic_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemService";
import type { ItineraryItemRecord } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemRepository";

async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env?.TEST_DB) {
    throw new Error("D1 binding TEST_DB is unavailable");
  }

  return env.TEST_DB;
}

export async function createItineraryItemAction(
  input: ItineraryItemServiceInput
): Promise<ItineraryItemRecord> {
  const db = await getDb();
  const result = await createItineraryItem(db, input);

  if (!result.ok) {
    const error = new Error(result.message);
    (error as Error & { status?: number }).status = result.status;
    throw error;
  }

  return result.item;
}

export async function updateItineraryItemAction(
  input: UpdateItineraryItemInput
): Promise<ItineraryItemRecord> {
  const db = await getDb();
  const result = await updateItineraryItemById(db, input);

  if (!result.ok) {
    const error = new Error(result.message);
    (error as Error & { status?: number }).status = result.status;
    throw error;
  }

  return result.item;
}

export async function deleteItineraryItemAction(
  input: DeleteItineraryItemInput
): Promise<void> {
  const db = await getDb();
  const result = await deleteItineraryItemById(db, input);

  if (!result.ok) {
    const error = new Error(result.message);
    (error as Error & { status?: number }).status = result.status;
    throw error;
  }
}

export async function listItineraryItemsAction(
  itineraryId?: string | null
): Promise<ItineraryItemRecord[]> {
  const db = await getDb();
  return getItineraryItemsForItinerary(db, itineraryId);
}
