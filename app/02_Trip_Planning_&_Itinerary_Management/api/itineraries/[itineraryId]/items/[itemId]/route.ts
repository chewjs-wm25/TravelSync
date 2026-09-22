import { NextResponse } from "next/server";

import {
  deleteItineraryItemAction,
  updateItineraryItemAction,
} from "@/app/02_Trip_Planning_&_Itinerary_Management/api/itineraryItemApi";

function mapItemResponse(item: {
  item_id: string;
  itinerary_id: string;
  item_name: string;
  image_url: string | null;
  itinerary_item_note: string | null;
  position: number | null;
  order_index: number | null;
  destination?: string | null;
  type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  reference_id?: string | null;
  lat?: number | null;
  lon?: number | null;
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
    note: item.itinerary_item_note ?? undefined,
    itinerary_note: item.itinerary_item_note ?? undefined,
    position: item.position ?? item.order_index ?? 0,
    order_index: item.order_index ?? item.position ?? 0,
    type: item.type ?? undefined,
    start_time: item.start_time ?? undefined,
    end_time: item.end_time ?? undefined,
    reference_id: item.reference_id ?? undefined,
    lat: typeof item.lat === "number" ? item.lat : undefined,
    lon: typeof item.lon === "number" ? item.lon : undefined,
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

    const updatePayload: any = {
      itineraryId,
      itemId,
    };

    if (body.name !== undefined) {
      updatePayload.name = typeof body.name === "string" ? body.name : null;
    }
    if (body.note !== undefined) {
      updatePayload.note = typeof body.note === "string" ? body.note : null;
    }
    if (body.image !== undefined) {
      updatePayload.image = typeof body.image === "string" ? body.image : null;
    }
    if (body.position !== undefined) {
      updatePayload.position =
        typeof body.position === "number"
          ? body.position
          : typeof body.position === "string"
            ? body.position
            : null;
    }
    if (body.order_index !== undefined) {
      updatePayload.order_index =
        typeof body.order_index === "number"
          ? body.order_index
          : typeof body.order_index === "string"
            ? body.order_index
            : null;
    }
    if (body.destination !== undefined) {
      updatePayload.destination = typeof body.destination === "string" ? body.destination : null;
    }
    if (body.referenceId !== undefined) {
      updatePayload.referenceId = typeof body.referenceId === "string" ? body.referenceId : null;
    }
    if (body.lat !== undefined) {
      updatePayload.lat = typeof body.lat === "number" ? body.lat : null;
    }
    if (body.lon !== undefined) {
      updatePayload.lon = typeof body.lon === "number" ? body.lon : null;
    }
    if (body.type !== undefined) {
      updatePayload.type = typeof body.type === "string" ? body.type : null;
    }

    const bodyStartTime = body.startTime !== undefined ? body.startTime : body.start_time;
    if (bodyStartTime !== undefined) {
      updatePayload.startTime = typeof bodyStartTime === "string" ? bodyStartTime : null;
    }

    const bodyEndTime = body.endTime !== undefined ? body.endTime : body.end_time;
    if (bodyEndTime !== undefined) {
      updatePayload.endTime = typeof bodyEndTime === "string" ? bodyEndTime : null;
    }

    const item = await updateItineraryItemAction(updatePayload);

    return NextResponse.json({ success: true, item: mapItemResponse(item) }, { status: 200 });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    const status = typedError.status ?? 500;
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update itinerary item";

    return NextResponse.json({ success: false, message }, { status });
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    const status = typedError.status ?? 500;
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete itinerary item";

    return NextResponse.json({ success: false, message }, { status });
  }
}
