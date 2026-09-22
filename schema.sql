-- ============================================================
-- TravelSync - Unified Cloudflare D1 (SQLite) schema
--
-- This is the canonical bootstrap schema for Modules 01-05.
-- Runtime lazy-initialization code remains as a compatibility
-- fallback for already-existing databases.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- MODULE 01: USER & ACCOUNT MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT CHECK (
    phone IS NULL OR (
      length(phone) BETWEEN 9 AND 16
      AND substr(phone, 1, 1) = '+'
      AND length(substr(phone, 2)) BETWEEN 8 AND 15
      AND substr(phone, 2) NOT GLOB '*[^0-9]*'
    )
  ),
  ic_hash TEXT,
  profile_picture TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_locked INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  lock_until TEXT,
  last_login TEXT,
  created_at TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  has_password INTEGER NOT NULL DEFAULT 1
);

CREATE TRIGGER IF NOT EXISTS validate_users_phone_insert
BEFORE INSERT ON users
WHEN NEW.phone IS NOT NULL AND NOT (
  length(NEW.phone) BETWEEN 9 AND 16
  AND substr(NEW.phone, 1, 1) = '+'
  AND length(substr(NEW.phone, 2)) BETWEEN 8 AND 15
  AND substr(NEW.phone, 2) NOT GLOB '*[^0-9]*'
)
BEGIN SELECT RAISE(ABORT, 'Invalid international phone number'); END;

