import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";
import { ensureTripSchema } from "@/data_access_layer/02_Trip_Planning_&_Itinerary_Management/tripSchema";

export async function GET() {
  const { env } = await getCloudflareContext({ async: true });
  const db = env?.TEST_DB as D1Database | undefined;
  if (!db) {
    return NextResponse.json({ success: false, message: "TEST_DB binding unavailable" }, { status: 500 });
  }

  try {
    await ensureTripSchema(db);
    return NextResponse.json({ success: true, message: "Module 02 DB initialized" }, { status: 200 });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
