import { NextResponse } from "next/server";

import { createItineraryItemAction } from "@/api_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemApi";

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
    });

    return NextResponse.json(
      {
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
          note: item.itinerary_note ?? undefined,
          itinerary_note: item.itinerary_note ?? undefined,
          position: item.position ?? item.order_index ?? 0,
          order_index: item.order_index ?? item.position ?? 0,
          type: item.type ?? undefined,
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

    return NextResponse.json({ error: message }, { status });
  }
}
