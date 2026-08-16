import { NextResponse } from "next/server";

import { updateTripAction } from "@/api_layer/02_Trip_Planning_&_Itinerary_Management/tripApi";

async function handleUpdate(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const trip = await updateTripAction({
      tripId: typeof body.tripId === "string" ? body.tripId : null,
      userId: typeof body.userId === "string" ? body.userId : null,
      tripName: typeof body.tripName === "string" ? body.tripName : null,
      startDate: typeof body.startDate === "string" ? body.startDate : null,
      endDate: typeof body.endDate === "string" ? body.endDate : null,
      tripNote: typeof body.tripNote === "string" ? body.tripNote : null,
    });

    return NextResponse.json({ trip });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    const status = typedError.status ?? 500;
    const message = error instanceof Error ? error.message : "Failed to update trip";

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  return handleUpdate(request);
}

export async function PUT(request: Request) {
  return handleUpdate(request);
}
