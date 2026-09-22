import { NextResponse } from "next/server";
import { getCollaborationTripDataAction } from "@/app/02_Trip_Planning_&_Itinerary_Management/api/tripApi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const result = await getCollaborationTripDataAction(tripId);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to get collaboration trip data" },
      { status: typedError.status ?? 500 }
    );
  }
}
