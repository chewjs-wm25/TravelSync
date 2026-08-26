import { NextResponse } from "next/server";

import {
  createItineraryItemAction,
  listItineraryItemsAction,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/api/itineraryItemApi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itineraryId: string }> }
) {
  try {
    const { itineraryId } = await params;
    const items = await listItineraryItemsAction(itineraryId);
    return NextResponse.json({ success: true, items }, { status: 200 });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to list itinerary items" },
      { status: typedError.status ?? 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itineraryId: string }> }
) {
  try {
    const { itineraryId } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const item = await createItineraryItemAction({
      itineraryId,
      place: typeof body.place === "string" ? body.place : typeof body.name === "string" ? body.name : null,
      image: typeof body.image === "string" ? body.image : null,
      note: typeof body.note === "string" ? body.note : null,
      destination: typeof body.destination === "string" ? body.destination : null,
      referenceId: typeof body.referenceId === "string" ? body.referenceId : null,
      lat: typeof body.lat === "number" ? body.lat : null,
      lon: typeof body.lon === "number" ? body.lon : null,
      type: typeof body.type === "string" ? body.type : null,
      startTime: typeof body.startTime === "string" ? body.startTime : null,
      endTime: typeof body.endTime === "string" ? body.endTime : null,
    });

    return NextResponse.json(
      {
        success: true,
        item: {
          id: item.item_id,
          item_id: item.item_id,
          itinerary_id: item.itinerary_id,
          place: item.item_name,
          name: item.item_name,
          item_name: item.item_name,
          destination: item.destination ?? item.item_name,
          image: item.image_url ?? undefined,
          image_url: item.image_url ?? undefined,
          note: item.itinerary_item_note ?? undefined,
          itinerary_note: item.itinerary_item_note ?? undefined,
          itinerary_item_note: item.itinerary_item_note ?? undefined,
          position: item.position ?? item.order_index ?? 0,
          order_index: item.order_index ?? item.position ?? 0,
          type: item.type ?? undefined,
          start_time: item.start_time ?? undefined,
          end_time: item.end_time ?? undefined,
          reference_id: item.reference_id ?? undefined,
          lat: typeof item.lat === "number" ? item.lat : undefined,
          lon: typeof item.lon === "number" ? item.lon : undefined,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const typedError = error as Error & { status?: number };
    const status = typedError.status ?? 500;
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create itinerary item";

    return NextResponse.json({ success: false, message }, { status });
  }
}
