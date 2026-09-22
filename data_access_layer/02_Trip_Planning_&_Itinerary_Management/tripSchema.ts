const TRIP_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS trips (
    trip_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    trip_name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    trip_note TEXT,
    image_url TEXT
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
  `CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_itineraries_trip_id ON itineraries(trip_id);`,
  `CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary_id ON itinerary_items(itinerary_id);`,
  `INSERT INTO trips (trip_id, user_id, trip_name, start_date, end_date, trip_note, image_url)
    VALUES ('trip_langkawi', 'dev-user-001', 'Langkawi Island Escape', '2026-12-20', '2026-12-27', NULL, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80')
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

let initialized: Promise<void> | null = null;

/**
 * Ensures the Module 02 D1 database tables and indexes exist.
 * Cached per worker instance to ensure idempotent single-time initialization.
 */
export function ensureTripSchema(db: D1Database): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      for (const statement of TRIP_SCHEMA_STATEMENTS) {
        try {
          await db.prepare(statement).run();
        } catch {
          // Ignore individual statement errors if already created/seeded
        }
      }

      // Ensure optional columns exist if migrating from an older schema version
      try {
        await db.prepare("ALTER TABLE trips ADD COLUMN image_url TEXT").run();
      } catch {
        // Column already exists
      }

      try {
        await db.prepare("ALTER TABLE itinerary_items ADD COLUMN lat REAL").run();
      } catch {
        // Column already exists
      }

      try {
        await db.prepare("ALTER TABLE itinerary_items ADD COLUMN lon REAL").run();
      } catch {
        // Column already exists
      }
    })();
  }

  return initialized.catch((error) => {
    initialized = null;
    throw error;
  });
}
