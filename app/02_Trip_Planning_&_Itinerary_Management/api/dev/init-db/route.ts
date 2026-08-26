import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";

export async function GET() {
  const { env } = await getCloudflareContext({ async: true });
  const db = env?.TEST_DB as D1Database | undefined;
  if (!db) {
    return NextResponse.json({ success: false, message: "TEST_DB binding unavailable" }, { status: 500 });
  }

  const stmts = [
    `CREATE TABLE IF NOT EXISTS trips (
      trip_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      trip_name TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      trip_note TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS itineraries (
      itinerary_id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      itinerary_note TEXT,
      FOREIGN KEY (trip_id) REFERENCES trips(trip_id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS itinerary_items (
      item_id TEXT PRIMARY KEY,
      itinerary_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      image_url TEXT,
      itinerary_item_note TEXT,
      position INTEGER DEFAULT 0,
      type TEXT DEFAULT 'other',
      reference_id TEXT,
      lat REAL,
      lon REAL,
      destination TEXT,
      start_time TEXT,
      end_time TEXT,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(itinerary_id) ON DELETE CASCADE
    );`,
    // Insert demo trip and itineraries
    `INSERT INTO trips (trip_id, user_id, trip_name, start_date, end_date, trip_note)
      VALUES ('trip_langkawi', 'dev-user-001', 'Langkawi Island Escape', '2026-12-20', '2026-12-27', NULL)
      ON CONFLICT(trip_id) DO NOTHING;`,
    `INSERT INTO itineraries (itinerary_id, trip_id, title, date, itinerary_note) VALUES
      ('itin_day1','trip_langkawi','Day 1','2026-12-20',NULL),
      ('itin_day2','trip_langkawi','Day 2','2026-12-21',NULL),
      ('itin_day3','trip_langkawi','Day 3','2026-12-22',NULL)
      ON CONFLICT(itinerary_id) DO NOTHING;`,
    `INSERT INTO itinerary_items (item_id, itinerary_id, item_name, type, itinerary_item_note) VALUES
      ('it_1','itin_day1','Arrive Langkawi, check in at Cenang','hotel','SkyCab cable car'),
      ('it_2','itin_day1','Sunset dinner at Pantai Cenang','restaurant',NULL),
      ('it_3','itin_day2','Island hopping (Pulau Dayang Bunting)','activity','Bring sunscreen')
      ON CONFLICT(item_id) DO NOTHING;`,
  ];

  try {
    const errors: string[] = [];
    for (const s of stmts) {
      try {
        await db.prepare(s).run();
      } catch (innerErr) {
        // record but continue — table may already exist with differing constraints
        try {
          errors.push((innerErr as Error).message);
        } catch (e) {
          // ignore
        }
      }
    }

    // Ensure lat/lon columns exist if older schema was present
    try {
      await db.prepare(`ALTER TABLE itinerary_items ADD COLUMN lat REAL`).run();
    } catch (err) {
      // ignore if column already exists or ALTER not supported
    }
    try {
      await db.prepare(`ALTER TABLE itinerary_items ADD COLUMN lon REAL`).run();
    } catch (err) {
      // ignore
    }

    const message = errors.length > 0 ? `Module 02 DB initialized with warnings: ${errors[0]}` : "Module 02 DB initialized";
    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
