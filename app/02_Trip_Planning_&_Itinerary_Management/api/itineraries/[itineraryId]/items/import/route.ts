import { NextResponse } from "next/server";

import { importPlacesAction } from "@/app/02_Trip_Planning_&_Itinerary_Management/api/itineraryItemApi";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itineraryId: string }> }
) {
  try {
    const { itineraryId } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    // Accept either { items: [...] } or an array directly
    const rawItems = Array.isArray(body) ? body : (Array.isArray((body as any).items) ? (body as any).items : []);
    const rawItemsAny = rawItems as any[];

    const items = rawItemsAny
      .filter((v: any) => v && typeof v === "object")
      .map((v: any) => ({
        placeId: typeof v.placeId === "string" ? v.placeId : undefined,
        name: typeof v.name === "string" ? v.name : "",
        lat: typeof v.lat === "number" ? v.lat : undefined,
        lon: typeof v.lon === "number" ? v.lon : undefined,
      }))
      .filter((i: { name?: string }) => i.name && i.name.trim().length > 0);

    const result = await importPlacesAction(itineraryId, items as any);

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const typedError = error as Error & { status?: number };
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import places" },
      { status: typedError.status ?? 500 }
    );
  }
}
