CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- MODULE 02: TRIP PLANNING & ITINERARY MANAGEMENT
-- Strictly matching ERD02 specification
-- ========================================================

-- Table 1: Trip
CREATE TABLE IF NOT EXISTS trips (
    trip_id TEXT PRIMARY KEY,                 -- VARCHAR / UUID
    user_id TEXT NOT NULL,                    -- FK to User (VARCHAR)
    trip_name TEXT NOT NULL,                  -- VARCHAR
    start_date TEXT,                          -- DATE (ISO8601 YYYY-MM-DD)
    end_date TEXT,                            -- DATE (ISO8601 YYYY-MM-DD)
    trip_note TEXT                            -- TEXT
);

-- Table 2: Itinerary
CREATE TABLE IF NOT EXISTS itineraries (
    itinerary_id TEXT PRIMARY KEY,            -- VARCHAR / UUID
    trip_id TEXT NOT NULL,                    -- FK to trips.trip_id
    title TEXT NOT NULL,                      -- VARCHAR
    date TEXT NOT NULL,                       -- DATE (ISO8601 YYYY-MM-DD)
    FOREIGN KEY (trip_id) REFERENCES trips(trip_id) ON DELETE CASCADE
);

-- Table 3: Itinerary Item
CREATE TABLE IF NOT EXISTS itinerary_items (
    item_id TEXT PRIMARY KEY,                 -- VARCHAR / UUID
    itinerary_id TEXT NOT NULL,               -- FK to itineraries.itinerary_id
    item_name TEXT NOT NULL,                  -- VARCHAR
    image_url TEXT,                           -- VARCHAR / optional image reference
    itinerary_note TEXT,                      -- TEXT
    position INTEGER DEFAULT 0,                -- item sequence in day
    type TEXT CHECK(type IN ('activity', 'food', 'lodging', 'transit', 'other')), -- ENUM
    reference_id TEXT,                        -- VARCHAR (External API / POI ID)
    destination TEXT,                         -- VARCHAR (Malaysia location / address)
    start_time TEXT,                          -- DATETIME (ISO8601 YYYY-MM-DD HH:MM)
    end_time TEXT,                            -- DATETIME (ISO8601 YYYY-MM-DD HH:MM)
    FOREIGN KEY (itinerary_id) REFERENCES itineraries(itinerary_id) ON DELETE CASCADE
);