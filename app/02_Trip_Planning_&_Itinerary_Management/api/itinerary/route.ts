import { NextResponse } from "next/server";

import {
  createItineraryAction,
  deleteItineraryAction,
  updateItineraryAction,
} from "@/api_layer/02_Trip_Planning_&_Itinerary_Management/itineraryApi";

async function handleCreate(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const itinerary = await createItineraryAction({
      tripId: typeof body.tripId === "string" ? body.tripId : null,
      title: typeof body.title === "string" ? body.title : null,
      date: typeof body.date === "string" ? body.date : null,
    });

    return NextResponse.json({ itinerary }, { status: 201 });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    const status = typedError.status ?? 500;
    const message =
      error instanceof Error ? error.message : "Failed to create itinerary";

    return NextResponse.json({ error: message }, { status });
  }
}

async function handleDelete(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    await deleteItineraryAction({
      itineraryId:
        typeof body.itineraryId === "string" ? body.itineraryId : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    const status = typedError.status ?? 500;
    const message =
      error instanceof Error ? error.message : "Failed to delete itinerary";

    return NextResponse.json({ error: message }, { status });
  }
}

async function handleUpdate(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const itinerary = await updateItineraryAction({
      itineraryId:
        typeof body.itineraryId === "string" ? body.itineraryId : null,
      title: typeof body.title === "string" ? body.title : null,
      date: typeof body.date === "string" ? body.date : null,
    });

    return NextResponse.json({ itinerary });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    const status = typedError.status ?? 500;
    const message =
      error instanceof Error ? error.message : "Failed to update itinerary";

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  return handleCreate(request);
}

export async function PATCH(request: Request) {
  return handleUpdate(request);
}

export async function PUT(request: Request) {
  return handleUpdate(request);
}

export async function DELETE(request: Request) {
  return handleDelete(request);
}
