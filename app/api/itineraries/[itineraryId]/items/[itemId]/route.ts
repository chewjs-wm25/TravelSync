import { NextResponse } from "next/server";

import {
  deleteItineraryItemAction,
  updateItineraryItemAction,
} from "@/api_layer/02_Trip_Planning_&_Itinerary_Management/itineraryItemApi";

function mapItemResponse(item: {
  item_id: string;
  itinerary_id: string;
  item_name: string;
  image_url: string | null;
  itinerary_note: string | null;
  position: number | null;
  order_index: number | null;
  destination?: string | null;
  type?: string | null;
}) {
  return {
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
  };
}

async function handleUpdate(
  request: Request,
  params: Promise<{ itineraryId: string; itemId: string }>
) {
  try {
    const { itineraryId, itemId } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const item = await updateItineraryItemAction({
      itineraryId,
      itemId,
      name: typeof body.name === "string" ? body.name : null,
      note: typeof body.note === "string" ? body.note : null,
      image: typeof body.image === "string" ? body.image : null,
      position:
        typeof body.position === "number"
          ? body.position
          : typeof body.position === "string"
            ? body.position
            : null,
      order_index:
        typeof body.order_index === "number"
          ? body.order_index
          : typeof body.order_index === "string"
            ? body.order_index
            : null,
    });

    return NextResponse.json({ item: mapItemResponse(item) }, { status: 200 });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    const status = typedError.status ?? 500;
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update itinerary item";

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itineraryId: string; itemId: string }> }
) {
  return handleUpdate(request, params);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ itineraryId: string; itemId: string }> }
) {
  return handleUpdate(request, params);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itineraryId: string; itemId: string }> }
) {
  try {
    const { itineraryId, itemId } = await params;
    await deleteItineraryItemAction({ itineraryId, itemId });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    const status = typedError.status ?? 500;
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete itinerary item";

    return NextResponse.json({ error: message }, { status });
  }
}
