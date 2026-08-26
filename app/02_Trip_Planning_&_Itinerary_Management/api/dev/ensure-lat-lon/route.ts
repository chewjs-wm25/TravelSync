import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";

export async function POST() {
  const { env } = await getCloudflareContext({ async: true });
  const db = env?.TEST_DB as D1Database | undefined;
  if (!db) return NextResponse.json({ success: false, message: "TEST_DB unavailable" }, { status: 500 });

  const results: string[] = [];
  try {
    try {
      await db.prepare(`ALTER TABLE itinerary_items ADD COLUMN lat REAL`).run();
      results.push('lat added');
    } catch (e) {
      results.push('lat add failed or exists');
    }
    try {
      await db.prepare(`ALTER TABLE itinerary_items ADD COLUMN lon REAL`).run();
      results.push('lon added');
    } catch (e) {
      results.push('lon add failed or exists');
    }
    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ success: false, message: (e as Error).message }, { status: 500 });
  }
}