CREATE TRIGGER IF NOT EXISTS validate_users_phone_update
BEFORE UPDATE OF phone ON users
WHEN NEW.phone IS NOT NULL AND NOT (
  length(NEW.phone) BETWEEN 9 AND 16
  AND substr(NEW.phone, 1, 1) = '+'
  AND length(substr(NEW.phone, 2)) BETWEEN 8 AND 15
  AND substr(NEW.phone, 2) NOT GLOB '*[^0-9]*'
)
BEGIN SELECT RAISE(ABORT, 'Invalid international phone number'); END;

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'light',
  privacy_level TEXT NOT NULL DEFAULT 'private',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  ip_address TEXT,
  details TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- MODULE 02: TRIP PLANNING & ITINERARY MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
  trip_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trip_name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  trip_note TEXT,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS itineraries (
  itinerary_id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  itinerary_note TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(trip_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS itinerary_items (
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
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_trip_id ON itineraries(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary_id ON itinerary_items(itinerary_id);

-- ============================================================
-- MODULE 03: DESTINATION DISCOVERY & INSPIRATION
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorite_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  experience_type TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_favorite_items_user ON favorite_items(user_id);

CREATE TABLE IF NOT EXISTS official_quality_ratings (
  json_id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_address TEXT NOT NULL,
  company_phone TEXT,
  duration TEXT NOT NULL,
  award_category TEXT NOT NULL,
  place_id TEXT,
  name TEXT,
  formatted TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  country_code TEXT,
  category TEXT,
  result_type TEXT,
  lat REAL,
  lon REAL,
  confidence REAL,
  synced_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  categories TEXT NOT NULL DEFAULT '[]',
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  url TEXT NOT NULL,
  synced_at INTEGER NOT NULL
);

-- ============================================================
-- MODULE 04: TRAVEL LOGISTICS & MAP ROUTE PLANNING
-- ============================================================

CREATE TABLE IF NOT EXISTS logistics_vehicles (
  vehicle_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'car'
    CHECK (category IN ('car', 'motorcycle')),
  fuel_consumption REAL NOT NULL CHECK (fuel_consumption > 0),
  fuel_type TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
    CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (user_id, vehicle_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_vehicles_one_default
  ON logistics_vehicles(user_id)
  WHERE is_default = 1;
CREATE INDEX IF NOT EXISTS idx_logistics_vehicles_user
  ON logistics_vehicles(user_id);

CREATE TABLE IF NOT EXISTS logistics_saved_routes (
  route_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  origin_id TEXT,
  origin_name TEXT,
  origin_lat REAL,
  origin_lng REAL,
  destination_id TEXT,
  destination_name TEXT,
  destination_lat REAL,
  destination_lng REAL,
  vehicle_type TEXT NOT NULL
    CHECK (vehicle_type IN ('car', 'walk', 'public transport')),
  optimization_mode TEXT NOT NULL DEFAULT 'fastest'
    CHECK (optimization_mode IN ('fastest', 'shortest', 'cheapest')),
  vehicle_id TEXT,
  route_points TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(route_points)),
  public_transport_stops TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(public_transport_stops)),
  public_transport_legs TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(public_transport_legs)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (vehicle_id)
    REFERENCES logistics_vehicles(vehicle_id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_logistics_saved_routes_user
  ON logistics_saved_routes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logistics_saved_routes_vehicle
  ON logistics_saved_routes(user_id, vehicle_id);

CREATE TABLE IF NOT EXISTS logistics_route_analysis (
  analysis_id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  distance_km REAL NOT NULL CHECK (distance_km >= 0),
  time_minutes REAL NOT NULL CHECK (time_minutes >= 0),
  fuel_liters REAL NOT NULL DEFAULT 0 CHECK (fuel_liters >= 0),
  fuel_cost REAL NOT NULL DEFAULT 0 CHECK (fuel_cost >= 0),
  energy_kwh REAL NOT NULL DEFAULT 0 CHECK (energy_kwh >= 0),
  energy_cost REAL NOT NULL DEFAULT 0 CHECK (energy_cost >= 0),
  carbon_kg REAL NOT NULL DEFAULT 0 CHECK (carbon_kg >= 0),
  generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (route_id) REFERENCES logistics_saved_routes(route_id)
    ON DELETE CASCADE,
  UNIQUE (user_id, route_id)
);

CREATE INDEX IF NOT EXISTS idx_logistics_route_analysis_user
  ON logistics_route_analysis(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_logistics_route_analysis_route
  ON logistics_route_analysis(route_id);

-- ============================================================
-- MODULE 05: COLLABORATION & SHARED PLANNING
-- ============================================================

CREATE TABLE IF NOT EXISTS Trip (
  TripID TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  TripName TEXT NOT NULL,
  StartDate TEXT,
  EndDate TEXT,
  Region TEXT,
  Status TEXT NOT NULL DEFAULT 'planning'
    CHECK (Status IN ('planning', 'active', 'completed', 'cancelled')),
  TripNote TEXT,
  UserID TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS Itinerary (
  ItineraryID TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  Title TEXT NOT NULL,
  Date TEXT,
  TripID TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Itinerary_Item (
  ItemID TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ItemName TEXT NOT NULL,
  Type TEXT NOT NULL DEFAULT 'attraction'
    CHECK (Type IN ('attraction', 'restaurant', 'hotel', 'transport', 'activity', 'other')),
  ReferenceID TEXT,
  Destination TEXT,
  StartTime TEXT,
  EndTime TEXT,
  Status TEXT NOT NULL DEFAULT 'planned'
    CHECK (Status IN ('planned', 'booked', 'completed', 'cancelled')),
  ItineraryNote TEXT,
  ItineraryID TEXT NOT NULL REFERENCES Itinerary(ItineraryID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Collaborators (
  collaborator_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  role TEXT NOT NULL DEFAULT 'Viewer'
    CHECK (role IN ('Owner', 'Editor', 'Viewer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'removed')),
  joined_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_seen TEXT,
  trip_id TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  invited_by TEXT REFERENCES users(id),
  UNIQUE (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS Collaboration_Invitations (
  invitation_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  Token TEXT NOT NULL UNIQUE,
  receiver_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Viewer'
    CHECK (role IN ('Editor', 'Viewer')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TEXT NOT NULL,
  sent_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  trip_id TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  receiver_user_id TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS trip_likes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  trip_id TEXT NOT NULL REFERENCES Trip(TripID) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS plan_share_keys (
  share_key TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  trip_name TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  expires_at TEXT,
  use_count INTEGER NOT NULL DEFAULT 0
);
